import axios from "@/lib/axios"
import type {
  NotificationListParams,
  NotificationListResponse,
  NotificationItem,
  NotificationTarget,
  UnreadNotificationCountResponse,
} from "@/types/notification-type"

const getNotifications = async (
  params?: NotificationListParams
): Promise<NotificationListResponse> => {
  return await axios.get("notifications", { params })
}

const getUnreadNotificationCount = async (params?: {
  target?: NotificationTarget
  staff_id?: string
}): Promise<UnreadNotificationCountResponse> => {
  return await axios.get("notifications/unread-count", { params })
}

const markNotificationRead = async (
  notificationId: string
): Promise<NotificationItem> => {
  return await axios.patch(`notifications/${notificationId}/read`)
}

const markAllNotificationsRead = async (params?: {
  target?: NotificationTarget
  staff_id?: string
}): Promise<{ updated: number }> => {
  return await axios.patch("notifications/read-all", undefined, { params })
}

const deleteNotification = async (
  notificationId: string
): Promise<{ message: string }> => {
  return await axios.delete(`notifications/${notificationId}`)
}

export {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
}
