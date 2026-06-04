const leadStatusValues = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "APPLIED",
  "ENROLLED",
  "LOST",
] as const

const leadTemperatureValues = ["HOT", "WARM", "COLD"] as const

const admissionStageValues = [
  "NEW",
  "PROFILE_SUBMITTED",
  "DOCUMENT_REVIEW",
  "INTERVIEW",
  "OFFER_EXTENDED",
  "ENROLLED",
  "REJECTED",
] as const

type LeadStatus = (typeof leadStatusValues)[number]
type LeadTemperature = (typeof leadTemperatureValues)[number]
type AdmissionStage = (typeof admissionStageValues)[number]
type LeadScoreSort = "asc" | "desc"
type LeadSortOption = "newest" | "score_desc" | "score_asc"

type Lead = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  high_school: string | null
  province: string | null
  status: LeadStatus | null
  temperature: LeadTemperature | null
  score: number | null
  gpa: number | null
  ielts: number | null
  sat: number | null
  act: number | null
  cv_url: string | null
  essay_url: string | null
  transcript_url: string | null
  extracurriculars: Record<string, unknown> | unknown[] | null
  ability_score: number | null
  aspiration_score: number | null
  creativity_score: number | null
  commitment_score: number | null
  fit_score: number | null
  assigned_staff_id: string | null
  last_interaction_at: string | null
  created_at: string | null
  updated_at: string | null
}

type LeadListResponse = {
  items: Lead[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

type LeadListParams = {
  limit?: number
  offset?: number
  q?: string
  status?: LeadStatus
  temperature?: LeadTemperature
  assigned_staff_id?: string
  score_sort?: LeadScoreSort
}

type UpdateLeadPayload = {
  full_name?: string | null
  email?: string | null
  phone?: string | null
  high_school?: string | null
  province?: string | null
  status?: LeadStatus | null
  temperature?: LeadTemperature | null
  gpa?: number | null
  ielts?: number | null
  sat?: number | null
  act?: number | null
  cv_url?: string | null
  essay_url?: string | null
  transcript_url?: string | null
  extracurriculars?: Record<string, unknown> | unknown[] | null
  ability_score?: number | null
  aspiration_score?: number | null
  creativity_score?: number | null
  commitment_score?: number | null
  fit_score?: number | null
}

type LeadActivity = {
  id: string
  lead_id: string | null
  action: string
  score_delta: number
  extra_data: Record<string, unknown> | null
  created_at: string | null
}

type LeadActivityListResponse = {
  items: LeadActivity[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

type LeadScoreHistoryItem = {
  id: string
  action: string
  score_delta: number
  running_activity_score: number
  extra_data: Record<string, unknown>
  created_at: string | null
}

type LeadScoreHistoryResponse = {
  lead_id: string
  current_score: number | null
  temperature: LeadTemperature | null
  items: LeadScoreHistoryItem[]
  total: number
}

type LeadInterest = {
  lead_id: string
  major_id: string
  priority: number | null
  major_code: string | null
  major_name: string | null
}

type LeadInterestListResponse = {
  lead_id: string
  items: LeadInterest[]
  total: number
}

type LeadApplication = {
  id: string
  lead_id: string
  major_id: string
  stage: AdmissionStage
  note: string | null
  admission_year: number
  round_name: string | null
  source_channel: string | null
  created_at: string | null
  updated_at: string | null
}

type LeadApplicationListResponse = {
  items: LeadApplication[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

const leadStatusOptions: Array<{ label: string; value: LeadStatus }> = [
  { label: "New", value: "NEW" },
  { label: "Contacted", value: "CONTACTED" },
  { label: "Qualified", value: "QUALIFIED" },
  { label: "Applied", value: "APPLIED" },
  { label: "Enrolled", value: "ENROLLED" },
  { label: "Lost", value: "LOST" },
]

const leadTemperatureOptions: Array<{
  label: string
  value: LeadTemperature
}> = [
  { label: "Hot", value: "HOT" },
  { label: "Warm", value: "WARM" },
  { label: "Cold", value: "COLD" },
]

const admissionStageOptions: Array<{ label: string; value: AdmissionStage }> = [
  { label: "New", value: "NEW" },
  { label: "Profile Submitted", value: "PROFILE_SUBMITTED" },
  { label: "Document Review", value: "DOCUMENT_REVIEW" },
  { label: "Interview", value: "INTERVIEW" },
  { label: "Offer Extended", value: "OFFER_EXTENDED" },
  { label: "Enrolled", value: "ENROLLED" },
  { label: "Rejected", value: "REJECTED" },
]

const leadSortOptions: Array<{ label: string; value: LeadSortOption }> = [
  { label: "Newest first", value: "newest" },
  { label: "Score high to low", value: "score_desc" },
  { label: "Score low to high", value: "score_asc" },
]

const leadStatusLabelMap: Record<LeadStatus, string> = Object.fromEntries(
  leadStatusOptions.map((item) => [item.value, item.label])
) as Record<LeadStatus, string>

const leadTemperatureLabelMap: Record<LeadTemperature, string> =
  Object.fromEntries(leadTemperatureOptions.map((item) => [item.value, item.label])) as Record<
    LeadTemperature,
    string
  >

const admissionStageLabelMap: Record<AdmissionStage, string> = Object.fromEntries(
  admissionStageOptions.map((item) => [item.value, item.label])
) as Record<AdmissionStage, string>

export {
  admissionStageLabelMap,
  admissionStageOptions,
  admissionStageValues,
  leadStatusLabelMap,
  leadStatusOptions,
  leadSortOptions,
  leadStatusValues,
  leadTemperatureLabelMap,
  leadTemperatureOptions,
  leadTemperatureValues,
}
export type {
  AdmissionStage,
  Lead,
  LeadActivity,
  LeadActivityListResponse,
  LeadApplication,
  LeadApplicationListResponse,
  LeadInterest,
  LeadInterestListResponse,
  LeadListParams,
  LeadListResponse,
  LeadScoreSort,
  LeadScoreHistoryItem,
  LeadScoreHistoryResponse,
  LeadSortOption,
  LeadStatus,
  LeadTemperature,
  UpdateLeadPayload,
}
