import type { AdmissionCategory } from "@/types/knowledge-chunk-type"

type OcrCategorySuggestion = {
  category_id: string
  confidence: number
  reason?: string | null
  needs_review?: boolean
}

type OcrJobStatus =
  | "queued"
  | "started"
  | "deferred"
  | "completed"
  | "failed"
  | "canceled"
  | string

type OcrJob = {
  job_id: string
  status: OcrJobStatus
  original_filename?: string | null
  title?: string | null
  year?: number | null
  version_start?: number | null
  category?: AdmissionCategory | string | null
  progress?: number | null
  stage?: string | null
  suggested_category?: OcrCategorySuggestion | null
  md_r2_key?: string | null
  pages?: number | null
  error_message?: string | null
  sent_to_kb?: string | null
  reused?: boolean
  duplicate_of_job_id?: string | null
}

type OcrJobListResponse = {
  jobs: OcrJob[]
  total: number
  page: number
  page_size: number
  pages: number
}

type CreateOcrJobPayload = {
  file: File
  title: string
  category: AdmissionCategory
  year?: number
  version_start?: number
}

type UpdateOcrContentPayload = {
  jobId: string
  content: string
}

type SendOcrToKbPayload = {
  jobId: string
  category?: AdmissionCategory
  chunk_size?: number
  chunk_overlap?: number
}

type OcrJobListParams = {
  page?: number
  page_size?: number
}

type OcrDownloadResponse = {
  url: string
}

export type {
  CreateOcrJobPayload,
  OcrCategorySuggestion,
  OcrDownloadResponse,
  OcrJob,
  OcrJobListParams,
  OcrJobListResponse,
  SendOcrToKbPayload,
  UpdateOcrContentPayload,
}
