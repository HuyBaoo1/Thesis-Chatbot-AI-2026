import { useEffect, useRef } from "react"
import {
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query"

import { buildRealtimeUrl, setWsAuthCookie } from "@/lib/realtime"
import type {
  ChatConversation,
  ChatConversationsPage,
  ChatMessage,
  ChatMessagesPage,
} from "@/types/chat-type"
import type {
  NotificationItem,
  NotificationListResponse,
  UnreadNotificationCountResponse,
} from "@/types/notification-type"

type RealtimePayload = {
  conversation_id?: string | null
  conversation?: ChatConversation
  messages?: ChatMessage[]
  notification?: NotificationItem
  staff_id?: string | null
  target?: NotificationItem["target"]
  read_all?: boolean
}

type RealtimeEvent = {
  id?: string
  type: string
  payload?: RealtimePayload
}

type NotificationListQueryData =
  | NotificationListResponse
  | InfiniteData<NotificationListResponse, number>

const isNotificationInfiniteData = (
  data: NotificationListQueryData | undefined
): data is InfiniteData<NotificationListResponse, number> =>
  Boolean(data && typeof data === "object" && "pages" in data)

type UseRealtimeOptions = {
  enabled?: boolean
  token?: string | null
  conversationId?: string | null
  conversationToken?: string | null
}

const RECONNECT_DELAY_MS = 3000

const useRealtime = ({
  enabled = true,
  token,
  conversationId,
  conversationToken,
}: UseRealtimeOptions = {}) => {
  const queryClient = useQueryClient()
  const seenEventIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled) {
      return
    }

    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof window.setTimeout> | null = null
    let closedByEffect = false

    const connect = () => {
      const path = conversationId
        ? `realtime/conversations/${conversationId}/ws`
        : "realtime/ws"
      const staffToken = token?.trim() ? token : undefined

      if (staffToken && !conversationToken) {
        setWsAuthCookie(staffToken)
      }
      socket = new WebSocket(
        buildRealtimeUrl(path, {
          conversation_token: conversationToken,
          token: staffToken,
        })
      )

      socket.onmessage = (event) => {
        try {
          const realtimeEvent = JSON.parse(event.data) as RealtimeEvent

          if (realtimeEvent.id) {
            const seenEventIds = seenEventIdsRef.current
            if (seenEventIds.has(realtimeEvent.id)) {
              return
            }
            if (seenEventIds.size > 500) {
              seenEventIds.clear()
            }
            seenEventIds.add(realtimeEvent.id)
          }

          handleRealtimeEvent(queryClient, realtimeEvent)
        } catch {
          // Ignore malformed realtime payloads and keep the socket alive.
        }
      }

      socket.onclose = () => {
        if (closedByEffect) {
          return
        }

        reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    connect()

    return () => {
      closedByEffect = true
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
      }
      socket?.close()
    }
  }, [conversationId, conversationToken, enabled, queryClient, token])
}

const handleRealtimeEvent = (
  queryClient: QueryClient,
  event: RealtimeEvent
) => {
  if (event.type.startsWith("chat.")) {
    handleChatEvent(queryClient, event)
    return
  }

  if (event.type.startsWith("notification.")) {
    handleNotificationEvent(queryClient, event)
  }
}

const handleChatEvent = (queryClient: QueryClient, event: RealtimeEvent) => {
  const payload = event.payload ?? {}
  const conversationId = payload.conversation_id ?? payload.conversation?.id
  let handled = false

  if (payload.conversation) {
    syncConversation(queryClient, payload.conversation)
    handled = true
  }

  if (payload.messages?.length) {
    payload.messages.forEach((message) => {
      appendMessage(queryClient, message)
    })
    handled = true
  }

  if (!handled) {
    fallbackInvalidateChat(queryClient, conversationId)
  }
}

const handleNotificationEvent = (
  queryClient: QueryClient,
  event: RealtimeEvent
) => {
  const payload = event.payload ?? {}

  if (payload.notification) {
    syncNotification(queryClient, payload.notification)
  }

  if (payload.read_all) {
    markNotificationListsRead(queryClient, payload)
  }

  if (payload.notification) {
    syncNotificationUnreadCount(queryClient, payload.notification)
  }
}

const appendMessage = (queryClient: QueryClient, message: ChatMessage) => {
  const queryKeys = [
    ["admin-message-items", message.conversation_id],
    ["chat-conversation-messages", message.conversation_id],
  ] as const

  queryKeys.forEach((queryKey) => {
    queryClient.setQueryData<InfiniteData<ChatMessagesPage, string | null>>(
      queryKey,
      (data) => appendMessageToPages(data, message)
    )
  })
}

const appendMessageToPages = (
  data: InfiniteData<ChatMessagesPage, string | null> | undefined,
  message: ChatMessage
) => {
  if (!data || data.pages.length === 0) {
    return data
  }

  const alreadyExists = data.pages.some((page) =>
    page.items.some((item) => item.id === message.id)
  )
  if (alreadyExists) {
    return data
  }

  return {
    ...data,
    pages: data.pages.map((page, index) => ({
      ...page,
      total: page.total + 1,
      items: index === 0 ? [...page.items, message] : page.items,
    })),
  }
}

const syncConversation = (
  queryClient: QueryClient,
  conversation: ChatConversation
) => {
  queryClient.setQueryData(["chat-conversation", conversation.id], conversation)
  queryClient.setQueryData(
    ["admin-message-direct-conversation", conversation.id],
    conversation
  )

  queryClient
    .getQueryCache()
    .findAll({ queryKey: ["admin-message-conversations"] })
    .forEach((query) => {
      queryClient.setQueryData<
        InfiniteData<ChatConversationsPage, string | null>
      >(query.queryKey, (data) =>
        syncConversationInPages(
          data,
          conversation,
          shouldConversationStayInQuery(conversation, query.queryKey)
        )
      )
    })
}

const syncConversationInPages = (
  data: InfiniteData<ChatConversationsPage, string | null> | undefined,
  conversation: ChatConversation,
  shouldInclude: boolean
) => {
  if (!data || data.pages.length === 0) {
    return data
  }

  let existed = false
  const pagesWithoutConversation = data.pages.map((page) => {
    const items = page.items.filter((item) => item.id !== conversation.id)
    if (items.length !== page.items.length) {
      existed = true
    }
    return {
      ...page,
      items,
    }
  })

  if (!shouldInclude) {
    if (!existed) {
      return data
    }

    return {
      ...data,
      pages: pagesWithoutConversation.map((page) => ({
        ...page,
        total: Math.max(0, page.total - 1),
      })),
    }
  }

  const [firstPage, ...restPages] = pagesWithoutConversation
  if (!firstPage) {
    return data
  }

  const delta = existed ? 0 : 1
  return {
    ...data,
    pages: [
      {
        ...firstPage,
        items: [conversation, ...firstPage.items].sort(
          compareConversationsDesc
        ),
      },
      ...restPages,
    ].map((page) => ({
      ...page,
      total: page.total + delta,
    })),
  }
}

const shouldConversationStayInQuery = (
  conversation: ChatConversation,
  queryKey: readonly unknown[]
) => {
  const staffId = typeof queryKey[1] === "string" ? queryKey[1] : null
  const search = typeof queryKey[2] === "string" ? queryKey[2].trim() : ""
  const status = typeof queryKey[3] === "string" ? queryKey[3] : "ALL"

  if (staffId && conversation.staff_id !== staffId) {
    return false
  }

  if (status !== "ALL" && conversation.status !== status) {
    return false
  }

  if (!search) {
    return true
  }

  const normalizedSearch = search.toLowerCase()
  const searchableText = [
    conversation.lead_full_name,
    conversation.lead_email,
    conversation.lead_phone,
    conversation.summary,
    conversation.last_message,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase()

  return searchableText.includes(normalizedSearch)
}

const compareConversationsDesc = (
  left: ChatConversation,
  right: ChatConversation
) => getConversationTime(right) - getConversationTime(left)

const getConversationTime = (conversation: ChatConversation) =>
  Date.parse(
    conversation.last_message_at ??
      conversation.updated_at ??
      conversation.created_at ??
      ""
  ) || 0

const syncNotification = (
  queryClient: QueryClient,
  notification: NotificationItem
) => {
  queryClient
    .getQueryCache()
    .findAll({ queryKey: ["notifications"] })
    .forEach((query) => {
      if (!matchesNotificationListQuery(query.queryKey, notification)) {
        return
      }

      queryClient.setQueryData<NotificationListQueryData>(
        query.queryKey,
        (data) => syncNotificationInList(data, notification)
      )
    })
}

const syncNotificationInList = (
  data: NotificationListQueryData | undefined,
  notification: NotificationItem
) => {
  if (!data) {
    return data
  }

  if (isNotificationInfiniteData(data)) {
    let exists = false
    const nextPages = data.pages.map((page) => {
      const existingIndex = page.items.findIndex(
        (item) => item.id === notification.id
      )

      if (existingIndex >= 0) {
        exists = true
        return {
          ...page,
          items: page.items.map((item) =>
            item.id === notification.id ? notification : item
          ),
        }
      }

      return page
    })

    if (exists) {
      return {
        ...data,
        pages: nextPages,
      }
    }

    const [firstPage, ...restPages] = nextPages
    if (!firstPage) {
      return data
    }

    return {
      ...data,
      pages: [
        {
          ...firstPage,
          items: [notification, ...firstPage.items].slice(0, firstPage.limit),
          total: firstPage.total + 1,
        },
        ...restPages.map((page) => ({
          ...page,
          total: page.total + 1,
        })),
      ],
    }
  }

  const existingIndex = data.items.findIndex(
    (item) => item.id === notification.id
  )
  const items =
    existingIndex >= 0
      ? data.items.map((item) =>
          item.id === notification.id ? notification : item
        )
      : [notification, ...data.items].slice(0, data.limit)

  return {
    ...data,
    total: existingIndex >= 0 ? data.total : data.total + 1,
    items,
  }
}

const markNotificationListsRead = (
  queryClient: QueryClient,
  payload: RealtimePayload
) => {
  queryClient
    .getQueryCache()
    .findAll({ queryKey: ["notifications"] })
    .forEach((query) => {
      if (!matchesNotificationListQuery(query.queryKey, payload)) {
        return
      }

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
      if (!matchesUnreadCountQuery(query.queryKey, payload)) {
        return
      }

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

const matchesNotificationListQuery = (
  queryKey: readonly unknown[],
  source:
    | Pick<RealtimePayload, "staff_id" | "target">
    | Pick<NotificationItem, "staff_id" | "target">
) => {
  const staffId = typeof queryKey[1] === "string" ? queryKey[1] : undefined
  const target = typeof queryKey[2] === "string" ? queryKey[2] : undefined

  if (staffId && source.staff_id !== staffId) {
    return false
  }

  if (target && source.target !== target) {
    return false
  }

  return true
}

const syncNotificationUnreadCount = (
  queryClient: QueryClient,
  notification: NotificationItem
) => {
  queryClient
    .getQueryCache()
    .findAll({ queryKey: ["notifications-unread-count"] })
    .forEach((query) => {
      if (!matchesUnreadCountQuery(query.queryKey, notification)) {
        return
      }

      queryClient.setQueryData<UnreadNotificationCountResponse>(
        query.queryKey,
        (data) => {
          if (!data) {
            return data
          }

          const delta = notification.is_read ? -1 : 1
          return {
            unread_count: Math.max(0, data.unread_count + delta),
          }
        }
      )
    })
}

const matchesUnreadCountQuery = (
  queryKey: readonly unknown[],
  source:
    | Pick<RealtimePayload, "staff_id" | "target">
    | Pick<NotificationItem, "staff_id" | "target">
) => {
  const staffId = typeof queryKey[1] === "string" ? queryKey[1] : undefined
  const target = typeof queryKey[2] === "string" ? queryKey[2] : undefined

  if (staffId && source.staff_id !== staffId) {
    return false
  }

  if (target && source.target !== target) {
    return false
  }

  return true
}

const fallbackInvalidateChat = (
  queryClient: QueryClient,
  conversationId?: string | null
) => {
  void queryClient.invalidateQueries({
    queryKey: ["admin-message-conversations"],
  })

  if (!conversationId) {
    return
  }

  void queryClient.invalidateQueries({
    queryKey: ["admin-message-items", conversationId],
  })
  void queryClient.invalidateQueries({
    queryKey: ["admin-message-direct-conversation", conversationId],
  })
  void queryClient.invalidateQueries({
    queryKey: ["chat-conversation", conversationId],
  })
  void queryClient.invalidateQueries({
    queryKey: ["chat-conversation-messages", conversationId],
  })
}

export default useRealtime
