import {
  BookOpenText,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react"
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
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  admissionCategoryOptions,
  type AdmissionCategory,
} from "@/types/knowledge-chunk-type"

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE"
type EmbeddingFilter = "ALL" | "READY" | "MISSING"

type KnowledgeChunkToolbarProps = {
  canManage?: boolean
  searchInput: string
  appliedSearch: string
  categoryFilter: AdmissionCategory | "ALL"
  statusFilter: StatusFilter
  embeddingFilter: EmbeddingFilter
  onSearchInputChange: (value: string) => void
  onCategoryFilterChange: (value: AdmissionCategory | "ALL") => void
  onStatusFilterChange: (value: StatusFilter) => void
  onEmbeddingFilterChange: (value: EmbeddingFilter) => void
  onCreateClick: () => void
  onUploadFileClick: () => void
  onDeleteUploadedFileClick: () => void
  onRebuildClick: () => void
  onClearFilters: () => void
}

const KnowledgeChunkToolbar = ({
  canManage = true,
  searchInput,
  appliedSearch,
  categoryFilter,
  statusFilter,
  embeddingFilter,
  onSearchInputChange,
  onCategoryFilterChange,
  onStatusFilterChange,
  onEmbeddingFilterChange,
  onCreateClick,
  onUploadFileClick,
  onDeleteUploadedFileClick,
  onRebuildClick,
  onClearFilters,
}: KnowledgeChunkToolbarProps) => {
  const { t } = useTranslation("knowledge-chunk")
  const hasFilters = Boolean(
    appliedSearch ||
      categoryFilter !== "ALL" ||
      statusFilter !== "ALL" ||
      embeddingFilter !== "ALL"
  )
  const isDebouncing = searchInput.trim() !== appliedSearch

  return (
    <div className="overflow-hidden rounded-2xl border border-t-[2.5px] border-slate-200/70 border-t-[#d6ae4e] bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-3 px-4 pt-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchInput}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 pl-9 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
            onChange={(e) => onSearchInputChange(e.target.value)}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-none hover:bg-slate-50 hover:text-slate-900"
              onClick={onClearFilters}
            >
              <X className="size-4" />
            </Button>
          ) : null}

          {canManage ? (
            <>
              <Separator
                orientation="vertical"
                className="mx-1 hidden h-6 xl:block"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-xl border-slate-200 bg-white px-3 text-[13px] text-slate-600 shadow-none hover:bg-slate-50"
                onClick={onUploadFileClick}
              >
                <Upload className="size-4" />
                {t("upload")}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-xl border-red-100 bg-white px-3 text-[13px] text-red-500 shadow-none hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                onClick={onDeleteUploadedFileClick}
              >
                <Trash2 className="size-4" />
                {t("deleteFile")}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-xl border-amber-200 bg-white px-3 text-[13px] text-amber-700 shadow-none hover:bg-amber-50"
                onClick={onRebuildClick}
              >
                <RefreshCcw className="size-4" />
                {t("rebuild")}
              </Button>

              <Button
                type="button"
                size="sm"
                className="h-10 rounded-xl bg-slate-950 px-4 text-[13px] font-medium text-white shadow-sm hover:bg-slate-800"
                onClick={onCreateClick}
              >
                <BookOpenText className="size-4" />
                {t("createChunk")}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center">
        <span className="shrink-0 text-[11px] font-medium text-slate-500">
          {t("categoryLabel")}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onCategoryFilterChange("ALL")}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
              categoryFilter === "ALL"
                ? "bg-slate-950 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {t("all")}
          </button>
          {admissionCategoryOptions.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => onCategoryFilterChange(cat.value)}
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                categoryFilter === cat.value
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 px-4 pb-4 sm:flex-row sm:items-center">
        <span className="shrink-0 text-[11px] font-medium text-slate-500">
          {t("filterMore")}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-8 w-36 rounded-lg border-slate-200 bg-slate-50/80 text-[12px] shadow-none focus:border-slate-300 focus:ring-0">
              <SelectValue placeholder={t("allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
              <SelectItem value="ACTIVE">{t("active")}</SelectItem>
              <SelectItem value="INACTIVE">{t("inactive")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={embeddingFilter}
            onValueChange={onEmbeddingFilterChange}
          >
            <SelectTrigger className="h-8 w-36 rounded-lg border-slate-200 bg-slate-50/80 text-[12px] shadow-none focus:border-slate-300 focus:ring-0">
              <SelectValue placeholder={t("allEmbeddings")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allEmbeddings")}</SelectItem>
              <SelectItem value="READY">{t("ready")}</SelectItem>
              <SelectItem value="MISSING">{t("missing")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isDebouncing || hasFilters ? (
          <div className="ml-auto flex items-center gap-2">
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
                {t("filtering")}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default KnowledgeChunkToolbar
