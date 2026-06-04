import { z } from "zod"

import { majorTypeValues } from "@/types/major-type"

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => value || undefined)

const optionalNumberFromInput = (minimum: number, message: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined
      }

      return Number(value)
    },
    z.number().int().min(minimum, message).optional()
  )

const majorFormSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  name: z.string().trim().min(1, "Name is required"),
  description: optionalTrimmedString,
  credits: optionalNumberFromInput(0, "Credits must be 0 or greater"),
  duration: optionalNumberFromInput(0, "Duration must be 0 or greater"),
  degree_type: optionalTrimmedString,
  major_type: z.enum(majorTypeValues),
})

type MajorFormInput = z.input<typeof majorFormSchema>
type MajorFormValues = z.output<typeof majorFormSchema>

export { majorFormSchema }
export type { MajorFormInput, MajorFormValues }
