import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import HomeChatShell from "@/features/home/components/home-chat-shell"
import useLeadStore from "@/stores/lead-store"

const WidgetLayout = () => {
  const [searchParams] = useSearchParams()
  const isEmbed = searchParams.get("embed") === "true"
  const sourceDomain = searchParams.get("source_domain")
  const parentOrigin = searchParams.get("parent_origin")
  // Validate parentOrigin is a legitimate HTTPS origin before using as
  // postMessage target — prevents attacker-controlled URL param from
  // redirecting messages to a malicious origin.
  const safeOrigin =
    parentOrigin && /^https:\/\/[^\s/?#]+$/.test(parentOrigin)
      ? parentOrigin
      : null
  const [isReady, setIsReady] = useState(false)
  const updateLeadData = useLeadStore((s) => s.updateLeadData)

  useEffect(() => {
    if (sourceDomain) {
      updateLeadData({ source_domain: sourceDomain })
    }
  }, [sourceDomain, updateLeadData])

  useEffect(() => {
    // Notify parent window that widget is ready.
    // safeOrigin is validated from the URL param set by widget.js.
    if (window.parent !== window && safeOrigin) {
      window.parent.postMessage(
        { type: "vinuni-widget-ready" },
        safeOrigin,
      )
    }
    setIsReady(true)
  }, [])

  if (!isReady) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#faf9f6]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      </div>
    )
  }

  return (
    <div
      className={`flex h-dvh flex-col bg-[#faf9f6] ${
        isEmbed ? "rounded-2xl shadow-xl" : ""
      }`}
    >
      {/* Minimal header bar — only shown when not embedded */}
      {!isEmbed ? (
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-[10px] font-bold text-white">
              AI
            </div>
            <span className="text-[13px] font-medium text-slate-700">
              VinUni Admissions
            </span>
          </div>
        </div>
      ) : null}

      {/* Chat shell fills remaining space */}
      <div className="flex-1 min-h-0">
        <HomeChatShell />
      </div>

      {/* Powered-by line */}
      <div className="shrink-0 border-t border-slate-200/40 px-4 py-2 text-center">
        <a
          href="https://vinuni.edu.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-slate-400 transition-colors hover:text-slate-600"
        >
          Powered by VinUni AI
        </a>
      </div>
    </div>
  )
}

export default WidgetLayout
