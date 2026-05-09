package com.rentshield.backend.otp.service;

import com.rentshield.backend.otp.dto.SendOtpResponse;
import com.rentshield.backend.otp.dto.VerifyOtpResponse;
import com.rentshield.backend.otp.model.OtpSession;
import com.twilio.Twilio;
import com.twilio.exception.ApiException;
import com.twilio.rest.verify.v2.service.Verification;
import com.twilio.rest.verify.v2.service.VerificationCheck;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {
	private final Map<String, OtpSession> otpStore = new ConcurrentHashMap<>();
	private final SecureRandom random = new SecureRandom();

	private final int ttlSeconds;
	private final int maxAttempts;
	private final boolean exposeOtpInResponse;
	private final String provider;
	private final String twilioVerifyServiceSid;

	public OtpService(
		@Value("${otp.ttl-seconds:300}") int ttlSeconds,
		@Value("${otp.max-attempts:5}") int maxAttempts,
		@Value("${otp.expose-otp-in-response:true}") boolean exposeOtpInResponse,
		@Value("${otp.provider:mock}") String provider,
		@Value("${twilio.account-sid:}") String twilioAccountSid,
		@Value("${twilio.auth-token:}") String twilioAuthToken,
		@Value("${twilio.verify-service-sid:}") String twilioVerifyServiceSid
	) {
		this.ttlSeconds = ttlSeconds;
		this.maxAttempts = maxAttempts;
		this.exposeOtpInResponse = exposeOtpInResponse;
		this.provider = provider;
		this.twilioVerifyServiceSid = twilioVerifyServiceSid;

		if (isTwilioProvider()) {
			if (isBlank(twilioAccountSid) || isBlank(twilioAuthToken) || isBlank(twilioVerifyServiceSid)) {
				throw new IllegalStateException(
					"Twilio provider is enabled but credentials are missing. Set twilio.account-sid, twilio.auth-token, and twilio.verify-service-sid."
				);
			}
			Twilio.init(twilioAccountSid, twilioAuthToken);
		}
	}

	public SendOtpResponse sendOtp(String mobileNumber) {
		if (isTwilioProvider()) {
			String to = toE164IndianNumber(mobileNumber);
			try {
				Verification.creator(twilioVerifyServiceSid, to, "sms").create();
				return new SendOtpResponse(
					true,
					"OTP sent successfully",
					ttlSeconds,
					null
				);
			} catch (ApiException e) {
				return new SendOtpResponse(false, "Failed to send OTP: " + e.getMessage(), ttlSeconds, null);
			}
		}

		String otp = generateOtp();
		Instant expiresAt = Instant.now().plusSeconds(ttlSeconds);
		otpStore.put(mobileNumber, new OtpSession(otp, expiresAt));

		String responseOtp = exposeOtpInResponse ? otp : null;
		return new SendOtpResponse(
			true,
			"OTP sent successfully",
			ttlSeconds,
			responseOtp
		);
	}

	public VerifyOtpResponse verifyOtp(String mobileNumber, String otp) {
		if (isTwilioProvider()) {
			String to = toE164IndianNumber(mobileNumber);
			try {
				VerificationCheck check = VerificationCheck.creator(twilioVerifyServiceSid)
					.setTo(to)
					.setCode(otp)
					.create();
				boolean approved = Objects.equals(check.getStatus(), "approved");
				return approved
					? new VerifyOtpResponse(true, "OTP verified successfully")
					: new VerifyOtpResponse(false, "Invalid or expired OTP.");
			} catch (ApiException e) {
				return new VerifyOtpResponse(false, "Failed to verify OTP: " + e.getMessage());
			}
		}

		OtpSession session = otpStore.get(mobileNumber);
		if (session == null) {
			return new VerifyOtpResponse(false, "OTP not found. Please request a new OTP.");
		}

		if (Instant.now().isAfter(session.getExpiresAt())) {
			otpStore.remove(mobileNumber);
			return new VerifyOtpResponse(false, "OTP expired. Please request a new OTP.");
		}

		if (session.getFailedAttempts() >= maxAttempts) {
			otpStore.remove(mobileNumber);
			return new VerifyOtpResponse(false, "Too many failed attempts. Please request a new OTP.");
		}

		if (!session.getOtp().equals(otp)) {
			session.incrementFailedAttempts();
			int attemptsLeft = Math.max(maxAttempts - session.getFailedAttempts(), 0);
			if (attemptsLeft == 0) {
				otpStore.remove(mobileNumber);
				return new VerifyOtpResponse(false, "Too many failed attempts. Please request a new OTP.");
			}
			return new VerifyOtpResponse(false, "Invalid OTP. Attempts left: " + attemptsLeft);
		}

		otpStore.remove(mobileNumber);
		return new VerifyOtpResponse(true, "OTP verified successfully");
	}

	private String generateOtp() {
		int otpNumber = 100000 + random.nextInt(900000);
		return String.valueOf(otpNumber);
	}

	private boolean isTwilioProvider() {
		return "twilio".equalsIgnoreCase(provider);
	}

	private String toE164IndianNumber(String mobileNumber) {
		return "+91" + mobileNumber;
	}

	private boolean isBlank(String value) {
		return value == null || value.trim().isEmpty();
	}

	public String getActiveProvider() {
		return provider;
	}
}
