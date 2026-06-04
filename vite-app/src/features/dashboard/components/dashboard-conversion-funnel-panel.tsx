import { Filter, TrendingUp } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ConversionFunnel } from "@/types/admin-analytics-type"

type DashboardConversionFunnelPanelProps = {
  funnel?: ConversionFunnel
  isLoading: boolean
  isFetching: boolean
}

const formatPercent = (value: number | null) =>
  value === null ? "--" : `${(value * 100).toFixed(1)}%`

const DashboardConversionFunnelPanel = ({
  funnel,
  isLoading,
  isFetching,
}: DashboardConversionFunnelPanelProps) => {
  const { t } = useTranslation("dashboard")

  const stageLabelMap: Record<string, string> = {
    lead_created: t("funnelLeadCreated"),
    contact_collected: t("funnelContactCollected"),
    chat_interacted: t("funnelChatInteracted"),
    interest_detected: t("funnelInterestDetected"),
    hot_lead: t("funnelHotLead"),
    assigned: t("funnelAssigned"),
    contacted_or_later: t("funnelContactedOrLater"),
  }

  const stages = funnel?.stages ?? []
  const maxCount = Math.max(...stages.map((stage) => stage.count), 0)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Filter className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {t("conversionFunnelTitle")}
            </h2>
            <p className="text-xs text-slate-500">{t("leadJourneyByStage")}</p>
          </div>
        </div>
        {isFetching ? (
          <Badge
            variant="outline"
            className="border-slate-200 text-xs text-slate-500"
          >
            {t("refreshing")}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-3 px-3.5 py-3.5">
        {isLoading && !funnel ? (
          Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-xl" />
          ))
        ) : stages.length ? (
          stages.map((stage, index) => {
            const percentOfMax =
              maxCount > 0 ? Math.max(4, (stage.count / maxCount) * 100) : 0
            const label = stageLabelMap[stage.stage] ?? stage.stage
            const conversionLabel = formatPercent(
              stage.conversion_from_previous
            )

            return (
              <div
                key={stage.stage}
                className="rounded-xl border border-slate-100 p-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600">
                        {index + 1}
                      </span>
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {label}
                      </p>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {t("fromPrevious")} {conversionLabel}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-900">
                    {stage.count}
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      index < 2
                        ? "bg-emerald-500"
                        : index < 5
                          ? "bg-blue-500"
                          : "bg-slate-700"
                    )}
                    style={{ width: `${Math.min(100, percentOfMax)}%` }}
                  />
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center">
            <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100">
              <TrendingUp className="size-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500">
              {t("noFunnelData")}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardConversionFunnelPanel
