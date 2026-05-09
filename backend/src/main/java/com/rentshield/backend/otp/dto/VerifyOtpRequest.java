package com.rentshield.backend.otp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyOtpRequest(
	@NotBlank(message = "mobileNumber is required")
	@Pattern(regexp = "^[6-9]\\d{9}$", message = "mobileNumber must be a valid 10-digit Indian number")
	String mobileNumber,
	@NotBlank(message = "otp is required")
	@Pattern(regexp = "^\\d{6}$", message = "otp must be a 6-digit number")
	String otp
) {
}
