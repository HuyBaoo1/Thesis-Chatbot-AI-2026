type AdmissionCategory =
  | "TUITION"
  | "SCHOLARSHIP"
  | "REQUIREMENT"
  | "DEADLINE"
  | "PROCESS"
  | "MAJOR_INFO"
  | "FAQ"

type KnowledgeChunk = {
  id: string
  major_id: string | null
  category: AdmissionCategory
  title: string | null
  content: string
  metadata_json: Record<string, unknown> | unknown[] | null
  year: number | null
  source: string | null
  source_url: string | null
  version: number
  is_active: boolean
  needs_embedding: boolean
  created_at: string | null
  updated_at: string | null
}

type KnowledgeChunkListResponse = {
  items: KnowledgeChunk[]
  total: number
  limit: number
  offset: number
}

type KnowledgeChunkListParams = {
  limit?: number
  offset?: number
  q?: string
  category?: AdmissionCategory
  source?: string
  year?: number
  is_active?: boolean
  needs_embedding?: boolean
}

type CreateKnowledgeChunkPayload = {
  major_id?: string
  category: AdmissionCategory
  title?: string
  content: string
  year?: number
  source?: string
  source_url?: string
  version: number
  is_active?: boolean
  needs_embedding?: boolean
}

type UpdateKnowledgeChunkPayload = Partial<CreateKnowledgeChunkPayload>

type UpdateKnowledgeChunkStatusPayload = {
  is_active: boolean
}

type UploadKnowledgeChunkFilePayload = {
  file: File
  title?: string
  category: AdmissionCategory
  major_id?: string
  year?: number
  version_start?: number
  chunk_size?: number
  chunk_overlap?: number
}

type KnowledgeChunkUploadResponse = {
  file_name: string
  file_url: string
  r2_key: string
  total_chunks: number
  embedded_chunks: number
  failed_embedding_chunks: number
  created_ids: string[]
}

type KnowledgeChunkUploadedFile = {
  r2_key: string
  file_name: string | null
  title: string | null
  file_url: string | null
  source: string | null
  year: number | null
  version: number | null
  chunk_count: number
  created_at: string | null
  updated_at: string | null
}

type KnowledgeChunkUploadedFileListParams = {
  title?: string
  limit?: number
  offset?: number
}

type KnowledgeChunkUploadedFileListResponse = {
  items: KnowledgeChunkUploadedFile[]
  total: number
  limit: number
  offset: number
}

type DeleteUploadedKnowledgeChunkFilePayload = {
  r2_key?: string
  file_url?: string
}

type DeleteUploadedKnowledgeChunkFileResponse = {
  message: string
  r2_key: string | null
  file_url: string | null
  total_chunks: number
  qdrant_deleted_chunks: number
  db_deactivated_chunks: number
  r2_file_deleted: boolean
  chunk_ids: string[]
}

type RebuildMissingEmbeddingsResponse = {
  processed: number
  embedded: number
  failed: number
  failed_ids: string[]
}

const admissionCategoryOptions: Array<{
  label: string
  value: AdmissionCategory
}> = [
  { label: "Tuition", value: "TUITION" },
  { label: "Scholarship", value: "SCHOLARSHIP" },
  { label: "Requirement", value: "REQUIREMENT" },
  { label: "Deadline", value: "DEADLINE" },
  { label: "Process", value: "PROCESS" },
  { label: "Major Info", value: "MAJOR_INFO" },
  { label: "FAQ", value: "FAQ" },
]

const admissionCategoryLabelMap: Record<AdmissionCategory, string> =
  Object.fromEntries(
    admissionCategoryOptions.map((item) => [item.value, item.label])
  ) as Record<AdmissionCategory, string>

export { admissionCategoryLabelMap, admissionCategoryOptions }
export type {
  AdmissionCategory,
  CreateKnowledgeChunkPayload,
  KnowledgeChunk,
  KnowledgeChunkListParams,
  KnowledgeChunkListResponse,
  KnowledgeChunkUploadedFile,
  KnowledgeChunkUploadedFileListParams,
  KnowledgeChunkUploadedFileListResponse,
  KnowledgeChunkUploadResponse,
  DeleteUploadedKnowledgeChunkFilePayload,
  DeleteUploadedKnowledgeChunkFileResponse,
  RebuildMissingEmbeddingsResponse,
  UploadKnowledgeChunkFilePayload,
  UpdateKnowledgeChunkPayload,
  UpdateKnowledgeChunkStatusPayload,
}
