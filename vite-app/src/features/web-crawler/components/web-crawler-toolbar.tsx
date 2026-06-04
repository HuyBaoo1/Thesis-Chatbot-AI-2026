import { useTranslation } from "react-i18next"
import { Globe2, RefreshCcw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PageJobFilter = "ALL" | "PENDING_KB" | "SENT_KB"

type WebCrawlerToolbarProps = {
  sessionTotal: number
  pageTotal: number
  searchInput: string
  pageJobFilter: PageJobFilter
  selectedSessionLabel?: string
  isFetching?: boolean
  onSearchInputChange: (value: string) => void
  onPageJobFilterChange: (value: PageJobFilter) => void
  onCreateClick: () => void
  onRefreshClick: () => void
  onClearSession: () => void
}

const WebCrawlerToolbar = ({
  sessionTotal,
  pageTotal,
  searchInput,
  pageJobFilter,
  selectedSessionLabel,
  isFetching = false,
  onSearchInputChange,
  onPageJobFilterChange,
  onCreateClick,
  onRefreshClick,
  onClearSession,
}: WebCrawlerToolbarProps) => {
  const { t } = useTranslation("web-crawler")

  return (
    <div className="overflow-hidden rounded-2xl border border-t-[2.5px] border-slate-200/70 border-t-[#d6ae4e] bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900">
              {t("workspace")}
            </h2>
            <p className="text-[12px] text-slate-500">
              {t("workspaceSummary", {
                sessionCount: sessionTotal,
                pageCount: pageTotal,
              })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 rounded-xl border-slate-200 bg-white px-3 text-[13px] text-slate-600 shadow-none hover:bg-slate-50"
              onClick={onRefreshClick}
            >
              <RefreshCcw
                className={isFetching ? "size-4 animate-spin" : "size-4"}
              />
              {t("refresh")}
            </Button>

            <Button
              type="button"
              size="sm"
              className="h-10 rounded-xl bg-slate-950 px-4 text-[13px] font-medium text-white shadow-sm hover:bg-slate-800"
              onClick={onCreateClick}
            >
              <Globe2 className="size-4" />
              {t("newCrawl")}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              placeholder={t("searchPlaceholder")}
              className="h-10 rounded-xl border-slate-200 bg-slate-50/80 pl-9 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
              onChange={(event) => onSearchInputChange(event.target.value)}
            />
          </div>

          <Select
            value={pageJobFilter}
            onValueChange={(value) =>
              onPageJobFilterChange(value as PageJobFilter)
            }
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none focus:border-slate-300 focus:ring-0 md:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allPages")}</SelectItem>
              <SelectItem value="PENDING_KB">{t("pendingKb")}</SelectItem>
              <SelectItem value="SENT_KB">{t("sentToKbFilter")}</SelectItem>
            </SelectContent>
          </Select>

          {selectedSessionLabel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 max-w-full rounded-xl border-slate-200 bg-white px-3 text-[13px] text-slate-600 shadow-none hover:bg-slate-50 md:max-w-72"
              onClick={onClearSession}
            >
              <span className="truncate">{selectedSessionLabel}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export type { PageJobFilter }
export default WebCrawlerToolbar
