import { API_BASE_URL } from '../config/constants';

export interface SendOtpResponse {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  otp?: string | null;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
}

export async function sendOtp(mobileNumber: string): Promise<SendOtpResponse> {
  const response = await fetch(`${API_BASE_URL}/api/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber }),
  });

  const data = (await response.json()) as SendOtpResponse;
  if (!response.ok) {
    throw new Error(data?.message ?? 'Failed to send OTP');
  }
  return data;
}

export async function verifyOtp(
  mobileNumber: string,
  otp: string,
): Promise<VerifyOtpResponse> {
  const response = await fetch(`${API_BASE_URL}/api/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber, otp }),
  });

  const data = (await response.json()) as VerifyOtpResponse;
  if (!response.ok) {
    throw new Error(data?.message ?? 'Failed to verify OTP');
  }
  return data;
}
