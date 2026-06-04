import { MessageSquare, TrendingDown, UserPlus, Zap } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { DailyAnalyticsSummary } from "@/types/admin-analytics-type"

type DashboardSummaryPanelProps = {
  summary?: DailyAnalyticsSummary
  isLoading: boolean
  isFetching: boolean
}

type SummaryMetricCardProps = {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  tone?: "slate" | "emerald" | "amber" | "rose"
  isFetching?: boolean
}

const TONE_STYLES: Record<
  NonNullable<SummaryMetricCardProps["tone"]>,
  { accent: string; icon: string; label: string }
> = {
  slate: {
    accent: "from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30",
    icon: "bg-slate-100 text-slate-700",
    label: "text-slate-500",
  },
  emerald: {
    accent: "from-emerald-400 via-emerald-300 to-emerald-200/40",
    icon: "bg-emerald-50 text-emerald-700",
    label: "text-emerald-600",
  },
  amber: {
    accent: "from-amber-400 via-amber-300 to-amber-200/40",
    icon: "bg-amber-50 text-amber-700",
    label: "text-amber-600",
  },
  rose: {
    accent: "from-rose-400 via-rose-300 to-rose-200/40",
    icon: "bg-rose-50 text-rose-600",
    label: "text-rose-500",
  },
}

const SummaryMetricCard = ({
  label,
  value,
  icon: Icon,
  tone = "slate",
  isFetching = false,
}: SummaryMetricCardProps) => {
  const { t } = useTranslation("dashboard")
  const styles = TONE_STYLES[tone]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-[2.5px] bg-linear-to-r",
          styles.accent
        )}
      />
      <div className="p-4 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-xl",
              styles.icon
            )}
          >
            <Icon className="size-4" />
          </div>
          {isFetching && (
            <span className={cn("text-[10px] font-medium", styles.label)}>
              {t("updating")}
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-3 text-[10px] font-semibold tracking-[0.15em] uppercase",
            styles.label
          )}
        >
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          {value}
        </p>
      </div>
    </div>
  )
}

const DashboardSummaryPanel = ({
  summary,
  isLoading,
  isFetching,
}: DashboardSummaryPanelProps) => {
  const { t } = useTranslation("dashboard")

  if (isLoading && !summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetricCard
        label={t("totalConversations")}
        value={`${summary?.total_chats ?? 0}`}
        icon={MessageSquare}
        tone="slate"
      />
      <SummaryMetricCard
        label={t("newLeads")}
        value={`${summary?.new_leads ?? 0}`}
        icon={UserPlus}
        tone="emerald"
      />
      <SummaryMetricCard
        label={t("fallbacks")}
        value={`${summary?.fallbacks ?? 0}`}
        icon={Zap}
        tone="amber"
      />
      <SummaryMetricCard
        label={t("fallbackRate")}
        value={`${((summary?.fallback_rate ?? 0) * 100).toFixed(1)}%`}
        icon={TrendingDown}
        tone="rose"
        isFetching={isFetching}
      />
    </div>
  )
}

export default DashboardSummaryPanel
