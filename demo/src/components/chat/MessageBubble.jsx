import { Bot, BookOpen, Sparkles } from 'lucide-react';
import { formatRelativeTime } from "../../lib/utils";

const CTA_GRADIENT = "linear-gradient(180deg, var(--color-vinuni-red) 0%, var(--color-vinuni-red-dark) 100%)";

function stripMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
}

export function MessageBubble({ msg, nameInput, t, setInput }) {
  const isUser = msg.role === "user";
  const isError = msg.role === "error";

  if (isError) {
    return (
      <div
        className="rounded-xl border border-[var(--color-vinuni-red)]/20 bg-[var(--color-vinuni-red-light)] px-4 py-3 text-center text-sm font-medium"
        style={{ color: "var(--color-vinuni-red-dark)" }}
      >
        {msg.content}
      </div>
    );
  }

  const cleanContent = isUser
    ? msg.content
    : (msg.content || "")
        .replace(/\[SOURCE\s+\d+\]/gi, "")
        .replace(/\s+\./g, ".")
        .trim();

  return (
    <div className={`flex items-end gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      {isUser ? (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-lg"
          style={{ background: CTA_GRADIENT }}
        >
          {nameInput?.[0]?.toUpperCase() || "U"}
        </div>
      ) : (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
          style={{ backgroundColor: "var(--color-vinuni-red-light)" }}
        >
          <Bot className="h-5 w-5" style={{ color: "var(--color-vinuni-gold-light)" }} />
        </div>
      )}

      {/* Bubble + meta */}
      <div className={`flex max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-5 py-3 text-[14px] leading-relaxed shadow-sm ${
            isUser
              ? "rounded-br-md text-white"
              : "rounded-bl-md border-l-4 bg-white"
          }`}
          style={
            isUser
              ? { background: CTA_GRADIENT, boxShadow: "0 10px 24px -14px rgba(200,16,46,0.65)" }
              : {
                  borderLeftColor: "var(--color-vinuni-red)",
                  color: "var(--color-vinuni-navy)",
                  boxShadow: "0 1px 2px rgba(10,37,64,0.04),0 10px 24px -18px rgba(10,37,64,0.28)",
                }
          }
        >
          <p className="whitespace-pre-wrap">{cleanContent}</p>
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-4 w-full rounded-xl border border-[var(--color-vinuni-line)] bg-[var(--color-vinuni-light-gray)] p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-vinuni-red)" }}>
              <BookOpen className="h-4 w-4" />
              {t('chat.sources.title')}
            </p>
            <div className="space-y-2">
              {msg.sources.slice(0, 3).map((src, j) => (
                <div key={j} className="rounded-lg border border-[var(--color-vinuni-line)]/50 bg-white px-3 py-2">
                  {src.category && (
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-vinuni-red)" }}>
                      {src.category}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-vinuni-body)" }}>
                    {stripMarkdown(src.content?.slice(0, 200) || src.source?.slice(0, 200) || "")}
                  </p>
                  {src.score !== undefined && src.score > 0 && (
                    <p className="mt-1 text-xs" style={{ color: "var(--color-vinuni-muted)" }}>
                      {t('chat.sources.relevance')}: {Math.round(src.score * 100)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up suggestions */}
        {!isUser && msg.follow_up_suggestions && msg.follow_up_suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {msg.follow_up_suggestions.slice(0, 3).map((suggestion, k) => (
              <button
                key={k}
                onClick={() => setInput(suggestion)}
                className="flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-vinuni-red)]/30 hover:bg-[var(--color-vinuni-red-light)] hover:text-[var(--color-vinuni-red)]"
                style={{ borderColor: "var(--color-vinuni-red)" }}
              >
                <Sparkles className="h-3 w-3" />
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <p className="mt-2 px-1 text-xs" style={{ color: "var(--color-vinuni-muted)" }}>
          {formatRelativeTime(msg.created_at)}
        </p>
      </div>
    </div>
  );
}

export function TypingIndicator({ t }) {
  return (
    <div className="flex items-end gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--color-vinuni-red-light)" }}>
        <Bot className="h-5 w-5" style={{ color: "var(--color-vinuni-gold-light)" }} />
      </div>
      <div
        className="rounded-2xl rounded-bl-md border-l-4 bg-white px-5 py-4 shadow-sm"
        style={{ borderLeftColor: "var(--color-vinuni-red)" }}
      >
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: "var(--color-vinuni-red)", animationDelay: "0ms" }} />
          <div className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: "var(--color-vinuni-red)", animationDelay: "150ms", opacity: 0.6 }} />
          <div className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: "var(--color-vinuni-red)", animationDelay: "300ms", opacity: 0.3 }} />
        </div>
      </div>
    </div>
  );
}