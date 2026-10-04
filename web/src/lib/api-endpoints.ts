// Dev requests go to same-origin `/api`, which vite.config.ts proxies to the API.
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api'

// The only place endpoint paths live; paths are relative to API_BASE_URL.
export const API_ENDPOINTS = {
  auth: {
    register: '/auth/register',
    verifyOtp: '/auth/verify-otp',
    resendOtp: '/auth/resend-otp',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    changePassword: '/auth/change-password',
  },
  users: {
    list: '/users',
    detail: (id: number) => `/users/${id}`,
    role: (id: number) => `/users/${id}/role`,
    status: (id: number) => `/users/${id}/status`,
  },
  orders: {
    list: '/orders',
    mine: '/orders/my',
    placementOptions: '/orders/placement-options',
    summary: '/orders/summary',
    detail: (id: number) => `/orders/${id}`,
    cancel: (id: number) => `/orders/${id}/cancel`,
    defer: (id: number) => `/orders/${id}/defer`,
  },
  planning: {
    plan: '/planning',
    run: '/planning/run',
    publish: '/planning/publish',
  },
  outlets: {
    list: '/outlets',
    summary: '/outlets/summary',
    districts: '/outlets/districts',
    detail: (id: number) => `/outlets/${id}`,
    overview: (id: number) => `/outlets/${id}/overview`,
    availability: (id: number) => `/outlets/${id}/availability`,
  },
  vehicles: {
    list: '/vehicles',
    summary: '/vehicles/summary',
    detail: (id: number) => `/vehicles/${id}`,
    status: (id: number) => `/vehicles/${id}/status`,
    driver: (id: number) => `/vehicles/${id}/driver`,
  },
} as const
