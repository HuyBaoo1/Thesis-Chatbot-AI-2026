import type { ChatCitation } from "@/types/chat-type"
import { cn } from "@/lib/utils"

type ChatCitationsProps = {
  citations?: ChatCitation[]
  tone?: "light" | "dark"
}

const ChatCitations = ({
  citations = [],
  tone = "light",
}: ChatCitationsProps) => {
  if (!citations.length) {
    return null
  }

  return (
    <div
      className={cn(
        "mt-2.5 border-t pt-2.5",
        tone === "dark" ? "border-white/10" : "border-slate-200/80"
      )}
    >
      <p
        className={cn(
          "mb-1.5 text-[10px] font-medium tracking-[0.08em] uppercase",
          tone === "dark" ? "text-white/55" : "text-slate-500"
        )}
      >
        Nguon tham khao
      </p>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((citation) => (
          <a
            key={citation.url}
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            title={citation.url}
            className={cn(
              "max-w-full rounded-full border px-2 py-0.5 text-[10px] transition hover:-translate-y-0.5",
              "overflow-hidden text-ellipsis whitespace-nowrap",
              tone === "dark"
                ? "border-white/15 bg-white/8 text-white/90 hover:bg-white/14"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            )}
          >
            {citation.url}
          </a>
        ))}
      </div>
    </div>
  )
}

export default ChatCitations
