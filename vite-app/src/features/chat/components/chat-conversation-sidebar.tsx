import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  formatTime,
  getDisplayName,
  getInitials,
  getStatusClassName,
  getStatusLabel,
  statusOptions,
} from "@/features/chat/chat-utils"
import { cn } from "@/lib/utils"
import type {
  ChatConversation,
  ChatConversationStatus,
} from "@/types/chat-type"
import { MessageCircle, MoreHorizontal, Search } from "lucide-react"
import { useRef } from "react"
import { useTranslation } from "react-i18next"

type ChatConversationSidebarProps = {
  conversations: ChatConversation[]
  isLoading: boolean
  isFetchingMore: boolean
  hasMore: boolean | undefined
  total: number
  searchInput: string
  statusFilter: ChatConversationStatus | "ALL"
  selectedConversationId: string | null
  onLoadMore: () => void
  onSearchInputChange: (value: string) => void
  onStatusFilterChange: (value: ChatConversationStatus | "ALL") => void
  onSelectConversation: (conversationId: string) => void
}

const ChatConversationSidebar = ({
  conversations,
  isLoading,
  isFetchingMore,
  hasMore,
  total,
  searchInput,
  statusFilter,
  selectedConversationId,
  onLoadMore,
  onSearchInputChange,
  onStatusFilterChange,
  onSelectConversation,
}: ChatConversationSidebarProps) => {
  const { t } = useTranslation("chat")
  const containerRef = useRef<HTMLDivElement | null>(null)

  const handleScroll = () => {
    const container = containerRef.current
    if (!container || !hasMore || isFetchingMore) return

    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight

    if (distanceToBottom <= 120) {
      onLoadMore()
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-[14px] font-semibold text-slate-950">
              {t("sidebarTitle")}
            </h1>
            <p className="text-[11px] text-slate-500">{t("conversationCount", { count: total })}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-xl text-slate-400 hover:text-slate-700"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            placeholder={t("sidebarSearchPlaceholder")}
            className="h-9 rounded-full border-slate-200 bg-slate-100/80 pl-8 text-[12px] shadow-none placeholder:text-slate-400 focus:bg-white focus-visible:ring-0"
          />
        </div>

        {/* Status filters */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={statusFilter === option.value ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-7 shrink-0 rounded-full px-3 text-[11px] font-medium",
                statusFilter === option.value
                  ? "bg-slate-950 text-white hover:bg-slate-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
              onClick={() => onStatusFilterChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#e2e8f0 transparent",
        }}
      >
        {isLoading ? (
          <ConversationPlaceholder />
        ) : conversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <MessageCircle className="mb-3 size-10 text-slate-200" />
            <p className="text-[13px] font-medium text-slate-700">
              {t("noConversationsSidebar")}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {t("noConversationsSidebarHint")}
            </p>
          </div>
        ) : (
          <>
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelectConversation(conversation.id)}
                className={cn(
                  "flex w-full gap-3 border-b border-slate-100 px-3 py-3 text-left transition-colors hover:bg-slate-50/80",
                  selectedConversationId === conversation.id &&
                    "bg-slate-100 hover:bg-slate-100"
                )}
              >
                <Avatar className="size-10 shrink-0">
                  <AvatarFallback className="bg-slate-950 text-[12px] font-semibold text-white">
                    {getInitials(getDisplayName(conversation))}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-slate-950">
                      {getDisplayName(conversation)}
                    </p>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {formatTime(
                        conversation.last_message_at || conversation.updated_at
                      )}
                    </span>
                  </div>

                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {conversation.last_message ||
                      conversation.summary ||
                      t("noMessages")}
                  </p>

                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full text-[10px]",
                        getStatusClassName(conversation.status)
                      )}
                    >
                      {getStatusLabel(conversation.status)}
                    </Badge>
                    <span className="text-[10px] text-slate-400">
                      {t("messageCount", { count: conversation.message_count })}
                    </span>
                  </div>
                </div>
              </button>
            ))}

            {isFetchingMore ? (
              <div className="px-3 py-4 text-center text-[11px] text-slate-400">
                {t("loadingMoreConversations")}
              </div>
            ) : null}
          </>
        )}
      </div>
    </aside>
  )
}

const ConversationPlaceholder = () => (
  <div className="space-y-1 p-2">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="flex gap-3 rounded-xl p-3">
        <div className="size-10 shrink-0 rounded-full bg-slate-100" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-2/3 rounded-full bg-slate-100" />
          <div className="h-3 w-full rounded-full bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
)

export default ChatConversationSidebar
