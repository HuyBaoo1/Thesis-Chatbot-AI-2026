import axios from "@/lib/axios"
import type {
  CreateCrawlSessionPayload,
  CrawlDownloadResponse,
  CrawlPageJob,
  CrawlPageJobListParams,
  CrawlPageJobListResponse,
  CrawlSession,
  CrawlSessionListParams,
  CrawlSessionListResponse,
  SendCrawlPageToKbPayload,
  SendCrawlPageToKbResponse,
  UpdateCrawlPageContentPayload,
} from "@/types/crawl-type"

const createCrawlSession = async (
  payload: CreateCrawlSessionPayload
): Promise<CrawlSession> => {
  return await axios.post("crawl/sessions/", payload)
}

const getCrawlSessions = async (
  params?: CrawlSessionListParams
): Promise<CrawlSessionListResponse> => {
  return await axios.get("crawl/sessions/", { params })
}

const deleteCrawlSession = async (sessionId: string): Promise<void> => {
  return await axios.delete(`crawl/sessions/${sessionId}`)
}

const getCrawlPageJobs = async (
  params?: CrawlPageJobListParams
): Promise<CrawlPageJobListResponse> => {
  return await axios.get("crawl/page-jobs/", { params })
}

const getCrawlPageJobContent = async (pageJobId: string): Promise<string> => {
  return await axios.get(`crawl/page-jobs/${pageJobId}/content`, {
    responseType: "text",
    transformResponse: [(data) => data],
  })
}

const updateCrawlPageJobContent = async ({
  pageJobId,
  content,
}: UpdateCrawlPageContentPayload): Promise<CrawlPageJob> => {
  return await axios.put(`crawl/page-jobs/${pageJobId}/content`, { content })
}

const getCrawlPageJobDownloadUrl = async (
  pageJobId: string
): Promise<string> => {
  const response: CrawlDownloadResponse = await axios.get(
    `crawl/page-jobs/${pageJobId}/download`
  )
  return response.url
}

const sendCrawlPageJobToKb = async ({
  pageJobId,
  title,
  category,
  year,
  version_start,
  chunk_size,
  chunk_overlap,
}: SendCrawlPageToKbPayload): Promise<SendCrawlPageToKbResponse> => {
  return await axios.post(`crawl/page-jobs/${pageJobId}/send-to-kb`, {
    title,
    category,
    year,
    version_start,
    chunk_size,
    chunk_overlap,
  })
}

const deleteCrawlPageJob = async (pageJobId: string): Promise<void> => {
  return await axios.delete(`crawl/page-jobs/${pageJobId}`)
}

export {
  createCrawlSession,
  deleteCrawlPageJob,
  deleteCrawlSession,
  getCrawlPageJobContent,
  getCrawlPageJobDownloadUrl,
  getCrawlPageJobs,
  getCrawlSessions,
  sendCrawlPageJobToKb,
  updateCrawlPageJobContent,
}
