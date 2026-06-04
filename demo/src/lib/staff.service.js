import apiClient from "./api";

export const staffService = {
  list: (params) => apiClient.get("/staffs/", { params }),
  get: (staffId) => apiClient.get(`/staffs/${staffId}`),
  create: (data) => apiClient.post("/staffs/", data),
  update: (staffId, data) => apiClient.patch(`/staffs/${staffId}`, data),
  updateStatus: (staffId, data) => apiClient.patch(`/staffs/${staffId}/status`, data),
  delete: (staffId) => apiClient.delete(`/staffs/${staffId}`),
};
