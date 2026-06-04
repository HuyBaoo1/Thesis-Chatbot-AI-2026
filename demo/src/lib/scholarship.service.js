import apiClient from "./api";

export const scholarshipService = {
  list: (params) => apiClient.get("/scholarship-policies/", { params }),
  get: (id) => apiClient.get(`/scholarship-policies/${id}`),
  create: (data) => apiClient.post("/scholarship-policies/", data),
  update: (id, data) => apiClient.patch(`/scholarship-policies/${id}`, data),
  delete: (id) => apiClient.delete(`/scholarship-policies/${id}`),
};
