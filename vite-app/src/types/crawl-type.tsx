import type {
  AdmissionCategory,
  KnowledgeChunkUploadResponse,
} from "@/types/knowledge-chunk-type"

type CrawlSessionStatus = "PENDING" | "SCRAPING" | "COMPLETED" | "FAILED"

type CrawlSession = {
  id: string
  target_url: string
  limit: number
  status: CrawlSessionStatus
  total_pages: number
  completed_pages: number
  started_at: string | null
  completed_at: string | null
  created_at: string | null
}

type CrawlSessionListParams = {
  status?: CrawlSessionStatus
  limit?: number
  offset?: number
}

type CrawlSessionListResponse = {
  items: CrawlSession[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

type CreateCrawlSessionPayload = {
  target_url: string
  limit: number
}

type CrawlPageSuggestedMetadata = {
  category?: AdmissionCategory | string | null
  title?: string | null
  year?: number | null
  source?: string | null
}

type CrawlPageJobStatus = "completed" | "failed" | string

type CrawlPageJob = {
  id: string
  crawl_session_id: string
  source_url: string
  detected_title: string | null
  page_index: number | null
  md_r2_key: string | null
  content_hash: string | null
  status: CrawlPageJobStatus
  suggested_metadata: CrawlPageSuggestedMetadata | null
  error_message: string | null
  title: string | null
  category: AdmissionCategory | string | null
  year: number | null
  version_start: number | null
  sent_to_kb: string | null
  created_at: string | null
  updated_at: string | null
}

type CrawlPageJobListParams = {
  crawl_session_id?: string
  status?: CrawlPageJobStatus
  sent_to_kb?: boolean
  q?: string
  limit?: number
  offset?: number
}

type CrawlPageJobListResponse = {
  items: CrawlPageJob[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

type CrawlDownloadResponse = {
  url: string
}

type UpdateCrawlPageContentPayload = {
  pageJobId: string
  content: string
}

type SendCrawlPageToKbPayload = {
  pageJobId: string
  title: string
  category: AdmissionCategory
  year?: number
  version_start?: number
  chunk_size?: number
  chunk_overlap?: number
}

type SendCrawlPageToKbResponse = {
  page_job: CrawlPageJob
  kb_result: KnowledgeChunkUploadResponse | null
  reused: boolean
}

export type {
  CreateCrawlSessionPayload,
  CrawlDownloadResponse,
  CrawlPageJob,
  CrawlPageJobListParams,
  CrawlPageJobListResponse,
  CrawlPageJobStatus,
  CrawlPageSuggestedMetadata,
  CrawlSession,
  CrawlSessionListParams,
  CrawlSessionListResponse,
  CrawlSessionStatus,
  SendCrawlPageToKbPayload,
  SendCrawlPageToKbResponse,
  UpdateCrawlPageContentPayload,
}
