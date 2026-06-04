import { z } from "zod"

import { feeTypeValues } from "@/types/tuition-policy-type"

const requiredNumberFromInput = (minimum: number, message: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined
      }

      return Number(value)
    },
    z.number().min(minimum, message)
  )

const tuitionPolicyFormSchema = z.object({
  major_id: z.string().trim().min(1, "Major is required"),
  year: requiredNumberFromInput(2000, "Year must be 2000 or greater").refine(
    (value) => value <= 2100,
    "Year must be 2100 or lower"
  ),
  fee_type: z.enum(feeTypeValues),
  base_fee: requiredNumberFromInput(0, "Base fee must be 0 or greater"),
})

type TuitionPolicyFormInput = z.input<typeof tuitionPolicyFormSchema>
type TuitionPolicyFormValues = z.output<typeof tuitionPolicyFormSchema>

export { tuitionPolicyFormSchema }
export type { TuitionPolicyFormInput, TuitionPolicyFormValues }
