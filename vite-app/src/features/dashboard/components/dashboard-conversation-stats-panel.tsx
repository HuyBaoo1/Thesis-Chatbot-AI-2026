import { MessagesSquare, Radio, Workflow } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ConversationStats } from "@/types/admin-analytics-type"

type DashboardConversationStatsPanelProps = {
  stats?: ConversationStats
  isLoading: boolean
  isFetching: boolean
}

type BreakdownItem = {
  label: string
  count: number
}

const normalizeBreakdown = (
  items: Array<{ status?: string | null; channel?: string | null; count: number }>,
  labels: Record<string, string>
): BreakdownItem[] =>
  items.map((item) => {
    const rawLabel = item.status ?? item.channel ?? "UNKNOWN"
    return {
      label: labels[rawLabel] ?? rawLabel,
      count: item.count,
    }
  })

const BreakdownList = ({
  title,
  items,
  total,
}: {
  title: string
  items: BreakdownItem[]
  total: number
}) => {
  const { t } = useTranslation("dashboard")

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-400 uppercase">
        {title}
      </p>
      <div className="mt-2.5 space-y-2.5">
        {items.length ? (
          items.map((item) => {
            const percent = total > 0 ? (item.count / total) * 100 : 0
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-medium text-slate-700">
                    {item.label}
                  </span>
                  <span className="text-[12px] font-semibold text-slate-900">
                    {item.count}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-800 transition-all duration-500"
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[12px] text-slate-400">
            {t("noConversationData")}
          </div>
        )}
      </div>
    </div>
  )
}

const DashboardConversationStatsPanel = ({
  stats,
  isLoading,
  isFetching,
}: DashboardConversationStatsPanelProps) => {
  const { t } = useTranslation("dashboard")

  const STATUS_LABELS: Record<string, string> = {
    OPEN: t("statusOpen"),
    HANDOFF: t("statusHandoff"),
    CLOSED: t("statusClosed"),
  }

  const CHANNEL_LABELS: Record<string, string> = {
    WEB: t("channelWeb"),
    ZALO: t("channelZalo"),
    FACEBOOK: t("channelFacebook"),
    TELEGRAM: t("channelTelegram"),
  }

  const statusItems = normalizeBreakdown(stats?.by_status ?? [], STATUS_LABELS)
  const channelItems = normalizeBreakdown(stats?.by_channel ?? [], CHANNEL_LABELS)
  const total = stats?.total ?? 0

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-x-0 top-0 h-[2.5px] bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
            <MessagesSquare className="size-4" />
          </div>
          <div>
            <h2 className="text-[13px] font-semibold text-slate-900">{t("conversation")}</h2>
            <p className="text-[11px] text-slate-500">{t("statusAndChannel")}</p>
          </div>
        </div>
        {isFetching ? (
          <Badge variant="outline" className="border-slate-200 text-[10px] text-slate-500">
            {t("refreshing")}
          </Badge>
        ) : null}
      </div>

      {/* Body */}
      <div className="space-y-4 px-4 py-4">
        {isLoading && !stats ? (
          <>
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </>
        ) : (
          <>
            {/* Total card */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">{t("totalConversations")}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                    {total}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl",
                    total > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  )}
                >
                  <Workflow className="size-4" />
                </div>
              </div>
            </div>

            <BreakdownList title={t("byStatus")} items={statusItems} total={total} />
            <BreakdownList title={t("byChannel")} items={channelItems} total={total} />

            <div className="flex items-center gap-2 rounded-xl bg-blue-50/80 px-3 py-2.5 text-[12px] font-medium text-blue-700">
              <Radio className="size-3.5" />
              {t("liveChatRate")}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DashboardConversationStatsPanel
