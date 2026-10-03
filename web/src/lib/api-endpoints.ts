// Dev requests go to same-origin `/api`, which vite.config.ts proxies to the API.
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api'

// The only place endpoint paths live; paths are relative to API_BASE_URL.
export const API_ENDPOINTS = {
  auth: {
    register: '/auth/register',
    verifyOtp: '/auth/verify-otp',
    resendOtp: '/auth/resend-otp',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  users: {
    list: '/users',
    detail: (id: number) => `/users/${id}`,
    role: (id: number) => `/users/${id}/role`,
    status: (id: number) => `/users/${id}/status`,
  },
  vehicles: {
    list: '/vehicles',
    detail: (id: number) => `/vehicles/${id}`,
  },
} as const
