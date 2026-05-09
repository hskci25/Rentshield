package com.rentshield.backend.otp.model;

import java.time.Instant;

public class OtpSession {
	private final String otp;
	private final Instant expiresAt;
	private int failedAttempts;

	public OtpSession(String otp, Instant expiresAt) {
		this.otp = otp;
		this.expiresAt = expiresAt;
	}

	public String getOtp() {
		return otp;
	}

	public Instant getExpiresAt() {
		return expiresAt;
	}

	public int getFailedAttempts() {
		return failedAttempts;
	}

	public void incrementFailedAttempts() {
		this.failedAttempts++;
	}
}
