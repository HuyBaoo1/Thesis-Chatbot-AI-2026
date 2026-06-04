import ChatCitations from "@/features/chat/components/chat-citations"
import { formatTime } from "@/features/chat/chat-utils"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/types/chat-type"

type ChatMessageBubbleProps = {
  message: ChatMessage
}

const ChatMessageBubble = ({ message }: ChatMessageBubbleProps) => {
  const isUser = message.role === "USER"
  const isSystem = message.role === "SYSTEM"

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] whitespace-pre-wrap text-slate-500 shadow-sm wrap-anywhere">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div className={cn("flex", isUser ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[88%] rounded-[1.5rem] px-4 py-3 sm:max-w-[75%]",
          isUser
            ? "rounded-tl-sm border border-slate-200/80 bg-white text-slate-700 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]"
            : "rounded-tr-sm bg-slate-950 text-white shadow-[0_4px_12px_-4px_rgba(15,23,42,0.3)]"
        )}
      >
        <div className="max-h-72 overflow-y-auto pr-1">
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap wrap-anywhere">
            {message.content}
          </p>
          {!isUser ? (
            <ChatCitations citations={message.citations} tone="dark" />
          ) : null}
        </div>

        <p
          className={cn(
            "mt-2 text-right text-[10px]",
            isUser ? "text-slate-400" : "text-white/50"
          )}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}

export default ChatMessageBubble
