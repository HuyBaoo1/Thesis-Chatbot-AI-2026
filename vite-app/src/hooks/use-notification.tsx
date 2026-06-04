import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query"

import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notification-api"
import type {
  NotificationItem,
  NotificationListResponse,
  NotificationTarget,
  UnreadNotificationCountResponse,
} from "@/types/notification-type"

type UseNotificationOptions = {
  enabled?: boolean
  staffId?: string
  target?: NotificationTarget
  limit?: number
}

type NotificationInfiniteData = InfiniteData<NotificationListResponse, number>
type NotificationListQueryData =
  | NotificationListResponse
  | NotificationInfiniteData

const isNotificationInfiniteData = (
  data: NotificationListQueryData | undefined
): data is NotificationInfiniteData =>
  Boolean(data && typeof data === "object" && "pages" in data)

const useNotification = ({
  enabled = true,
  staffId,
  target,
  limit = 8,
}: UseNotificationOptions) => {
  const queryClient = useQueryClient()

  const syncReadNotificationInCache = (notification: NotificationItem) => {
    queryClient
      .getQueryCache()
      .findAll({ queryKey: ["notifications"] })
      .forEach((query) => {
        queryClient.setQueryData<NotificationListQueryData>(
          query.queryKey,
          (data) => {
            if (!data) {
              return data
            }

            if (isNotificationInfiniteData(data)) {
              return {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.map((item) =>
                    item.id === notification.id ? notification : item
                  ),
                })),
              }
            }

            return {
              ...data,
              items: data.items.map((item) =>
                item.id === notification.id ? notification : item
              ),
            }
          }
        )
      })

    queryClient
      .getQueryCache()
      .findAll({ queryKey: ["notifications-unread-count"] })
      .forEach((query) => {
        queryClient.setQueryData<UnreadNotificationCountResponse>(
          query.queryKey,
          (data) =>
            data
              ? {
                  unread_count: Math.max(0, data.unread_count - 1),
                }
              : data
        )
      })
  }

  const syncReadAllNotificationsInCache = () => {
    queryClient
      .getQueryCache()
      .findAll({ queryKey: ["notifications"] })
      .forEach((query) => {
        queryClient.setQueryData<NotificationListQueryData>(
          query.queryKey,
          (data) => {
            if (!data) {
              return data
            }

            if (isNotificationInfiniteData(data)) {
              return {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.map((item) => ({
                    ...item,
                    is_read: true,
                  })),
                })),
              }
            }

            return {
              ...data,
              items: data.items.map((item) => ({
                ...item,
                is_read: true,
              })),
            }
          }
        )
      })

    queryClient
      .getQueryCache()
      .findAll({ queryKey: ["notifications-unread-count"] })
      .forEach((query) => {
        queryClient.setQueryData<UnreadNotificationCountResponse>(
          query.queryKey,
          (data) =>
            data
              ? {
                  unread_count: 0,
                }
              : data
        )
      })
  }

  const syncDeleteNotificationInCache = (notificationId: string) => {
    let deletedUnread = false

    queryClient
      .getQueryCache()
      .findAll({ queryKey: ["notifications"] })
      .forEach((query) => {
        queryClient.setQueryData<NotificationListQueryData>(
          query.queryKey,
          (data) => {
            if (!data) {
              return data
            }

            if (isNotificationInfiniteData(data)) {
              let found = false
              const nextPages = data.pages.map((page) => {
                const target = page.items.find(
                  (item) => item.id === notificationId
                )
                if (!target) {
                  return page
                }

                found = true
                if (!target.is_read) {
                  deletedUnread = true
                }

                return {
                  ...page,
                  items: page.items.filter(
                    (item) => item.id !== notificationId
                  ),
                }
              })

              if (!found) {
                return data
              }

              return {
                ...data,
                pages: nextPages.map((page) => ({
                  ...page,
                  total: Math.max(0, page.total - 1),
                })),
              }
            }

            const target = data.items.find((item) => item.id === notificationId)
            if (!target) {
              return data
            }

            if (!target.is_read) {
              deletedUnread = true
            }

            return {
              ...data,
              items: data.items.filter((item) => item.id !== notificationId),
              total: Math.max(0, data.total - 1),
            }
          }
        )
      })

    if (!deletedUnread) {
      return
    }

    queryClient
      .getQueryCache()
      .findAll({ queryKey: ["notifications-unread-count"] })
      .forEach((query) => {
        queryClient.setQueryData<UnreadNotificationCountResponse>(
          query.queryKey,
          (data) =>
            data
              ? {
                  unread_count: Math.max(0, data.unread_count - 1),
                }
              : data
        )
      })
  }

  const notificationsQuery = useInfiniteQuery({
    queryKey: ["notifications", staffId, target, limit],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getNotifications({
        limit,
        offset: pageParam,
        staff_id: staffId,
        target,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.offset + lastPage.limit : undefined,
    enabled,
  })

  const unreadCountQuery = useQuery({
    queryKey: ["notifications-unread-count", staffId, target],
    queryFn: () =>
      getUnreadNotificationCount({
        staff_id: staffId,
        target,
      }),
    enabled,
  })

  const markNotificationReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationRead(notificationId),
    onSuccess: syncReadNotificationInCache,
  })

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: () =>
      markAllNotificationsRead({
        staff_id: staffId,
        target,
      }),
    onSuccess: syncReadAllNotificationsInCache,
  })

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: (_result, notificationId) => {
      syncDeleteNotificationInCache(notificationId)
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
      void queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      })
    },
  })

  const notifications =
    notificationsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const notificationsHasMore = Boolean(notificationsQuery.hasNextPage)

  return {
    notifications,
    notificationsPending: notificationsQuery.isLoading,
    notificationsHasMore,
    loadMoreNotifications: notificationsQuery.fetchNextPage,
    loadMoreNotificationsPending: notificationsQuery.isFetchingNextPage,
    unreadCount: unreadCountQuery.data?.unread_count ?? 0,
    unreadCountPending: unreadCountQuery.isLoading,
    markNotificationRead: markNotificationReadMutation.mutateAsync,
    markNotificationReadPending: markNotificationReadMutation.isPending,
    markAllNotificationsRead: markAllNotificationsReadMutation.mutateAsync,
    markAllNotificationsReadPending: markAllNotificationsReadMutation.isPending,
    deleteNotification: deleteNotificationMutation.mutateAsync,
    deleteNotificationPending: deleteNotificationMutation.isPending,
  }
}

export default useNotification
