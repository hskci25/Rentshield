# RentShield Backend (Spring Boot)

OTP backend for mobile login with two modes:
- `mock` (local/dev OTP in response)
- `twilio` (real SMS OTP using Twilio Verify)

## Endpoints

- `POST /api/otp/send`
- `POST /api/otp/verify`

## Request/Response

### 1) Send OTP

`POST /api/otp/send`

```json
{
  "mobileNumber": "9876543210"
}
```

Success response (mock mode):

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresInSeconds": 300,
  "otp": "123456"
}
```

> `otp` is returned only in `mock` mode and is controlled by `otp.expose-otp-in-response`.

### 2) Verify OTP

`POST /api/otp/verify`

```json
{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

Success response:

```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

Failure response (HTTP 400):

```json
{
  "success": false,
  "message": "Invalid or expired OTP."
}
```

## Config

Edit `src/main/resources/application.properties`:

- `server.port=8080`
- `otp.ttl-seconds=300`
- `otp.max-attempts=5`
- `otp.expose-otp-in-response=true`
- `otp.provider=mock` (`mock` or `twilio`)
- `twilio.account-sid=${TWILIO_ACCOUNT_SID:}`
- `twilio.auth-token=${TWILIO_AUTH_TOKEN:}`
- `twilio.verify-service-sid=${TWILIO_VERIFY_SERVICE_SID:}`

For Twilio mode (real OTP), set:

```properties
otp.provider=twilio
otp.expose-otp-in-response=false
```

and export environment variables:

```properties
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxx
```

## Run

```bash
cd backend
./gradlew bootRun
```

## Notes

- In `mock` mode OTPs are stored in-memory and cleared on restart.
- In `twilio` mode OTP generation and verification are delegated to Twilio Verify.
