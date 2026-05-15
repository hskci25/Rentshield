package com.rentshield.backend.otp.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class OtpStartupLogger implements ApplicationRunner {
	private static final Logger log = LoggerFactory.getLogger(OtpStartupLogger.class);

	@Value("${otp.provider:mock}")
	private String provider;

	@Value("${otp.expose-otp-in-response:true}")
	private boolean exposeOtpInResponse;

	@Value("${otp.ttl-seconds:300}")
	private int ttlSeconds;

	@Value("${otp.max-attempts:5}")
	private int maxAttempts;

	@Value("${twilio.verify-service-sid:}")
	private String twilioVerifyServiceSid;

	@Value("${otp.play-reviewer-mobile:}")
	private String playReviewerMobile;

	@Value("${otp.play-reviewer-otp:}")
	private String playReviewerOtp;

	@Override
	public void run(ApplicationArguments args) {
		log.info(
			"OTP startup config => provider={}, exposeOtpInResponse={}, ttlSeconds={}, maxAttempts={}, twilioVerifyServiceSid={}, playReviewerCredentialsConfigured={}",
			provider,
			exposeOtpInResponse,
			ttlSeconds,
			maxAttempts,
			maskSid(twilioVerifyServiceSid),
			isPlayReviewerConfigured()
		);
	}

	private boolean isPlayReviewerConfigured() {
		return "mock".equalsIgnoreCase(provider)
			&& playReviewerMobile != null
			&& !playReviewerMobile.trim().isEmpty()
			&& playReviewerOtp != null
			&& !playReviewerOtp.trim().isEmpty();
	}

	private String maskSid(String sid) {
		if (sid == null || sid.isBlank()) {
			return "<empty>";
		}
		if (sid.length() <= 6) {
			return "***";
		}
		return sid.substring(0, 4) + "..." + sid.substring(sid.length() - 3);
	}
}
