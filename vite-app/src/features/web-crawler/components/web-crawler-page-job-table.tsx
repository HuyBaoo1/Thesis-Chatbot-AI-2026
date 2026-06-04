import { useTranslation } from "react-i18next"
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  admissionCategoryLabelMap,
  type AdmissionCategory,
} from "@/types/knowledge-chunk-type"
import type { CrawlPageJob } from "@/types/crawl-type"

type WebCrawlerPageJobTableProps = {
  pageJobs: CrawlPageJob[]
  total: number
  limit: number
  offset: number
  isLoading?: boolean
  isFetching?: boolean
  deletingPageJobId?: string | null
  downloadingPageJobId?: string | null
  onPageChange: (offset: number) => void
  onPreview: (pageJob: CrawlPageJob) => void
  onDownload: (pageJob: CrawlPageJob) => void
  onDelete: (pageJob: CrawlPageJob) => void
}

const getCategoryLabel = (
  pageJob: CrawlPageJob,
  t: (key: string) => string
) => {
  const category = pageJob.category || pageJob.suggested_metadata?.category
  if (!category) return t("uncategorized")
  return (
    admissionCategoryLabelMap[category as AdmissionCategory] ||
    String(category).replaceAll("_", " ")
  )
}

const getStatusBadge = (pageJob: CrawlPageJob, t: (key: string) => string) => {
  if (pageJob.sent_to_kb)
    return {
      label: t("statusSentToKb"),
      icon: CheckCircle2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    }
  if (pageJob.status === "failed")
    return {
      label: t("statusFailed"),
      icon: XCircle,
      className: "border-red-200 bg-red-50 text-red-600",
    }
  return {
    label: t("statusReady"),
    icon: CheckCircle2,
    className: "border-blue-200 bg-blue-50 text-blue-700",
  }
}

const WebCrawlerPageJobTable = ({
  pageJobs,
  total,
  limit,
  offset,
  isLoading = false,
  isFetching = false,
  deletingPageJobId = null,
  downloadingPageJobId = null,
  onPageChange,
  onPreview,
  onDownload,
  onDelete,
}: WebCrawlerPageJobTableProps) => {
  const { t } = useTranslation("web-crawler")
  const hasPrev = offset > 0
  const hasNext = offset + limit < total

  return (
    <div className="overflow-hidden rounded-2xl border border-t-[2.5px] border-slate-200/70 border-t-[#d6ae4e] bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-slate-900">
            {t("crawledPageJobs")}
          </h2>
          <p className="text-[12px] text-slate-500">{t("pageJobsHint")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500">
          {isFetching && !isLoading && (
            <Loader2 className="size-3.5 animate-spin" />
          )}
          <span>
            {pageJobs.length ? offset + 1 : 0}-{offset + pageJobs.length} of{" "}
            {total}
          </span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
            <TableHead className="px-5 text-[11px] font-medium text-slate-500">
              {t("page")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("category")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("year")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("status")}
            </TableHead>
            <TableHead className="w-40 pr-5 text-right text-[11px] font-medium text-slate-500">
              {t("actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 6 }).map((_, index) => (
              <TableRow
                key={`crawl-page-job-skeleton-${index}`}
                className="border-slate-100"
              >
                <TableCell className="px-5 py-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-64 rounded-full" />
                    <Skeleton className="h-3 w-96 rounded-full" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </TableCell>
                <TableCell className="pr-5">
                  <Skeleton className="ml-auto h-8 w-24 rounded-lg" />
                </TableCell>
              </TableRow>
            ))}

          {!isLoading && pageJobs.length === 0 && (
            <TableRow className="hover:bg-white">
              <TableCell colSpan={5} className="py-20 text-center">
                <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                    <FileText className="size-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">
                      {t("noPageJobs")}
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {t("noPageJobsHint")}
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            pageJobs.map((pageJob) => {
              const statusBadge = getStatusBadge(pageJob, t)
              const StatusIcon = statusBadge.icon
              const deleting = deletingPageJobId === pageJob.id
              const downloading = downloadingPageJobId === pageJob.id
              const ready = pageJob.status === "completed"
              const displayTitle =
                pageJob.title ||
                pageJob.detected_title ||
                pageJob.suggested_metadata?.title ||
                t("untitledPage")

              return (
                <TableRow
                  key={pageJob.id}
                  className={cn(
                    "border-slate-100 transition-colors hover:bg-slate-50/60",
                    ready && "cursor-pointer"
                  )}
                  onClick={() => {
                    if (ready) onPreview(pageJob)
                  }}
                >
                  <TableCell className="px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="line-clamp-1 max-w-115 text-[13px] font-medium text-slate-900">
                        {displayTitle}
                      </p>
                      <p className="line-clamp-1 max-w-130 text-[11px] text-slate-400">
                        {pageJob.source_url}
                      </p>
                      {pageJob.error_message && (
                        <p className="mt-1 line-clamp-1 max-w-130 text-[11px] text-red-500">
                          {pageJob.error_message}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
                    >
                      {getCategoryLabel(pageJob, t)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-slate-500">
                    {pageJob.year ?? pageJob.suggested_metadata?.year ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                        statusBadge.className
                      )}
                    >
                      <StatusIcon className="size-3" />
                      {statusBadge.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-5">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg border-slate-200 bg-white text-slate-500 shadow-none hover:text-slate-900"
                        disabled={!ready}
                        onClick={(e) => {
                          e.stopPropagation()
                          onPreview(pageJob)
                        }}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg border-slate-200 bg-white text-slate-500 shadow-none hover:text-slate-900"
                        disabled={!ready || downloading}
                        onClick={(e) => {
                          e.stopPropagation()
                          onDownload(pageJob)
                        }}
                      >
                        {downloading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Download className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg border border-red-100 bg-white text-red-400 shadow-none hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        disabled={deleting}
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(pageJob)
                        }}
                      >
                        {deleting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 md:flex-row md:items-center md:justify-between">
        <p className="text-[12px] text-slate-500">
          {t("offsetOf", { offset, total: Math.max(total, 0) })}
        </p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text={t("prev")}
                className={cn(
                  "h-8 rounded-lg px-3 text-[12px]",
                  !hasPrev && "pointer-events-none opacity-40"
                )}
                onClick={(e) => {
                  e.preventDefault()
                  if (hasPrev) onPageChange(Math.max(0, offset - limit))
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                text={t("next")}
                className={cn(
                  "h-8 rounded-lg px-3 text-[12px]",
                  !hasNext && "pointer-events-none opacity-40"
                )}
                onClick={(e) => {
                  e.preventDefault()
                  if (hasNext) onPageChange(offset + limit)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

export default WebCrawlerPageJobTable
