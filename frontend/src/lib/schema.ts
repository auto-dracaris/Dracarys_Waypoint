import * as z from "zod";

export const deferOrderSchema = z.object({
  reason: z.string().min(1, "Please select a reason for deferral."),
  additionalDetails: z
    .string()
    .max(300, "Details cannot exceed 300 characters.")
    .optional(),
});
