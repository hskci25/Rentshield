package com.rentshield.backend.otp.dto;

public record SendOtpResponse(
	boolean success,
	String message,
	long expiresInSeconds,
	String otp
) {
}
