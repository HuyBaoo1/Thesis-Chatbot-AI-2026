import { z } from "zod"

export const initLeadSchema = z
  .object({
    full_name: z.string().min(1, "Full name is required"),
    email: z.email("Invalid email address").optional().or(z.literal("")),
    phone: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone number is required",
    path: ["email"],
  })

export type InitLeadSchema = z.infer<typeof initLeadSchema>
