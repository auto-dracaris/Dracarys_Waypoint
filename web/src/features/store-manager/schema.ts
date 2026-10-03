import * as z from 'zod'

export const deferOrderSchema = z.object({
  reason: z.string().min(1, 'Please select a reason for deferral.'),
  additionalDetails: z.string().max(300, 'Details cannot exceed 300 characters.').optional(),
})

export const loginSchema = z.object({
  phone: z.string().min(1, 'Phone number is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  rememberMe: z.boolean(),
})

// Mirrors api/src/modules/auth/dto/register.dto.ts
export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required.').max(100),
  lastName: z.string().min(1, 'Last name is required.').max(100),
  phone: z.string().min(1, 'Phone number is required.').max(20, 'Phone number must be at most 20 characters.'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters.')
    .regex(/^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).+$/, 'Password must contain at least one uppercase letter and one special character.'),
})

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits.'),
})

export const placeOrderSchema = z.object({
  outlet: z.string().min(1, 'Outlet is required'),
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  temperatureMode: z.enum(['ambient', 'chilled']),
  quantity: z.number().min(1, 'Must be at least 1'),
  quantityUnit: z.string().default('Cases'), // Ensures it's always a string
  weight: z.number().min(0.1, 'Must be > 0'),
  volume: z.number().min(0.01, 'Must be > 0'),
  notes: z.string().optional().default(''), // Give it a default empty string so it never yields undefined
})

export const reportIssueSchema = z.object({
  issueType: z.string().min(1, 'Please select an issue type'),
  acceptedCases: z.number().min(0, 'Cannot be negative'),
  damagedCases: z.number().min(1, 'You must report at least 1 case'),
  notes: z.string().optional(),
})
