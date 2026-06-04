import apiClient from "./api";

export const majorService = {
  list: (params) => apiClient.get("/majors/", { params }),
  get: (majorId) => apiClient.get(`/majors/${majorId}`),
  create: (data) => apiClient.post("/majors/", data),
  update: (majorId, data) => apiClient.patch(`/majors/${majorId}`, data),
  delete: (majorId) => apiClient.delete(`/majors/${majorId}`),
};
