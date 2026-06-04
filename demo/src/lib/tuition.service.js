import apiClient from "./api";

export const tuitionService = {
  list: (params) => apiClient.get("/tuition-policies/", { params }),
  get: (id) => apiClient.get(`/tuition-policies/${id}`),
  create: (data) => apiClient.post("/tuition-policies/", data),
  update: (id, data) => apiClient.patch(`/tuition-policies/${id}`, data),
  delete: (id) => apiClient.delete(`/tuition-policies/${id}`),
};
