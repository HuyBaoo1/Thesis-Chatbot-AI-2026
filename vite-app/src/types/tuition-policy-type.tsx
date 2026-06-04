const feeTypeValues = ["CREDIT", "SEMESTER", "YEAR", "HYBRID"] as const

type FeeType = (typeof feeTypeValues)[number]

type TuitionPolicy = {
  id: string
  major_id: string
  year: number
  fee_type: FeeType
  base_fee: number
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

type TuitionPolicyListResponse = {
  items: TuitionPolicy[]
  total: number
  limit: number
  offset: number
}

type TuitionPolicyListParams = {
  limit?: number
  offset?: number
  year?: number
  major_id?: string
  fee_type?: FeeType
}

type CreateTuitionPolicyPayload = {
  major_id: string
  year: number
  fee_type: FeeType
  base_fee: number
  is_active?: boolean
}

type UpdateTuitionPolicyPayload = Partial<CreateTuitionPolicyPayload>

type UpdateTuitionPolicyStatusPayload = {
  is_active: boolean
}

const feeTypeOptions: Array<{ label: string; value: FeeType }> = [
  { label: "Per Credit", value: "CREDIT" },
  { label: "Per Semester", value: "SEMESTER" },
  { label: "Per Year", value: "YEAR" },
  { label: "Hybrid", value: "HYBRID" },
]

const feeTypeLabelMap: Record<FeeType, string> = Object.fromEntries(
  feeTypeOptions.map((item) => [item.value, item.label])
) as Record<FeeType, string>

export { feeTypeLabelMap, feeTypeOptions, feeTypeValues }
export type {
  CreateTuitionPolicyPayload,
  FeeType,
  TuitionPolicy,
  TuitionPolicyListParams,
  TuitionPolicyListResponse,
  UpdateTuitionPolicyPayload,
  UpdateTuitionPolicyStatusPayload,
}
