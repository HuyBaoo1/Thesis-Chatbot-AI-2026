import { CalendarDays } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DASHBOARD_RANGE_OPTIONS,
  type DashboardRangePreset,
} from "@/features/dashboard/dashboard-date-range"

type DashboardRangeFilterProps = {
  rangePreset: DashboardRangePreset
  rangeLabel: string
  onRangePresetChange: (value: DashboardRangePreset) => void
}

const DashboardRangeFilter = ({
  rangePreset,
  rangeLabel,
  onRangePresetChange,
}: DashboardRangeFilterProps) => {
  const { t } = useTranslation("dashboard")

  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
      {/* Gold top bar */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

      <div className="relative flex items-center gap-3 px-5 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
          <CalendarDays className="size-4" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-slate-900">
            {t("dailyStats")}
          </p>
          <p className="text-[12px] text-slate-500">
            {t("filterDescription")}{" "}
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
              daily
            </code>{" "}
            {t("and")}{" "}
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
              daily/summary
            </code>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1 px-5 pb-4 sm:min-w-60 sm:pr-5 sm:pb-0">
        <Select
          value={rangePreset}
          onValueChange={(value) =>
            onRangePresetChange(value as DashboardRangePreset)
          }
        >
          <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none focus:border-slate-300 focus:ring-0">
            <SelectValue placeholder={t("selectRange")} />
          </SelectTrigger>
          <SelectContent>
            {DASHBOARD_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-right text-[11px] text-slate-400">{rangeLabel}</p>
      </div>
    </div>
  )
}

export default DashboardRangeFilter
