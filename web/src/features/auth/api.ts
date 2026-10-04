import { apiRequest } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-endpoints'

// Mirrors api/src/database/entities/user.entity.ts (minus passwordHash).
export interface User {
  id: number
  firstName: string
  lastName: string
  phone: string
  avatar: string | null
  role: 'dispatcher' | 'store_manager' | 'driver' | 'loader'
  status: 'pending' | 'active' | 'blocked' | 'deleted'
  depotId: number
  outletId: number | null
}

// Roles without an entry have no web portal (drivers and loaders use the mobile app).
export const ROLE_HOME: Partial<Record<User['role'], string>> = {
  dispatcher: '/',
  store_manager: '/store-manager',
}

export interface Session {
  accessToken: string
  refreshToken: string
  user: User
}

export interface LoginPayload {
  phone: string
  password: string
}

export interface RegisterPayload extends LoginPayload {
  firstName: string
  lastName: string
}

export interface VerifyOtpPayload {
  phone: string
  otp: string
  otpId: number
}

const { auth } = API_ENDPOINTS

export const login = (body: LoginPayload) => apiRequest<Session>(auth.login, { method: 'POST', body })

export const register = (body: RegisterPayload) => apiRequest<{ userId: number; otpId: number }>(auth.register, { method: 'POST', body })

export const verifyOtp = (body: VerifyOtpPayload) => apiRequest<null>(auth.verifyOtp, { method: 'POST', body })

export const resendOtp = (phone: string) => apiRequest<{ otpId: number }>(auth.resendOtp, { method: 'POST', body: { phone } })

/** Texts a reset code to the number if it has an account; the answer is the same either way. */
export const forgotPassword = (phone: string) => apiRequest<{ otp?: string }>(auth.forgotPassword, { method: 'POST', body: { phone } })

export const resetPassword = (body: { phone: string; otp: string; newPassword: string }) => apiRequest<null>(auth.resetPassword, { method: 'POST', body })

export const logout = (token: string) => apiRequest<null>(auth.logout, { method: 'POST', token })
