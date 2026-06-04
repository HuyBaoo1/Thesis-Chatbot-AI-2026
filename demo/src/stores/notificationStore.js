import { create } from "zustand";
import apiClient from "../lib/api";
import { realtimeService } from "../lib/realtime.service";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  _realtimeUnsub: null,

  subscribeRealtime: () => {
    const unsub = realtimeService.on("notification.changed", () => {
      get().fetchUnreadCount();
    });
    set({ _realtimeUnsub: unsub });
  },

  unsubscribeRealtime: () => {
    const unsub = get()._realtimeUnsub;
    if (unsub) {
      unsub();
      set({ _realtimeUnsub: null });
    }
  },

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get("/notifications/", { params: { limit: 20 } });
      set({ notifications: res.data.items, isLoading: false });
    } catch (error) {
      console.error("[notificationStore] fetchNotifications failed:", error);
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await apiClient.get("/notifications/unread-count");
      set({ unreadCount: res.data.unread_count });
    } catch (error) {
      console.error("[notificationStore] fetchUnreadCount failed:", error);
    }
  },

  markAsRead: async (id) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error("[notificationStore] markAsRead failed:", error);
    }
  },

  markAllAsRead: async () => {
    try {
      await apiClient.patch("/notifications/read-all");
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error("[notificationStore] markAllAsRead failed:", error);
    }
  },
}));
