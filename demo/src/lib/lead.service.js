import apiClient from "./api";

export const leadService = {
  list: (params) => apiClient.get("/leads/", { params }),
  get: (leadId) => apiClient.get(`/leads/${leadId}`),
  update: (leadId, data) => apiClient.patch(`/leads/${leadId}`, data),
  updateStatus: (leadId, status) => apiClient.patch(`/leads/${leadId}/status`, { status }),
  assign: (leadId, staffId) => apiClient.patch(`/leads/${leadId}/assign`, { assigned_staff_id: staffId }),
  getActivities: (leadId, params) => apiClient.get(`/leads/${leadId}/activities`, { params }),
  createActivity: (leadId, data) => apiClient.post(`/leads/${leadId}/activities`, data),
  getInterests: (leadId) => apiClient.get(`/leads/${leadId}/interests`),
  upsertInterest: (leadId, data) => apiClient.post(`/leads/${leadId}/interests`, data),
  deleteInterest: (leadId, majorId) => apiClient.delete(`/leads/${leadId}/interests/${majorId}`),
  getApplications: (leadId, params) => apiClient.get(`/leads/${leadId}/applications`, { params }),
  getScoreHistory: (leadId) => apiClient.get(`/leads/${leadId}/score-history`),
};
