/**
 * Short-lived JWT payload signed during the password-reset OTP verification step.
 * It is NOT a session token – it cannot be used to access protected routes.
 */
export interface ResetPasswordPayload {
  sub: number; // userId
  purpose: 'password_reset';
}
