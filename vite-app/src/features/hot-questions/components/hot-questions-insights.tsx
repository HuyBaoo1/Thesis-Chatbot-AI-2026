import { AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import type { HotQuestionsSummary } from "@/types/admin-analytics-type"

type HotQuestionsInsightsProps = {
  summary?: HotQuestionsSummary
  isLoading?: boolean
}

const HotQuestionsInsights = ({
  summary,
  isLoading = false,
}: HotQuestionsInsightsProps) => {
  const { t } = useTranslation("hot-questions")

  return (
    <div className="overflow-hidden rounded-2xl border border-t-[2.5px] border-slate-200/70 border-t-[#d6ae4e] bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[14px] font-semibold text-slate-900">
          {t("overview")}
        </h2>
        <p className="text-[12px] leading-5 text-slate-500">
          {t("overviewHint")}
        </p>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50/80 to-white px-3 py-2.5 shadow-none">
            <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              {t("totalQuestionsLabel")}
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              {summary?.total_questions ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50/80 to-white px-3 py-2.5 shadow-none">
            <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              {t("totalAsksLabel")}
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              {summary?.total_asks ?? 0}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-linear-to-br from-amber-50/80 to-white p-4 shadow-none">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 ring-1 ring-amber-200">
              <AlertCircle className="size-4 text-amber-600" />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-950">
                {t("fallbackOverview")}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {t("fallbackSummary", {
                  questions: summary?.fallback_questions ?? 0,
                  asks: summary?.fallback_asks ?? 0,
                })}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            {t("topIntents")}
          </p>
          <Separator className="my-3" />

          <div className="space-y-1.5">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-9 rounded-xl" />
              ))
            ) : summary?.top_intents?.length ? (
              summary.top_intents.map((item, index) => (
                <div
                  key={item.intent}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 transition-colors hover:border-slate-200 hover:bg-white"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-slate-200 text-[10px] font-bold text-slate-600">
                    {index + 1}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-700">
                    {item.intent}
                  </span>

                  <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-xs text-slate-400">
                {t("noTopIntents")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HotQuestionsInsights
