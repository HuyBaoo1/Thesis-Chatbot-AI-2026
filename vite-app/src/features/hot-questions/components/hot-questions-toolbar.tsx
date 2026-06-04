import { Search, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type HotQuestionsToolbarProps = {
  searchInput: string
  appliedSearch: string
  intentFilter: string
  fallbackFilter: "ALL" | "TRUE" | "FALSE"
  intentOptions: readonly string[]
  onSearchInputChange: (value: string) => void
  onIntentFilterChange: (value: string) => void
  onFallbackFilterChange: (value: "ALL" | "TRUE" | "FALSE") => void
  onClearFilters: () => void
}

const HotQuestionsToolbar = ({
  searchInput,
  appliedSearch,
  intentFilter,
  fallbackFilter,
  intentOptions,
  onSearchInputChange,
  onIntentFilterChange,
  onFallbackFilterChange,
  onClearFilters,
}: HotQuestionsToolbarProps) => {
  const { t } = useTranslation("hot-questions")
  const hasFilters = Boolean(
    appliedSearch || intentFilter !== "ALL" || fallbackFilter !== "ALL"
  )
  const isDebouncing = searchInput.trim() !== appliedSearch

  return (
    <div className="overflow-hidden rounded-2xl border border-t-[2.5px] border-slate-200/70 border-t-[#d6ae4e] bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-3 px-4 py-4 xl:flex-row xl:items-center">
        <div className="grid flex-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1.8fr)_180px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              placeholder={t("searchPlaceholderExtended")}
              className="h-10 rounded-xl border-slate-200 bg-slate-50/80 pl-9 text-[13px] shadow-none transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
              onChange={(event) => onSearchInputChange(event.target.value)}
            />
          </div>

          <Select value={intentFilter} onValueChange={onIntentFilterChange}>
            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:ring-0">
              <SelectValue placeholder={t("allIntents")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allIntents")}</SelectItem>
              {intentOptions.map((intent) => (
                <SelectItem key={intent} value={intent}>
                  {intent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={fallbackFilter}
            onValueChange={(value) =>
              onFallbackFilterChange(value as "ALL" | "TRUE" | "FALSE")
            }
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:ring-0">
              <SelectValue placeholder={t("allFallback")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allQuestions")}</SelectItem>
              <SelectItem value="TRUE">{t("fallbackOnly")}</SelectItem>
              <SelectItem value="FALSE">{t("answered")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-none transition-colors hover:bg-slate-50 hover:text-slate-900"
              onClick={onClearFilters}
              aria-label={t("clearFiltersAriaLabel")}
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
              {t("debouncing")}
            </span>
          ) : null}

          {hasFilters ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200 ring-inset">
              {t("applyingFilters")}
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

export default HotQuestionsToolbar
