import apiClient from "./api";

export const knowledgeService = {
  list: (params) => apiClient.get("/knowledge-chunks/", { params }),
  search: (params) => apiClient.get("/knowledge-chunks/", { params }),
  get: (chunkId) => apiClient.get(`/knowledge-chunks/${chunkId}`),
  create: (data) => apiClient.post("/knowledge-chunks/", data),
  update: (chunkId, data) => apiClient.patch(`/knowledge-chunks/${chunkId}`, data),
  delete: (chunkId) => apiClient.delete(`/knowledge-chunks/${chunkId}`),
  rebuildEmbedding: (chunkId) => apiClient.post(`/knowledge-chunks/${chunkId}/rebuild-embedding`),
  rebuildMissingEmbeddings: (params) => apiClient.post("/knowledge-chunks/rebuild-missing-embeddings", null, { params }),
  uploadFile: (formData) => apiClient.post("/knowledge-chunks/upload-file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  deleteUploadedFile: (params) => apiClient.delete("/knowledge-chunks/delete/uploaded-file", { params }),
};
