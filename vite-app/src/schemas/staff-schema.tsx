import { z } from "zod"

const staffRoleSchema = z.enum(["ADMIN", "COUNSELOR"])

const staffFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email("Email is invalid"),
  password: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || value.length >= 6, {
      message: "Password must be at least 6 characters",
    }),
  role: staffRoleSchema,
})

type StaffFormValues = z.infer<typeof staffFormSchema>

export { staffFormSchema, staffRoleSchema }
export type { StaffFormValues }
