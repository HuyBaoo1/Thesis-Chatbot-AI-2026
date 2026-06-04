export type ScholarshipScope = "GLOBAL" | "MAJOR_SPECIFIC"

export type ScholarshipType = "MERIT" | "NEED_BASED" | "TALENT" | "SPECIAL"

export type ScholarshipValueType = "PERCENTAGE" | "FIXED_AMOUNT"

export type ScholarshipPolicy = {
  id: string
  major_id: string | null
  year: number
  name: string
  type: ScholarshipType
  scope: ScholarshipScope
  value_type: ScholarshipValueType
  value: number | null
  criteria: Record<string, unknown> | unknown[]
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export type ScholarshipPolicyListParams = {
  limit?: number
  offset?: number
}

export type ScholarshipPolicyListResponse = {
  items: ScholarshipPolicy[]
  total: number
  limit: number
  offset: number
}
