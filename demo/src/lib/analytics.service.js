import apiClient from "./api";

export const analyticsService = {
  getDaily: (params) => apiClient.get("/admin/analytics/daily", { params }),
  getDailySummary: (params) => apiClient.get("/admin/analytics/daily/summary", { params }),
  getTodayAnalytics: () => apiClient.get("/admin/analytics/daily/today"),
  getConversationStats: () => apiClient.get("/admin/analytics/conversation-stats"),
  getConversionFunnel: () => apiClient.get("/admin/analytics/conversion-funnel"),
  getHotQuestions: (params) => apiClient.get("/admin/analytics/hot-questions", { params }),
  getHotQuestionsSummary: () => apiClient.get("/admin/analytics/hot-questions/summary"),
};
