import { ArrowRight, MessageSquareQuote } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { HotQuestion } from "@/types/admin-analytics-type"

type DashboardHotQuestionsPreviewProps = {
  items: HotQuestion[]
  isLoading: boolean
  isFetching: boolean
}

const DashboardHotQuestionsPreview = ({
  items,
  isLoading,
  isFetching,
}: DashboardHotQuestionsPreviewProps) => {
  const { t } = useTranslation("dashboard")

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-x-0 top-0 h-[2.5px] bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 pt-5">
        <div>
          <h2 className="text-[13px] font-semibold text-slate-900">
            {t("hotQuestions")}
          </h2>
          <p className="text-[11px] text-slate-500">
            {t("top5HotQuestions")}
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-7 gap-1 rounded-lg px-2.5 text-[12px]"
        >
          <Link to="/admin/hot-questions">
            {t("viewAll")}
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2 px-4 py-3.5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))
        ) : items.length ? (
          items.map((item, index) => (
            <Link
              key={item.id}
              to="/admin/hot-questions"
              className="group block rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50"
            >
              <div className="flex items-start gap-2.5">
                {/* Rank badge */}
                <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-950 text-[10px] font-semibold text-white">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-[12px] leading-normal font-medium text-slate-900">
                      {item.question}
                    </p>
                    {isFetching ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-slate-200 text-[9px] text-slate-400"
                      >
                        {t("updating")}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                      {item.intent ?? t("noIntent")}
                    </span>
                    <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                      {t("timesAsked", { count: item.count })}
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[9px] font-medium",
                        item.is_fallback
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      )}
                    >
                      {item.is_fallback ? t("fallbacks") : t("answered")}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
            <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100">
              <MessageSquareQuote className="size-4 text-slate-400" />
            </div>
            <p className="text-[12px] text-slate-500">
              {t("noHotQuestions")}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardHotQuestionsPreview
