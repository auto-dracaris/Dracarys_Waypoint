import * as z from "zod";

export const deferOrderSchema = z.object({
  reason: z.string().min(1, "Please select a reason for deferral."),
  additionalDetails: z
    .string()
    .max(300, "Details cannot exceed 300 characters.")
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email address is required.")
    .email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  rememberMe: z.boolean(),
});

export const placeOrderSchema = z.object({
  outlet: z.string().min(1, "Outlet is required"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  temperatureMode: z.enum(["ambient", "chilled"]),

  // Use standard z.number()
  quantity: z.number().min(1, "Must be at least 1"),
  quantityUnit: z.string().default("Cases"),
  weight: z.number().min(0.1, "Must be > 0"),
  volume: z.number().min(0.01, "Must be > 0"),
  notes: z.string().optional(),
});
