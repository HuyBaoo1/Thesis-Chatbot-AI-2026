import apiClient from "./api";

export const notificationService = {
  list: (params) => apiClient.get("/notifications/", { params }),
  getUnreadCount: (params) => apiClient.get("/notifications/unread-count", { params }),
  markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: (params) => apiClient.patch("/notifications/read-all", null, { params }),
};
