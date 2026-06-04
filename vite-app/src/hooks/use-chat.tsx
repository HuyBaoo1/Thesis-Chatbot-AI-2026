import { useEffect } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import {
  getConversation,
  getConversationMessages,
  initLead,
  queryChat,
} from "@/api/chat-api"
import useRealtime from "@/hooks/use-realtime"
import useLeadStore from "@/stores/lead-store"
import type {
  ChatConversation,
  ChatQueryResponse,
  ChatQueryRequest,
  LeadInitRequest,
} from "@/types/chat-type"

const useChat = () => {
  const { setLeadData, updateLeadData, leadData } = useLeadStore()
  const queryClient = useQueryClient()
  const leadId = leadData?.lead_id ?? null
  const conversationId = leadData?.conversation_id ?? null
  const conversationToken = leadData?.conversation_token ?? null

  useRealtime({
    enabled: Boolean(conversationId && conversationToken),
    conversationId,
    conversationToken,
  })

  const initLeadMutation = useMutation({
    mutationFn: (data: LeadInitRequest) => initLead(data),
    onSuccess: (data) => {
      setLeadData({
        lead_id: data.lead_id,
        full_name: data.full_name,
        conversation_id: null,
        conversation_token: null,
      })
    },
  })

  const chatQueryMutation = useMutation({
    mutationFn: (data: ChatQueryRequest) =>
      queryChat({
        ...data,
        source_domain: data.source_domain ?? leadData?.source_domain ?? null,
      }),
    onSuccess: (data) => {
      updateLeadData({
        conversation_id: data.conversation_id,
        conversation_token: data.conversation_token,
      })
      syncConversationLeadState(queryClient, data)
    },
  })

  const conversationQuery = useQuery<ChatConversation>({
    queryKey: ["chat-conversation", conversationId],
    queryFn: () =>
      getConversation(conversationId as string, {
        leadId,
        conversationToken,
      }),
    enabled: Boolean(conversationId),
  })

  const conversationMessagesInfiniteQuery = useInfiniteQuery({
    queryKey: ["chat-conversation-messages", conversationId],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      getConversationMessages(conversationId as string, {
        before: pageParam,
        limit: 10,
        leadId,
        conversationToken,
      }),
    enabled: Boolean(conversationId),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_before ?? undefined,
  })

  useEffect(() => {
    if (
      conversationQuery.data?.conversation_token &&
      conversationQuery.data.conversation_token !== conversationToken
    ) {
      updateLeadData({
        conversation_token: conversationQuery.data.conversation_token,
      })
    }
  }, [conversationQuery.data?.conversation_token, conversationToken, updateLeadData])

  return {
    initLead: initLeadMutation.mutateAsync,
    initLeadPending: initLeadMutation.isPending,

    queryChat: chatQueryMutation.mutateAsync,
    queryChatPending: chatQueryMutation.isPending,

    conversation: conversationQuery.data,
    conversationPending: conversationQuery.isLoading,
    conversationError: conversationQuery.error,
    refetchConversation: conversationQuery.refetch,

    conversationMessages: conversationMessagesInfiniteQuery.data,
    conversationMessagesPending: conversationMessagesInfiniteQuery.isLoading,
    conversationMessagesError: conversationMessagesInfiniteQuery.error,
    refetchConversationMessages: conversationMessagesInfiniteQuery.refetch,
    fetchOlderConversationMessages:
      conversationMessagesInfiniteQuery.fetchNextPage,
    hasOlderConversationMessages: conversationMessagesInfiniteQuery.hasNextPage,
    olderConversationMessagesPending:
      conversationMessagesInfiniteQuery.isFetchingNextPage,
  }
}

const syncConversationLeadState = (
  queryClient: QueryClient,
  data: ChatQueryResponse
) => {
  queryClient.setQueryData<ChatConversation>(
    ["chat-conversation", data.conversation_id],
    (conversation) =>
      conversation
        ? {
            ...conversation,
            lead_temperature:
              data.lead_temperature ?? conversation.lead_temperature,
            lead_score: data.lead_score ?? conversation.lead_score,
            status: data.conversation_status ?? conversation.status,
            staff_id: data.conversation_staff_id ?? conversation.staff_id,
          }
        : conversation
  )
}

export default useChat
