import axios from "@/lib/axios"
import type {
  CreateKnowledgeChunkPayload,
  DeleteUploadedKnowledgeChunkFilePayload,
  DeleteUploadedKnowledgeChunkFileResponse,
  KnowledgeChunk,
  KnowledgeChunkListParams,
  KnowledgeChunkListResponse,
  KnowledgeChunkUploadedFileListParams,
  KnowledgeChunkUploadedFileListResponse,
  KnowledgeChunkUploadResponse,
  RebuildMissingEmbeddingsResponse,
  UploadKnowledgeChunkFilePayload,
  UpdateKnowledgeChunkPayload,
  UpdateKnowledgeChunkStatusPayload,
} from "@/types/knowledge-chunk-type"

const getKnowledgeChunks = async (
  params?: KnowledgeChunkListParams
): Promise<KnowledgeChunkListResponse> => {
  return await axios.get("knowledge-chunks", { params })
}

const getUploadedKnowledgeChunkFiles = async (
  params?: KnowledgeChunkUploadedFileListParams
): Promise<KnowledgeChunkUploadedFileListResponse> => {
  return await axios.get("knowledge-chunks/uploaded-files", { params })
}

const createKnowledgeChunk = async (
  payload: CreateKnowledgeChunkPayload
): Promise<KnowledgeChunk> => {
  return await axios.post("knowledge-chunks", payload)
}

const updateKnowledgeChunk = async (
  chunkId: string,
  payload: UpdateKnowledgeChunkPayload
): Promise<KnowledgeChunk> => {
  return await axios.patch(`knowledge-chunks/${chunkId}`, payload)
}

const updateKnowledgeChunkStatus = async (
  chunkId: string,
  payload: UpdateKnowledgeChunkStatusPayload
): Promise<KnowledgeChunk> => {
  return await axios.patch(`knowledge-chunks/${chunkId}/status`, payload)
}

const deleteKnowledgeChunk = async (chunkId: string): Promise<void> => {
  return await axios.delete(`knowledge-chunks/${chunkId}`)
}

const uploadKnowledgeChunkFile = async (
  payload: UploadKnowledgeChunkFilePayload
): Promise<KnowledgeChunkUploadResponse> => {
  const formData = new FormData()

  formData.append("file", payload.file)
  formData.append("category", payload.category)

  if (payload.title) {
    formData.append("title", payload.title)
  }
  if (payload.major_id) {
    formData.append("major_id", payload.major_id)
  }
  if (payload.year !== undefined) {
    formData.append("year", String(payload.year))
  }
  if (payload.version_start !== undefined) {
    formData.append("version_start", String(payload.version_start))
  }
  if (payload.chunk_size !== undefined) {
    formData.append("chunk_size", String(payload.chunk_size))
  }
  if (payload.chunk_overlap !== undefined) {
    formData.append("chunk_overlap", String(payload.chunk_overlap))
  }

  return await axios.post("knowledge-chunks/upload-file", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
}

const deleteUploadedKnowledgeChunkFile = async (
  payload: DeleteUploadedKnowledgeChunkFilePayload
): Promise<DeleteUploadedKnowledgeChunkFileResponse> => {
  return await axios.delete("knowledge-chunks/delete/uploaded-file", {
    params: payload,
  })
}

const rebuildMissingEmbeddings = async (
  limit = 100
): Promise<RebuildMissingEmbeddingsResponse> => {
  return await axios.post("knowledge-chunks/rebuild-missing-embeddings", null, {
    params: { limit },
  })
}

export {
  createKnowledgeChunk,
  deleteKnowledgeChunk,
  deleteUploadedKnowledgeChunkFile,
  getKnowledgeChunks,
  getUploadedKnowledgeChunkFiles,
  rebuildMissingEmbeddings,
  uploadKnowledgeChunkFile,
  updateKnowledgeChunk,
  updateKnowledgeChunkStatus,
}
