import {
  getLead,
  getLeadApplications,
  getLeadInterests,
  updateLead,
} from "@/api/lead-api"
import {
  createStaffMessage,
  getConversation,
  getConversations,
  updateConversationStatus,
} from "@/api/chat-api"
import LeadFormDialog from "@/features/lead/components/lead-form-dialog"
import ChatConversationSidebar from "@/features/chat/components/chat-conversation-sidebar"
import ChatDetailsPanel from "@/features/chat/components/chat-details-panel"
import ChatThread from "@/features/chat/components/chat-thread"
import { getErrorMessage } from "@/features/chat/chat-utils"
import useAuthStore from "@/stores/auth-store"
import type { ChatConversationStatus } from "@/types/chat-type"
import type { UpdateLeadPayload } from "@/types/lead-type"
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useDeferredValue, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

const PAGE_SIZE = 30

const ChatPage = () => {
  const { t } = useTranslation("chat")
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentUser = useAuthStore((state) => state.user)
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    ChatConversationStatus | "ALL"
  >("ALL")
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [leadDialogOpen, setLeadDialogOpen] = useState(false)
  const [messageInput, setMessageInput] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const appliedSearch = useDeferredValue(searchInput.trim())
  const requestedConversationId = searchParams.get("conversationId")

  const conversationsQuery = useInfiniteQuery({
    queryKey: [
      "admin-message-conversations",
      currentUser?.sub,
      appliedSearch,
      statusFilter,
    ],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      getConversations({
        limit: PAGE_SIZE,
        before: pageParam,
        q: appliedSearch || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        staff_id: currentUser?.sub,
      }),
    enabled: Boolean(currentUser?.sub),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_before ?? undefined,
  })

  const conversations =
    conversationsQuery.data?.pages.flatMap((page) => page.items) ?? []

  const directConversationQuery = useQuery({
    queryKey: ["admin-message-direct-conversation", requestedConversationId],
    queryFn: () => getConversation(requestedConversationId as string),
    enabled:
      Boolean(requestedConversationId) &&
      !conversations.some((item) => item.id === requestedConversationId),
    retry: false,
  })

  const mergedConversations =
    directConversationQuery.data &&
    !conversations.some((item) => item.id === directConversationQuery.data?.id)
      ? [directConversationQuery.data, ...conversations]
      : conversations

  const effectiveConversationId =
    requestedConversationId ?? selectedConversationId
  const selectedConversation =
    mergedConversations.find((item) => item.id === effectiveConversationId) ??
    mergedConversations[0] ??
    null
  const selectedLeadId = selectedConversation?.lead_id ?? null

  const leadDetailQuery = useQuery({
    queryKey: ["chat-lead-detail", selectedLeadId],
    queryFn: () => getLead(selectedLeadId as string),
    enabled: Boolean(selectedLeadId) && leadDialogOpen,
  })

  const leadInterestsQuery = useQuery({
    queryKey: ["chat-lead-interests", selectedLeadId],
    queryFn: () => getLeadInterests(selectedLeadId as string),
    enabled: Boolean(selectedLeadId) && leadDialogOpen,
  })

  const leadApplicationsQuery = useQuery({
    queryKey: ["chat-lead-applications", selectedLeadId],
    queryFn: () =>
      getLeadApplications(selectedLeadId as string, { limit: 10, offset: 0 }),
    enabled: Boolean(selectedLeadId) && leadDialogOpen,
  })

  const sendMessageMutation = useMutation({
    mutationFn: ({
      conversationId,
      content,
    }: {
      conversationId: string
      content: string
    }) => createStaffMessage(conversationId, content),
    onSuccess: () => {
      setMessageInput("")
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({
      conversationId,
      status,
    }: {
      conversationId: string
      status: ChatConversationStatus
    }) => updateConversationStatus(conversationId, status),
  })

  const updateLeadMutation = useMutation({
    mutationFn: ({
      leadId,
      values,
    }: {
      leadId: string
      values: UpdateLeadPayload
    }) => updateLead(leadId, values),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["chat-lead-detail", data.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["chat-lead-interests", data.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["chat-lead-applications", data.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-message-conversations"],
        }),
      ])
    },
  })

  const handleSendMessage = async () => {
    const activeConversationId = selectedConversation?.id ?? null
    const content = messageInput.trim()
    if (!activeConversationId || !content) return

    setActionError(null)
    try {
      await sendMessageMutation.mutateAsync({
        conversationId: activeConversationId,
        content,
      })
    } catch (error) {
      setActionError(getErrorMessage(error, t("sendError")))
    }
  }

  const handleStatusChange = async (status: ChatConversationStatus) => {
    const activeConversationId = selectedConversation?.id ?? null
    if (!activeConversationId) return

    setActionError(null)
    try {
      await statusMutation.mutateAsync({
        conversationId: activeConversationId,
        status,
      })
    } catch (error) {
      setActionError(getErrorMessage(error, t("statusUpdateError")))
    }
  }

  const handleSaveLead = async (values: UpdateLeadPayload) => {
    if (!selectedLeadId) return
    await updateLeadMutation.mutateAsync({ leadId: selectedLeadId, values })
  }

  return (
    <div className="grid h-full min-h-0 w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] lg:grid-cols-[21rem_minmax(0,1fr)_18rem]">
      <ChatConversationSidebar
        conversations={mergedConversations}
        isLoading={conversationsQuery.isLoading}
        isFetchingMore={conversationsQuery.isFetchingNextPage}
        hasMore={conversationsQuery.hasNextPage}
        total={conversationsQuery.data?.pages[0]?.total ?? 0}
        searchInput={searchInput}
        statusFilter={statusFilter}
        selectedConversationId={selectedConversation?.id ?? null}
        onLoadMore={() => {
          void conversationsQuery.fetchNextPage()
        }}
        onSearchInputChange={setSearchInput}
        onStatusFilterChange={setStatusFilter}
        onSelectConversation={(conversationId) => {
          setSelectedConversationId(conversationId)
          setSearchParams(
            (currentParams) => {
              const nextParams = new URLSearchParams(currentParams)
              nextParams.set("conversationId", conversationId)
              return nextParams
            },
            { replace: true }
          )
        }}
      />

      <ChatThread
        conversation={selectedConversation}
        messageInput={messageInput}
        actionError={actionError}
        isSending={sendMessageMutation.isPending}
        onMessageInputChange={setMessageInput}
        onSendMessage={handleSendMessage}
      />

      <ChatDetailsPanel
        conversation={selectedConversation}
        onOpenLead={() => setLeadDialogOpen(true)}
        onStatusChange={handleStatusChange}
      />

      <LeadFormDialog
        open={leadDialogOpen}
        lead={leadDetailQuery.data}
        leadPending={leadDetailQuery.isLoading}
        leadFetching={leadDetailQuery.isFetching}
        interests={leadInterestsQuery.data?.items ?? []}
        interestsPending={leadInterestsQuery.isLoading}
        applications={leadApplicationsQuery.data?.items ?? []}
        applicationsPending={leadApplicationsQuery.isLoading}
        savePending={updateLeadMutation.isPending}
        errorMessage={
          updateLeadMutation.error
            ? getErrorMessage(
                updateLeadMutation.error,
                t("leadUpdateError")
              )
            : null
        }
        onOpenChange={setLeadDialogOpen}
        onSave={handleSaveLead}
      />
    </div>
  )
}

export default ChatPage
