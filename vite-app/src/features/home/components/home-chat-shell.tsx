import { useEffect, useRef, useState } from "react"
import {
  Bot,
  Headset,
  SendHorizonal,
  Sparkles,
} from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { requestConversationStaffContact } from "@/api/chat-api"
import { Button } from "@/components/ui/button"
import ChatCitations from "@/features/chat/components/chat-citations"
import HomeLeadFormDialog from "@/features/home/components/home-lead-form-dialog"
import useChat from "@/hooks/use-chat"
import { formatDateTime } from "@/lib/date"
import type { InitLeadSchema } from "@/schemas/chat-schema"
import useLeadStore from "@/stores/lead-store"
import type { ChatMessage, ChatQueryResponse } from "@/types/chat-type"

type LatestChatLeadState = Pick<
  ChatQueryResponse,
  | "conversation_id"
  | "lead_temperature"
  | "lead_score"
  | "conversation_status"
  | "conversation_staff_id"
>

const HomeChatShell = () => {
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false)
  const [draftMessage, setDraftMessage] = useState("")
  const [pendingQuery, setPendingQuery] = useState("")
  const [chatError, setChatError] = useState<string | null>(null)
  const [staffContactFeedback, setStaffContactFeedback] = useState<{
    conversationId: string
    message: string
  } | null>(null)
  const [leadFollowUpQuestions, setLeadFollowUpQuestions] = useState<string[]>(
    []
  )
  const [latestChatLeadState, setLatestChatLeadState] =
    useState<LatestChatLeadState | null>(null)
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>(
    []
  )

  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const previousScrollHeightRef = useRef<number | null>(null)
  const shouldPreserveScrollRef = useRef(false)
  const hasInitializedScrollRef = useRef(false)
  const previousConversationStatusRef = useRef<string | null>(null)
  const tempMessageCounterRef = useRef(0)

  const { t } = useTranslation("home")

  const { leadData } = useLeadStore()

  const {
    initLead,
    initLeadPending,
    queryChat,
    queryChatPending,
    conversation,
    conversationPending,
    conversationMessages,
    conversationMessagesPending,
    fetchOlderConversationMessages,
    hasOlderConversationMessages,
    olderConversationMessagesPending,
  } = useChat()

  const flattenedMessages =
    conversationMessages?.pages
      .slice()
      .reverse()
      .flatMap((page) => page.items) ?? []

  const persistedMessageIds = new Set(
    flattenedMessages.map((message) => message.id)
  )

  const displayMessages = [
    ...flattenedMessages,
    ...optimisticMessages.filter(
      (message) => !persistedMessageIds.has(message.id)
    ),
  ]

  const chatPending = queryChatPending
  const activeConversationId =
    conversation?.id ??
    leadData?.conversation_id ??
    latestChatLeadState?.conversation_id ??
    null
  const latestLeadStateMatches =
    Boolean(activeConversationId) &&
    latestChatLeadState?.conversation_id === activeConversationId
  const effectiveLeadTemperature =
    conversation?.lead_temperature ??
    (latestLeadStateMatches ? latestChatLeadState?.lead_temperature : null)
  const effectiveConversationStatus =
    conversation?.status ??
    (latestLeadStateMatches ? latestChatLeadState?.conversation_status : null)
  const isHotLead = effectiveLeadTemperature === "HOT"
  const isCounselorChatActive = effectiveConversationStatus === "HANDOFF"
  const hasCounselorAssigned = isCounselorChatActive
  const isCounselorPending = false
  const shouldShowCounselorButton =
    Boolean(activeConversationId) &&
    isHotLead &&
    effectiveConversationStatus !== "CLOSED"
  const assignedCounselorName =
    conversation?.staff_name || t("chat.fallbackCounselorName")
  const activeChatLabel = isCounselorChatActive
    ? t("chat.counselorChattingWith", { name: assignedCounselorName })
    : isCounselorPending
      ? t("chat.aiWithCounselorInvited")
      : t("chat.chattingWithAI")
  const activeChatHint = isCounselorChatActive
    ? t("chat.counselorMessageBanner")
    : isCounselorPending
      ? t("chat.aiSupportPendingCounselor")
      : t("chat.aiDirectlySupporting")
  const scopedStaffContactFeedback =
    staffContactFeedback &&
    staffContactFeedback.conversationId === conversation?.id
      ? staffContactFeedback.message
      : null
  const counselorNotice = scopedStaffContactFeedback
    ? scopedStaffContactFeedback
    : isCounselorChatActive
      ? t("chat.counselorMonitoring", { name: assignedCounselorName })
      : isCounselorPending
        ? t("chat.counselorInvitedNotice", { name: assignedCounselorName })
        : null

  const requestCounselorMutation = useMutation({
    mutationFn: (conversationId: string) =>
      requestConversationStaffContact(conversationId, {
        leadId: leadData?.lead_id,
        conversationToken: leadData?.conversation_token,
      }),
    onSuccess: (updatedConversation, conversationId) => {
      setStaffContactFeedback({
        conversationId,
        message: t("chat.counselorRequestSent"),
      })
      setLatestChatLeadState({
        conversation_id: updatedConversation.id,
        lead_temperature: updatedConversation.lead_temperature,
        lead_score: updatedConversation.lead_score,
        conversation_status: updatedConversation.status,
        conversation_staff_id: updatedConversation.staff_id,
      })
    },
  })

  useEffect(() => {
    const container = messagesContainerRef.current

    if (!container) {
      return
    }

    if (
      shouldPreserveScrollRef.current &&
      previousScrollHeightRef.current !== null
    ) {
      const scrollDelta =
        container.scrollHeight - previousScrollHeightRef.current

      container.scrollTop = container.scrollTop + scrollDelta
      shouldPreserveScrollRef.current = false
      previousScrollHeightRef.current = null
      return
    }

    if (!hasInitializedScrollRef.current) {
      if (leadData?.conversation_id && conversationMessagesPending) {
        return
      }

      container.scrollTop = container.scrollHeight
      hasInitializedScrollRef.current = true
      return
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    })
  }, [
    conversationMessagesPending,
    displayMessages.length,
    leadData?.conversation_id,
    chatPending,
  ])

  useEffect(() => {
    const currentStatus = conversation?.status ?? null
    const previousStatus = previousConversationStatusRef.current

    if (
      previousStatus === "HANDOFF" &&
      currentStatus === "OPEN" &&
      conversation?.id
    ) {
      setStaffContactFeedback((current) =>
        current?.conversationId === conversation.id ? null : current
      )
    }

    previousConversationStatusRef.current = currentStatus
  }, [conversation?.id, conversation?.status])

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current

    if (!container) {
      return
    }

    if (
      container.scrollTop <= 80 &&
      hasOlderConversationMessages &&
      !olderConversationMessagesPending
    ) {
      previousScrollHeightRef.current = container.scrollHeight
      shouldPreserveScrollRef.current = true
      void fetchOlderConversationMessages()
    }
  }

  const createTempMessageIds = () => {
    tempMessageCounterRef.current += 1

    const tempId = tempMessageCounterRef.current

    return {
      userTempId: `local-user-${tempId}`,
      assistantTempId: `local-assistant-${tempId}`,
    }
  }

  const submitChat = async (
    message: string,
    leadId: string,
    conversationId?: string | null,
    conversationToken?: string | null
  ) => {
    setChatError(null)
    setLeadFollowUpQuestions([])

    const shouldCreateAssistantPlaceholder = conversation?.status !== "HANDOFF"
    const { userTempId, assistantTempId } = createTempMessageIds()

    setOptimisticMessages((current) => {
      const nextMessages: ChatMessage[] = [
        ...current,
        {
          id: userTempId,
          conversation_id: conversationId ?? "pending",
          role: "USER",
          content: message,
          intent: null,
          is_fallback: false,
          citations: [],
          created_at: null,
        },
      ]

      if (shouldCreateAssistantPlaceholder) {
        nextMessages.push({
          id: assistantTempId,
          conversation_id: conversationId ?? "pending",
          role: "ASSISTANT",
          content: "",
          intent: null,
          is_fallback: false,
          citations: [],
          created_at: null,
        })
      }

      return nextMessages
    })

    try {
      const response = await queryChat({
        lead_id: leadId,
        conversation_id: conversationId,
        conversation_token: conversationToken,
        query: message,
      })

      setLatestChatLeadState({
        conversation_id: response.conversation_id,
        lead_temperature: response.lead_temperature,
        lead_score: response.lead_score,
        conversation_status: response.conversation_status,
        conversation_staff_id: response.conversation_staff_id,
      })
      setLeadFollowUpQuestions(response.follow_up_suggestions ?? [])

      setOptimisticMessages((current) =>
        current
          .map((item) => {
            if (item.id === userTempId) {
              return {
                ...item,
                id: response.user_message_id,
                conversation_id: response.conversation_id,
                citations: [],
                created_at: response.created_at,
              }
            }

            if (item.id === assistantTempId) {
              if (!response.assistant_message_id) {
                return null
              }

              return {
                ...item,
                id: response.assistant_message_id,
                conversation_id: response.conversation_id,
                content: response.answer,
                intent: response.blocked ? "blocked" : null,
                is_fallback: response.confidence < 0.4,
                citations: response.citations ?? [],
                created_at: response.created_at,
              }
            }

            return item
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      )
    } catch {
      setChatError(t("chat.errorSend"))

      setOptimisticMessages((current) =>
        current.filter(
          (item) => item.id !== userTempId && item.id !== assistantTempId
        )
      )
    }
  }

  const handleSend = async (message = draftMessage) => {
    const trimmedMessage = message.trim()

    if (!trimmedMessage || chatPending) {
      return
    }

    if (!leadData?.lead_id) {
      setPendingQuery(trimmedMessage)
      setIsLeadDialogOpen(true)
      return
    }

    setDraftMessage("")
    await submitChat(
      trimmedMessage,
      leadData.lead_id,
      leadData.conversation_id,
      leadData.conversation_token
    )
  }

  const handleLeadSubmit = async (values: InitLeadSchema) => {
    try {
      const lead = await initLead(values)

      setIsLeadDialogOpen(false)

      if (pendingQuery) {
        const queuedMessage = pendingQuery

        setPendingQuery("")
        setDraftMessage("")
        await submitChat(queuedMessage, lead.lead_id, null, null)
      }
    } catch {
      setChatError(t("chat.errorCreateLead"))
    }
  }

  const handleRequestCounselor = async () => {
    const requestConversationId = activeConversationId

    if (!requestConversationId) {
      return
    }

    if (hasCounselorAssigned) {
      toast.info(
        isCounselorChatActive
          ? t("chat.counselorAlreadyChattingWith", {
              name: assignedCounselorName,
            })
          : t("chat.counselorAlreadyInvitedToChat", {
              name: assignedCounselorName,
            })
      )
      return
    }

    setChatError(null)

    try {
      await requestCounselorMutation.mutateAsync(requestConversationId)
      toast.success(t("chat.counselorRequestSuccessToast"))
    } catch {
      setChatError(t("chat.errorCounselor"))
      toast.error(t("chat.counselorRequestFailedToast"))
    }
  }

  const getMessageAuthor = (message: ChatMessage) => {
    if (message.role === "USER") {
      return leadData?.full_name || t("chat.you")
    }

    if (message.intent === "staff_reply") {
      return conversation?.staff_name || t("chat.counselor")
    }

    return t("chat.aiName")
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18),0_0_0_1px_rgba(255,255,255,0.8)_inset]">
        {/* ── Header ── */}
        <div className="relative flex items-center gap-3.5 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          {/* Gold accent line */}
          <div className="absolute inset-x-0 top-0 h-[2.5px] rounded-t-[2rem] bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
            <Bot className="h-4.5 w-4.5" />
            {/* Online indicator */}
            <span className="absolute -right-0.5 -bottom-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-950">
              {t("chat.title")}
            </h2>
            <p className="text-xs text-slate-400">{t("chat.subtitle")}</p>
          </div>

          <div
            className={`flex h-7 items-center gap-1.5 rounded-full border px-3 ${
              isCounselorChatActive
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : isCounselorPending
                  ? "border-amber-100 bg-amber-50 text-amber-700"
                  : "border-slate-100 bg-slate-50 text-slate-500"
            }`}
          >
            {isCounselorChatActive ? (
              <Headset className="h-3 w-3" />
            ) : (
              <Sparkles
                className={`h-3 w-3 ${
                  isCounselorPending ? "text-amber-600" : "text-[#d6ae4e]"
                }`}
              />
            )}
            <span className="text-[11px] font-medium">
              {isCounselorChatActive
                ? t("chat.counselorLabel")
                : isCounselorPending
                  ? t("chat.aiAndCounselorLabel")
                  : t("chat.aiLabel")}
            </span>
          </div>
        </div>

        {/* ── Messages ── */}
        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#e2e8f0 transparent",
          }}
        >
          {/* Conversation banner */}
          {leadData?.conversation_id ? (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/80">
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                  <span>
                    {conversationPending
                      ? t("chat.loadingConversation")
                      : t("chat.conversationSaved")}
                  </span>

                  {conversation?.status ? (
                    <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 normal-case ring-1 ring-slate-200">
                      {conversation.status}
                    </span>
                  ) : null}

                  {typeof conversation?.message_count === "number" ? (
                    <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 normal-case ring-1 ring-slate-200">
                      {t("chat.messagesCount", {
                        count: conversation.message_count,
                      })}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      isCounselorChatActive
                        ? "bg-emerald-100 text-emerald-700"
                        : isCounselorPending
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-900 text-white"
                    }`}
                  >
                    {isCounselorChatActive ? (
                      <Headset className="h-3 w-3" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {activeChatLabel}
                  </span>
                  <span className="text-[12px] text-slate-500">
                    {activeChatHint}
                  </span>
                </div>
              </div>

              {conversation?.summary ? (
                <p className="px-4 py-3 text-[13px] leading-relaxed text-slate-600">
                  {conversation.summary}
                </p>
              ) : null}

              {counselorNotice ? (
                <div className="m-3 mt-0 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] leading-relaxed text-emerald-700">
                  {counselorNotice}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Welcome message */}
          {!leadData?.conversation_id && !displayMessages.length ? (
            <div className="flex justify-start">
              <div className="max-w-[85%] sm:max-w-[72%]">
                <div className="mb-1.5 flex items-center gap-2 pl-1">
                  <span className="text-[11px] font-semibold text-slate-900">
                    {t("chat.aiName")}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {t("chat.readyLabel")}
                  </span>
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-slate-200/80 bg-white px-4 py-3 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]">
                  <p className="text-[14px] leading-relaxed text-slate-700">
                    {t("chat.welcomeIntro")}
                    <span className="font-medium text-slate-900">
                      {t("chat.welcomeHighlights.admissions")}
                    </span>
                    ,{" "}
                    <span className="font-medium text-slate-900">
                      {t("chat.welcomeHighlights.tuition")}
                    </span>
                    ,{" "}
                    <span className="font-medium text-slate-900">
                      {t("chat.welcomeHighlights.scholarship")}
                    </span>
                    {t("chat.welcomeAnd")}
                    <span className="font-medium text-slate-900">
                      {t("chat.welcomeHighlights.process")}
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Message list */}
          {displayMessages.map((message) => {
            const isAssistant = message.role === "ASSISTANT"
            const isStaffReply = message.intent === "staff_reply"

            return (
              <div
                key={message.id}
                className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[72%] ${isAssistant ? "" : ""}`}
                >
                  {/* Author + time */}
                  <div
                    className={`mb-1.5 flex items-center gap-2 ${isAssistant ? "pl-1" : "justify-end pr-1"}`}
                  >
                    <span
                      className={`text-[11px] font-semibold ${isAssistant ? "text-slate-900" : "text-slate-500"}`}
                    >
                      {getMessageAuthor(message)}
                    </span>
                    {message.created_at ? (
                      <span className="text-[11px] text-slate-400">
                        {formatDateTime(message.created_at)}
                      </span>
                    ) : null}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`px-4 py-3 text-[14px] leading-relaxed ${
                      isAssistant
                        ? isStaffReply
                          ? "rounded-2xl rounded-tl-sm border border-emerald-200/80 bg-emerald-50 text-emerald-900 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.08)]"
                          : "rounded-2xl rounded-tl-sm border border-slate-200/80 bg-white text-slate-700 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]"
                        : "rounded-2xl rounded-tr-sm bg-slate-950 text-white shadow-[0_4px_12px_-4px_rgba(15,23,42,0.3)]"
                    }`}
                  >
                    {message.content ? (
                      <>
                        <p className="wrap-anywhere whitespace-pre-wrap">
                          {message.content}
                        </p>
                        {isAssistant ? (
                          <ChatCitations citations={message.citations} tone="light" />
                        ) : null}
                      </>
                    ) : isAssistant ? (
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <span className="flex gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:300ms]" />
                        </span>
                        {t("chat.thinking")}
                      </span>
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Loading states */}
          {olderConversationMessagesPending ? (
            <div className="flex justify-center">
              <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500 shadow-sm">
                {t("chat.loadingOlder")}
              </div>
            </div>
          ) : null}

          {conversationMessagesPending ? (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-400 shadow-sm">
                {t("chat.loadingHistory")}
              </div>
            </div>
          ) : null}

          {/* Follow-up suggestions */}
          {leadFollowUpQuestions.length ? (
            <div className="rounded-xl border border-[#d6ae4e]/20 bg-[#fdf9ef] px-3 py-2.5">
              <div className="space-y-1.5">
                {leadFollowUpQuestions.map((question, index) => (
                  <div
                    key={question}
                    className="rounded-lg bg-white px-3 py-1.5 text-[12px] leading-snug text-slate-600 ring-1 ring-slate-200/80"
                  >
                    <span className="mr-2 font-semibold text-[#d6ae4e]">
                      {index + 1}.
                    </span>
                    {question}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input area ── */}
        <div className="border-t border-slate-100 bg-white/95 px-4 py-4 sm:px-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.1),0_0_0_1px_rgba(255,255,255,0.9)_inset] transition-shadow focus-within:border-slate-300 focus-within:shadow-[0_6px_20px_-6px_rgba(15,23,42,0.14)]">
            <textarea
              rows={2}
              value={draftMessage}
              placeholder={t("chat.placeholder")}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void handleSend()
                }
              }}
              className="w-full resize-none border-0 bg-transparent px-4 pt-3 pb-2 text-[14px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
            />

            <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              {/* Left actions */}
              <div className="flex items-center gap-1">
                <span className="hidden text-[11px] text-slate-400 sm:block">
                  {t("chat.enterToSend")}
                </span>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                {shouldShowCounselorButton ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`h-8 cursor-pointer rounded-xl px-3 text-[12px] font-medium ${
                      isCounselorChatActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    }`}
                    disabled={requestCounselorMutation.isPending}
                    onClick={() => {
                      void handleRequestCounselor()
                    }}
                  >
                    <Headset className="h-3.5 w-3.5" />
                    {requestCounselorMutation.isPending
                      ? t("chat.sending")
                      : isCounselorChatActive
                        ? t("chat.chatWithCounselor")
                        : isCounselorPending
                          ? t("chat.counselorInvited")
                          : t("chat.requestCounselor")}
                  </Button>
                ) : null}

                <Button
                  type="button"
                  size="sm"
                  className="h-8 cursor-pointer rounded-xl bg-slate-950 px-4 text-[12px] font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  disabled={chatPending || initLeadPending}
                  onClick={() => {
                    void handleSend()
                  }}
                >
                  {chatPending ? t("chat.sending") : t("chat.send")}
                  <SendHorizonal className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {chatError ? (
            <p className="mt-2 px-1 text-[12px] text-red-500">{chatError}</p>
          ) : null}
        </div>
      </div>

      <HomeLeadFormDialog
        open={isLeadDialogOpen}
        onOpenChange={setIsLeadDialogOpen}
        onSubmit={handleLeadSubmit}
        isSubmitting={initLeadPending}
      />
    </>
  )
}

export default HomeChatShell
