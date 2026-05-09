package com.rentshield.backend.otp.dto;

public record VerifyOtpResponse(
	boolean success,
	String message
) {
}
