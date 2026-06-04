type NotificationTarget = "ADMIN" | "STAFF" | "USER"
type NotificationStatus = "PENDING" | "SENT" | "FAILED"
type NotificationType =
  | "HOT_LEAD"
  | "FOLLOW_UP"
  | "DEADLINE"
  | "APPLICATION_UPDATE"
  | "TUITION_INFO"
  | "FAQ_MISSING"

type NotificationItem = {
  id: string
  lead_id: string
  conversation_id: string | null
  staff_id: string | null
  type: NotificationType
  target: NotificationTarget
  content: string
  is_read: boolean
  status: NotificationStatus
  created_at: string | null
  sent_at: string | null
}

type NotificationListParams = {
  limit?: number
  offset?: number
  is_read?: boolean
  target?: NotificationTarget
  status?: NotificationStatus
  lead_id?: string
  conversation_id?: string
  staff_id?: string
}

type NotificationListResponse = {
  items: NotificationItem[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

type UnreadNotificationCountResponse = {
  unread_count: number
}

export type {
  NotificationItem,
  NotificationListParams,
  NotificationListResponse,
  NotificationStatus,
  NotificationTarget,
  NotificationType,
  UnreadNotificationCountResponse,
}
