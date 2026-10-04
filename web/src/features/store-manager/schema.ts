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

// The rule a password must meet when it is set: at sign-up and on a reset.
const newPassword = z
  .string()
  .min(6, 'Password must be at least 6 characters.')
  .regex(/^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).+$/, 'Password must contain at least one uppercase letter and one special character.')

// Mirrors api/src/modules/auth/dto/register.dto.ts
export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required.').max(100),
  lastName: z.string().min(1, 'Last name is required.').max(100),
  phone: z.string().min(1, 'Phone number is required.').max(20, 'Phone number must be at most 20 characters.'),
  password: newPassword,
})

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits.'),
})

export const forgotPasswordSchema = z.object({
  phone: z.string().min(1, 'Phone number is required.').max(20, 'Phone number must be at most 20 characters.'),
})

// Mirrors api/src/modules/auth/dto/reset-password.dto.ts; the phone comes from the step before.
export const resetPasswordSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits.'),
  newPassword,
})

// Mirrors api/src/modules/orders/dto/create-order.dto.ts. The outlet is not part of the form: an order is always for the store manager's own outlet.
export const placeOrderSchema = z.object({
  // The delivery day, as YYYY-MM-DD.
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  temperatureMode: z.enum(['ambient', 'chilled']),
  quantity: z.number().int('Must be a whole number').min(1, 'Must be at least 1'),
  weight: z.number().positive('Must be > 0'),
  volume: z.number().positive('Must be > 0'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters.').optional().default(''), // Give it a default empty string so it never yields undefined
})

// Submitted as api/src/modules/issues/dto/create-issue.dto.ts; see the deliveries page for how each type maps.
export const reportIssueSchema = z.object({
  issueType: z.enum(['Damaged goods', 'Missing goods', 'Wrong items']),
  acceptedCases: z.number().int('Use whole cases').min(0, 'Cannot be negative'),
  damagedCases: z.number().int('Use whole cases').min(0, 'Cannot be negative'),
  // The issues API takes 500 characters; the page adds the accepted count in front.
  notes: z.string().max(450, 'Notes cannot exceed 450 characters.').optional(),
}).superRefine((values, context) => {
  if (values.issueType === 'Damaged goods' && values.damagedCases < 1) {
    context.addIssue({ code: 'custom', path: ['damagedCases'], message: 'You must report at least 1 damaged case' })
  }
  if (values.issueType === 'Wrong items' && !values.notes?.trim()) {
    context.addIssue({ code: 'custom', path: ['notes'], message: 'Describe which items were wrong' })
  }
})
