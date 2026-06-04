import apiClient from "./api";

export const applicationService = {
  list: (params) => apiClient.get("/applications/", { params }),
  get: (applicationId) => apiClient.get(`/applications/${applicationId}`),
  create: (data) => apiClient.post("/applications/", data),
  update: (applicationId, data) => apiClient.patch(`/applications/${applicationId}`, data),
  updateStage: (applicationId, stage) => apiClient.patch(`/applications/${applicationId}/stage`, { stage }),
};
