const majorTypeValues = [
  "UNDERGRAD_MAJOR",
  "GRAD_MAJOR",
  "CERTIFICATE_PROGRAM",
] as const

type MajorType = (typeof majorTypeValues)[number]

type Major = {
  id: string
  code: string
  name: string
  description: string | null
  credits: number | null
  duration: number | null
  degree_type: string | null
  major_type: MajorType
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

type MajorListResponse = {
  items: Major[]
  total: number
  limit: number
  offset: number
}

type MajorListParams = {
  limit?: number
  offset?: number
  q?: string
  major_type?: MajorType
}

type CreateMajorPayload = {
  code: string
  name: string
  description?: string
  credits?: number
  duration?: number
  degree_type?: string
  major_type: MajorType
  is_active?: boolean
}

type UpdateMajorPayload = Partial<CreateMajorPayload>

type UpdateMajorStatusPayload = {
  is_active: boolean
}

const majorTypeOptions: Array<{ label: string; value: MajorType }> = [
  { label: "typeUndergrad", value: "UNDERGRAD_MAJOR" },
  { label: "typeGrad", value: "GRAD_MAJOR" },
  { label: "typeCertificate", value: "CERTIFICATE_PROGRAM" },
]

const majorTypeLabelMap: Record<MajorType, string> = Object.fromEntries(
  majorTypeOptions.map((item) => [item.value, item.label])
) as Record<MajorType, string>

export { majorTypeLabelMap, majorTypeOptions, majorTypeValues }
export type {
  CreateMajorPayload,
  Major,
  MajorListParams,
  MajorListResponse,
  MajorType,
  UpdateMajorPayload,
  UpdateMajorStatusPayload,
}
