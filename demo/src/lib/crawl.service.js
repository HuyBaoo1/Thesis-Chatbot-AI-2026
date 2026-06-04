import apiClient from "./api";

export const crawlService = {
  // Sessions
  createSession: (data) => apiClient.post("/crawl/sessions/", data),
  listSessions: (params) => apiClient.get("/crawl/sessions/", { params }),
  getSession: (crawlId) => apiClient.get(`/crawl/sessions/${crawlId}`),
  pollSession: (crawlId) => apiClient.post(`/crawl/sessions/${crawlId}/poll/`),
  deleteSession: (crawlId) => apiClient.delete(`/crawl/sessions/${crawlId}`),

  // URLs
  listUrls: (params) => apiClient.get("/crawl/urls/", { params }),
  getUrl: (urlId) => apiClient.get(`/crawl/urls/${urlId}`),
  approveUrl: (urlId) => apiClient.post(`/crawl/urls/${urlId}/approve/`),
  rejectUrl: (urlId) => apiClient.post(`/crawl/urls/${urlId}/reject/`),
  processUrl: (urlId) => apiClient.post(`/crawl/urls/${urlId}/process/`),
  deleteUrl: (urlId) => apiClient.delete(`/crawl/urls/${urlId}`),

  // Batch
  processAllApproved: (crawlId) => apiClient.post(`/crawl/sessions/${crawlId}/process-all/`),
};
