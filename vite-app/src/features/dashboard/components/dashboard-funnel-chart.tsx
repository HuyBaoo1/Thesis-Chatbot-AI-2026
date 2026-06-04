import { TrendingUp } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { ConversionFunnel } from "@/types/admin-analytics-type"

type DashboardFunnelChartProps = {
  funnel?: ConversionFunnel
  isLoading: boolean
  isFetching: boolean
}

const STAGE_COLORS = [
  "#10b981", // emerald
  "#10b981",
  "#3b82f6", // blue
  "#3b82f6",
  "#f59e0b", // amber
  "#f97316", // orange
  "#ef4444", // red
]

const DashboardFunnelChart = ({
  funnel,
  isLoading,
  isFetching,
}: DashboardFunnelChartProps) => {
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

  // Backend returns stages in funnel order; colors assigned by position
  const skeletonCount = funnel?.stages.length || 7

  const chartData = (funnel?.stages ?? []).map((stage, index) => ({
    name: stageLabelMap[stage.stage] ?? stage.stage,
    count: stage.count,
    rate:
      stage.conversion_from_previous !== null
        ? stage.conversion_from_previous * 100
        : 100,
    stage: stage.stage,
    colorIndex: index,
  }))

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <TrendingUp className="size-4" />
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

      <div className="px-3.5 py-4">
        {isLoading && !funnel ? (
          <div className="space-y-3">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <Skeleton key={i} className="h-9 rounded-lg" />
            ))}
          </div>
        ) : chartData.length ? (
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 60, bottom: 0, left: 0 }}
                barCategoryGap="25%"
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
                  width={140}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
                        <p className="text-xs font-semibold text-slate-900">
                          {d.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t("count")}:{" "}
                          <span className="font-medium text-slate-900">
                            {d.count.toLocaleString()}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {t("fromPrevious")}:{" "}
                          <span className="font-medium text-slate-900">
                            {d.rate.toFixed(1)}%
                          </span>
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 6, 6, 0]}
                  barSize={28}
                  background={{ fill: "#f1f5f9", radius: 6 }}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.stage}
                      fill={STAGE_COLORS[entry.colorIndex % STAGE_COLORS.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="rate"
                    position="right"
                    formatter={(v) =>
                      typeof v === "number" ? `${v.toFixed(1)}%` : v
                    }
                    style={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                  />
                  <LabelList
                    dataKey="count"
                    position="insideRight"
                    formatter={(v) =>
                      typeof v === "number" ? v.toLocaleString() : v
                    }
                    style={{ fill: "#fff", fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center">
            <TrendingUp className="size-4 text-slate-400" />
            <p className="text-xs text-slate-500">{t("noFunnelData")}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardFunnelChart
