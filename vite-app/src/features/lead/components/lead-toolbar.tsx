import { useTranslation } from "react-i18next"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  leadSortOptions,
  leadStatusOptions,
  leadTemperatureOptions,
  type LeadSortOption,
  type LeadStatus,
  type LeadTemperature,
} from "@/types/lead-type"

type StaffFilterOption = {
  label: string
  value: string
}

type LeadToolbarProps = {
  searchInput: string
  appliedSearch: string
  statusFilter: LeadStatus | "ALL"
  temperatureFilter: LeadTemperature | "ALL"
  sortOption: LeadSortOption
  assignedStaffFilter: string | "ALL"
  staffOptions?: StaffFilterOption[]
  onSearchInputChange: (value: string) => void
  onStatusFilterChange: (value: LeadStatus | "ALL") => void
  onTemperatureFilterChange: (value: LeadTemperature | "ALL") => void
  onSortOptionChange: (value: LeadSortOption) => void
  onAssignedStaffFilterChange: (value: string | "ALL") => void
  onClearFilters: () => void
}

const LeadToolbar = ({
  searchInput,
  appliedSearch,
  statusFilter,
  temperatureFilter,
  sortOption,
  assignedStaffFilter,
  staffOptions = [],
  onSearchInputChange,
  onStatusFilterChange,
  onTemperatureFilterChange,
  onSortOptionChange,
  onAssignedStaffFilterChange,
  onClearFilters,
}: LeadToolbarProps) => {
  const { t } = useTranslation("leads")
  const { t: tc } = useTranslation("common")
  const showStaffFilter = staffOptions.length > 0
  const hasFilters = Boolean(
    appliedSearch ||
    statusFilter !== "ALL" ||
    temperatureFilter !== "ALL" ||
    sortOption !== "newest" ||
    assignedStaffFilter !== "ALL"
  )
  const isDebouncing = searchInput.trim() !== appliedSearch

  return (
    <div className="overflow-hidden rounded-2xl border border-t-[2.5px] border-slate-200/70 border-t-[#d6ae4e] bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-3 px-4 py-4 xl:flex-row xl:items-center">
        <div
          className={
            showStaffFilter
              ? "grid flex-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_150px_150px_170px_210px]"
              : "grid flex-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1.8fr)_170px_170px_180px]"
          }
        >
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              placeholder={t("searchPlaceholder")}
              className="h-10 rounded-xl border-slate-200 bg-slate-50/80 pl-9 text-[13px] shadow-none transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
              onChange={(event) => onSearchInputChange(event.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:ring-0">
              <SelectValue placeholder={t("allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
              {leadStatusOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={temperatureFilter}
            onValueChange={onTemperatureFilterChange}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:ring-0">
              <SelectValue placeholder={t("allTemperatures")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allTemperatures")}</SelectItem>
              {leadTemperatureOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortOption} onValueChange={onSortOptionChange}>
            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:ring-0">
              <SelectValue placeholder={t("sortBy")} />
            </SelectTrigger>
            <SelectContent>
              {leadSortOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {showStaffFilter ? (
            <Select
              value={assignedStaffFilter}
              onValueChange={onAssignedStaffFilterChange}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:ring-0">
                <SelectValue placeholder={t("allCounselors")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allCounselors")}</SelectItem>
                {staffOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-none transition-colors hover:bg-slate-50 hover:text-slate-900"
              aria-label={t("clearFilters")}
              onClick={onClearFilters}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {(isDebouncing || hasFilters) && (
        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2">
          {isDebouncing ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200 ring-inset">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
              </span>
              {tc("debouncing")}
            </span>
          ) : null}

          {hasFilters ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200 ring-inset">
              {tc("applyingFilters")}
            </span>
          ) : null}

          <span className="ml-auto text-[11px] text-slate-400">
            {t("resultsUpdateHint")}
          </span>
        </div>
      )}
    </div>
  )
}

export default LeadToolbar
