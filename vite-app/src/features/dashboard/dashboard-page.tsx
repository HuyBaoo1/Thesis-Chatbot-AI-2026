import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import {
  getConversationStats,
  getConversionFunnel,
  getDailyAnalytics,
  getDailyAnalyticsByDate,
  getDailyAnalyticsSummary,
  getHotQuestions,
} from "@/api/admin-analytics-api"
import DashboardConversationStatsPanel from "@/features/dashboard/components/dashboard-conversation-stats-panel"
import DashboardFunnelChart from "@/features/dashboard/components/dashboard-funnel-chart"
import DashboardDailyDetailDialog from "@/features/dashboard/components/dashboard-daily-detail-dialog"
import DashboardDailyTable from "@/features/dashboard/components/dashboard-daily-table"
import DashboardHotQuestionsPreview from "@/features/dashboard/components/dashboard-hot-questions-preview"
import DashboardRangeFilter from "@/features/dashboard/components/dashboard-range-filter"
import DashboardSummaryPanel from "@/features/dashboard/components/dashboard-summary-panel"
import {
  buildDashboardRangeParams,
  formatRangeLabel,
  type DashboardRangePreset,
} from "@/features/dashboard/dashboard-date-range"

const DAILY_PAGE_SIZE = 5

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const DashboardPage = () => {
  const { t } = useTranslation("dashboard")
  const [rangePreset, setRangePreset] = useState<DashboardRangePreset>("today")
  const [dailyOffset, setDailyOffset] = useState(0)
  const [detailTargetDate, setDetailTargetDate] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const rangeParams = useMemo(
    () => buildDashboardRangeParams(rangePreset),
    [rangePreset]
  )
  const rangeLabel = useMemo(() => formatRangeLabel(rangeParams), [rangeParams])

  const dailySummaryQuery = useQuery({
    queryKey: [
      "admin-analytics",
      "daily-summary",
      rangePreset,
      rangeParams.from,
      rangeParams.to,
    ],
    queryFn: () => getDailyAnalyticsSummary(rangeParams),
    placeholderData: (previousData) => previousData,
  })

  const dailyListQuery = useQuery({
    queryKey: [
      "admin-analytics",
      "daily-list",
      rangePreset,
      rangeParams.from,
      rangeParams.to,
      dailyOffset,
      DAILY_PAGE_SIZE,
    ],
    queryFn: () =>
      getDailyAnalytics({
        ...rangeParams,
        limit: DAILY_PAGE_SIZE,
        offset: dailyOffset,
      }),
    placeholderData: (previousData) => previousData,
  })

  const dailyDetailQuery = useQuery({
    queryKey: ["admin-analytics", "daily-detail", detailTargetDate],
    queryFn: () => getDailyAnalyticsByDate(detailTargetDate as string),
    enabled: detailOpen && Boolean(detailTargetDate),
  })

  const hotQuestionsPreviewQuery = useQuery({
    queryKey: ["admin-analytics", "dashboard-hot-questions-preview"],
    queryFn: () =>
      getHotQuestions({
        limit: 8,
        offset: 0,
      }),
    placeholderData: (previousData) => previousData,
  })

  const conversationStatsQuery = useQuery({
    queryKey: ["admin-analytics", "conversation-stats"],
    queryFn: getConversationStats,
    placeholderData: (previousData) => previousData,
  })

  const conversionFunnelQuery = useQuery({
    queryKey: [
      "admin-analytics",
      "conversion-funnel",
      rangePreset,
      rangeParams.from,
      rangeParams.to,
    ],
    queryFn: () => getConversionFunnel(rangeParams),
    placeholderData: (previousData) => previousData,
  })

  const surfaceError =
    getErrorMessage(dailySummaryQuery.error, "") ||
    getErrorMessage(dailyListQuery.error, "") ||
    getErrorMessage(dailyDetailQuery.error, "") ||
    getErrorMessage(hotQuestionsPreviewQuery.error, "") ||
    getErrorMessage(conversationStatsQuery.error, "") ||
    getErrorMessage(conversionFunnelQuery.error, "")

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-950">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("description")}</p>
      </div>

      <DashboardRangeFilter
        rangePreset={rangePreset}
        rangeLabel={rangeLabel}
        onRangePresetChange={(value) => {
          setRangePreset(value)
          setDailyOffset(0)
        }}
      />

      {surfaceError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-600">
          {surfaceError}
        </div>
      ) : null}

      <DashboardSummaryPanel
        summary={dailySummaryQuery.data}
        isLoading={dailySummaryQuery.isLoading}
        isFetching={dailySummaryQuery.isFetching}
      />

      <DashboardDailyTable
        items={dailyListQuery.data?.items ?? []}
        summary={dailySummaryQuery.data}
        total={dailyListQuery.data?.total ?? 0}
        limit={dailyListQuery.data?.limit ?? DAILY_PAGE_SIZE}
        offset={dailyListQuery.data?.offset ?? dailyOffset}
        isLoading={dailyListQuery.isLoading}
        isFetching={dailyListQuery.isFetching}
        onPageChange={(page) => {
          setDailyOffset((page - 1) * DAILY_PAGE_SIZE)
        }}
        onSelectDate={(targetDate) => {
          setDetailTargetDate(targetDate)
          setDetailOpen(true)
        }}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardHotQuestionsPreview
          items={hotQuestionsPreviewQuery.data?.items ?? []}
          isLoading={hotQuestionsPreviewQuery.isLoading}
          isFetching={hotQuestionsPreviewQuery.isFetching}
        />
        <DashboardConversationStatsPanel
          stats={conversationStatsQuery.data}
          isLoading={conversationStatsQuery.isLoading}
          isFetching={conversationStatsQuery.isFetching}
        />
        <DashboardFunnelChart
          funnel={conversionFunnelQuery.data}
          isLoading={conversionFunnelQuery.isLoading}
          isFetching={conversionFunnelQuery.isFetching}
        />
      </div>

      <DashboardDailyDetailDialog
        open={detailOpen}
        targetDate={detailTargetDate}
        detail={dailyDetailQuery.data}
        isLoading={dailyDetailQuery.isLoading}
        isFetching={dailyDetailQuery.isFetching}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) {
            setDetailTargetDate(null)
          }
        }}
      />
    </div>
  )
}

export default DashboardPage
