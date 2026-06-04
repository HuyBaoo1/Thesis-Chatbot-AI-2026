import { apiClient } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const chatService = {
  initLead(data) {
    return apiClient.post("/chat/init-lead", data);
  },

  query(data) {
    return apiClient.post("/chat/query", data);
  },

  listConversations(params) {
    return apiClient.get("/chat/conversations", { params });
  },

  initLeadRaw(data) {
    return fetch(`${API_BASE}/chat/init-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  getConversation(conversationId) {
    return apiClient.get(`/chat/conversations/${conversationId}`);
  },

  getMessages(conversationId, limit = 30, before) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set('before', before);
    return apiClient.get(`/chat/conversations/${conversationId}/messages?${params}`);
  },

  updateStatus(conversationId, status) {
    return apiClient.patch(`/chat/conversations/${conversationId}/status`, { status });
  },

  assign(conversationId, staffId) {
    return apiClient.patch(`/chat/conversations/${conversationId}/assign`, { staff_id: staffId });
  },

  updateSummary(conversationId, summary) {
    return apiClient.patch(`/chat/conversations/${conversationId}/summary`, { summary });
  },

  requestStaffContact(conversationId) {
    return apiClient.post(`/chat/conversations/${conversationId}/contact-staff-request`);
  },

  sendStaffMessage(conversationId, content) {
    return apiClient.post(`/chat/conversations/${conversationId}/staff-messages`, { content });
  },

  getMessageSources(messageId) {
    return apiClient.get(`/chat/messages/${messageId}/sources`);
  },

  getLeadConversations(leadId, params) {
    return apiClient.get(`/chat/leads/${leadId}/conversations`, { params });
  },
};
