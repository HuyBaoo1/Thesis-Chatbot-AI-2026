import axios from "@/lib/axios"
import type {
  CreateOcrJobPayload,
  OcrDownloadResponse,
  OcrJob,
  OcrJobListParams,
  OcrJobListResponse,
  SendOcrToKbPayload,
  UpdateOcrContentPayload,
} from "@/types/ocr-type"

const getOcrJobs = async (
  params?: OcrJobListParams
): Promise<OcrJobListResponse> => {
  return await axios.get("ocr-quick/jobs", { params })
}

const createOcrJob = async (
  payload: CreateOcrJobPayload
): Promise<OcrJob> => {
  const formData = new FormData()

  formData.append("file", payload.file)
  formData.append("title", payload.title)
  formData.append("category", payload.category)
  formData.append("version_start", String(payload.version_start ?? 1))

  if (payload.year !== undefined) {
    formData.append("year", String(payload.year))
  }

  return await axios.post("ocr-quick/jobs", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
}

const getOcrJob = async (jobId: string): Promise<OcrJob> => {
  return await axios.get(`ocr-quick/jobs/${jobId}`)
}

const getOcrJobContent = async (jobId: string): Promise<string> => {
  return await axios.get(`ocr-quick/jobs/${jobId}/content`, {
    responseType: "text",
    transformResponse: [(data) => data],
  })
}

const getOcrJobDownloadUrl = async (jobId: string): Promise<string> => {
  const response: OcrDownloadResponse = await axios.get(
    `ocr-quick/jobs/${jobId}/download`
  )
  return response.url
}

const updateOcrJobContent = async ({
  jobId,
  content,
}: UpdateOcrContentPayload): Promise<OcrJob> => {
  return await axios.put(`ocr-quick/jobs/${jobId}/content`, { content })
}

const retryOcrJob = async (jobId: string): Promise<OcrJob> => {
  return await axios.post(`ocr-quick/jobs/${jobId}/retry`)
}

const sendOcrJobToKb = async ({
  jobId,
  category,
  chunk_size,
  chunk_overlap,
}: SendOcrToKbPayload): Promise<OcrJob> => {
  return await axios.post(`ocr-quick/jobs/${jobId}/send-to-kb`, {
    category,
    chunk_size,
    chunk_overlap,
  })
}

const deleteOcrJob = async (jobId: string): Promise<void> => {
  return await axios.delete(`ocr-quick/jobs/${jobId}`)
}

export {
  createOcrJob,
  deleteOcrJob,
  getOcrJob,
  getOcrJobContent,
  getOcrJobDownloadUrl,
  getOcrJobs,
  retryOcrJob,
  sendOcrJobToKb,
  updateOcrJobContent,
}
