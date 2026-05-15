package com.rentshield.backend.otp.controller;

import com.rentshield.backend.otp.dto.SendOtpRequest;
import com.rentshield.backend.otp.dto.SendOtpResponse;
import com.rentshield.backend.otp.dto.VerifyOtpRequest;
import com.rentshield.backend.otp.dto.VerifyOtpResponse;
import com.rentshield.backend.otp.service.OtpService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/otp")
@CrossOrigin(origins = "*")
public class OtpController {

	private final OtpService otpService;

	public OtpController(OtpService otpService) {
		this.otpService = otpService;
	}

	@PostMapping("/send")
	public ResponseEntity<SendOtpResponse> sendOtp(@Valid @RequestBody SendOtpRequest request) {
		SendOtpResponse response = otpService.sendOtp(request.mobileNumber());
		return response.success()
			? ResponseEntity.ok(response)
			: ResponseEntity.badRequest().body(response);
	}

	@PostMapping("/verify")
	public ResponseEntity<VerifyOtpResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
		VerifyOtpResponse response = otpService.verifyOtp(request.mobileNumber(), request.otp());
		return response.success()
			? ResponseEntity.ok(response)
			: ResponseEntity.badRequest().body(response);
	}

	@GetMapping("/provider")
	public ResponseEntity<Map<String, String>> provider() {
		return ResponseEntity.ok(
			Map.of(
				"provider", otpService.getActiveProvider(),
				"playReviewerConfigured",
				Boolean.toString(otpService.isPlayReviewerFeatureEnabled())
			)
		);
	}
}
