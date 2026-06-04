import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getConversationMessages } from "@/api/chat-api"
import ChatMessageBubble from "@/features/chat/components/chat-message-bubble"
import {
  getDisplayName,
  getInitials,
  getStatusClassName,
  getStatusLabel,
} from "@/features/chat/chat-utils"
import { cn } from "@/lib/utils"
import type { ChatConversation } from "@/types/chat-type"
import { useInfiniteQuery } from "@tanstack/react-query"
import { MessageCircle, Send } from "lucide-react"
import type { FormEvent } from "react"
import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

const MESSAGE_PAGE_SIZE = 30

type ChatThreadProps = {
  conversation: ChatConversation | null
  messageInput: string
  actionError: string | null
  isSending: boolean
  onMessageInputChange: (value: string) => void
  onSendMessage: () => void | Promise<void>
}

const ChatThread = ({
  conversation,
  messageInput,
  actionError,
  isSending,
  onMessageInputChange,
  onSendMessage,
}: ChatThreadProps) => {
  const { t } = useTranslation("chat")
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const previousScrollHeightRef = useRef<number | null>(null)
  const shouldPreserveScrollRef = useRef(false)
  const hasInitializedScrollRef = useRef(false)

  const activeConversationId = conversation?.id ?? null

  const messagesQuery = useInfiniteQuery({
    queryKey: ["admin-message-items", activeConversationId],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      getConversationMessages(activeConversationId as string, {
        before: pageParam,
        limit: MESSAGE_PAGE_SIZE,
      }),
    enabled: Boolean(activeConversationId),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_before ?? undefined,
  })

  const messages =
    messagesQuery.data?.pages
      .slice()
      .reverse()
      .flatMap((page) => page.items) ?? []

  useEffect(() => {
    hasInitializedScrollRef.current = false
    shouldPreserveScrollRef.current = false
    previousScrollHeightRef.current = null
  }, [activeConversationId])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

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
      if (activeConversationId && messagesQuery.isLoading) return
      container.scrollTop = container.scrollHeight
      hasInitializedScrollRef.current = true
      return
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [
    activeConversationId,
    isSending,
    messages.length,
    messagesQuery.isLoading,
  ])

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current
    if (!container) return

    if (
      container.scrollTop <= 80 &&
      messagesQuery.hasNextPage &&
      !messagesQuery.isFetchingNextPage
    ) {
      previousScrollHeightRef.current = container.scrollHeight
      shouldPreserveScrollRef.current = true
      void messagesQuery.fetchNextPage()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSendMessage()
  }

  if (!conversation) {
    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50/80">
        <div className="flex h-full flex-col items-center justify-center text-center">
          <MessageCircle className="mb-3 size-12 text-slate-200" />
          <p className="text-[13px] font-medium text-slate-600">
            {t("selectConversation")}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {t("chatWillAppearHere")}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50/80">
      {/* Thread header */}
      <div className="flex h-14.25 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-slate-950 text-[11px] font-semibold text-white">
              {getInitials(getDisplayName(conversation))}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-slate-950">
              {getDisplayName(conversation)}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {conversation.lead_email ||
                conversation.lead_phone ||
                t("webChatCustomer")}
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className={cn(
            "rounded-full text-[10px]",
            getStatusClassName(conversation.status)
          )}
        >
          {getStatusLabel(conversation.status)}
        </Badge>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#e2e8f0 transparent",
        }}
      >
        {messagesQuery.isFetchingNextPage ? (
          <div className="flex justify-center">
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] text-slate-500 shadow-sm">
              {t("loadingOlderMessages")}
            </div>
          </div>
        ) : null}

        {messagesQuery.isLoading ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-400 shadow-sm">
              {t("loadingChatHistory")}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[13px] text-slate-400">
            {t("noMessagesInThread")}
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessageBubble key={message.id} message={message} />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Action error */}
      {actionError ? (
        <div className="border-t border-red-100 bg-red-50/80 px-4 py-2 text-[12px] text-red-600">
          {actionError}
        </div>
      ) : null}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200/80 bg-white p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={messageInput}
            onChange={(event) => onMessageInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder={t("typeMessage")}
            rows={1}
            disabled={conversation.status === "CLOSED" || isSending}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[13px] transition outline-none focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          />
          <Button
            type="submit"
            size="icon"
            disabled={
              !messageInput.trim() ||
              conversation.status === "CLOSED" ||
              isSending
            }
            className="size-10 shrink-0 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-50"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </section>
  )
}

export default ChatThread
