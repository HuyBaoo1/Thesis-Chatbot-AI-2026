import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  RefreshCcw,
  Trash2,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
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
import { buildPageItems, cn } from "@/lib/utils"
import {
  admissionCategoryLabelMap,
  type AdmissionCategory,
} from "@/types/knowledge-chunk-type"
import type { OcrJob } from "@/types/ocr-type"

type QuickProcessingTableProps = {
  jobs: OcrJob[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  isLoading?: boolean
  isFetching?: boolean
  deletingJobId?: string | null
  downloadingJobId?: string | null
  retryingJobId?: string | null
  onPageChange: (page: number) => void
  onPreview: (job: OcrJob) => void
  onDownload: (job: OcrJob) => void
  onRetry: (job: OcrJob) => void
  onDelete: (job: OcrJob) => void
}

const isCompleted = (job: OcrJob) => job.status === "completed"
const isFailed = (job: OcrJob) => job.status === "failed"
const isProcessing = (job: OcrJob) =>
  ["queued", "started", "deferred"].includes(job.status)

const getCategoryLabel = (
  category?: string | null,
  t?: (key: string) => string
) => {
  if (!category) return t?.("uncategorized") ?? "Uncategorized"
  return (
    admissionCategoryLabelMap[category as AdmissionCategory] ||
    category.replaceAll("_", " ")
  )
}

const getStatusBadge = (job: OcrJob, t: (key: string) => string) => {
  if (job.sent_to_kb)
    return {
      label: t("sentToKbStatus"),
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    }
  if (isCompleted(job))
    return {
      label: t("ready"),
      className: "border-blue-200 bg-blue-50 text-blue-700",
      icon: CheckCircle2,
    }
  if (isFailed(job))
    return {
      label: t("failed"),
      className: "border-red-200 bg-red-50 text-red-600",
      icon: XCircle,
    }
  return {
    label: job.status || t("pending"),
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: Loader2,
  }
}

const QuickProcessingTable = ({
  jobs,
  total,
  page,
  pageSize,
  totalPages,
  isLoading = false,
  isFetching = false,
  deletingJobId = null,
  downloadingJobId = null,
  retryingJobId = null,
  onPageChange,
  onPreview,
  onDownload,
  onRetry,
  onDelete,
}: QuickProcessingTableProps) => {
  const { t } = useTranslation("quick-processing")
  const normalizedTotalPages = Math.max(1, totalPages)
  const pageItems = useMemo(
    () => buildPageItems(page, normalizedTotalPages),
    [page, normalizedTotalPages]
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-t-[2.5px] border-slate-200/70 border-t-[#d6ae4e] bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-slate-900">
            {t("recentOcrJobs")}
          </h2>
          <p className="text-[12px] text-slate-500">
            {t("reviewMarkdownHint")}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500">
          {isFetching && !isLoading && (
            <Loader2 className="size-3.5 animate-spin" />
          )}
          <span>
            {jobs.length ? (page - 1) * pageSize + 1 : 0}–
            {(page - 1) * pageSize + jobs.length} / {total}
          </span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
            <TableHead className="px-5 text-[11px] font-medium text-slate-500">
              {t("document")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("category")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("version")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("pages")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("status")}
            </TableHead>
            <TableHead className="w-48 pr-5 text-right text-[11px] font-medium text-slate-500">
              {t("actions")}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={`ocr-skeleton-${i}`} className="border-slate-100">
                <TableCell className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-44 rounded-full" />
                      <Skeleton className="h-3 w-64 rounded-full" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-3.5 w-8 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-3.5 w-8 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </TableCell>
                <TableCell className="pr-5">
                  <Skeleton className="ml-auto h-8 w-28 rounded-lg" />
                </TableCell>
              </TableRow>
            ))}

          {!isLoading && jobs.length === 0 && (
            <TableRow className="hover:bg-white">
              <TableCell colSpan={6} className="py-20 text-center">
                <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                    <FileText className="size-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">
                      {t("noJobs")}
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {t("noJobsHint")}
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            jobs.map((job) => {
              const statusBadge = getStatusBadge(job, t)
              const StatusIcon = statusBadge.icon
              const deleting = deletingJobId === job.job_id
              const downloading = downloadingJobId === job.job_id
              const retrying = retryingJobId === job.job_id
              const completed = isCompleted(job)
              const failed = isFailed(job)
              const processing = isProcessing(job)
              const progress = Math.max(0, Math.min(100, job.progress ?? 0))

              return (
                <TableRow
                  key={job.job_id}
                  className={cn(
                    "border-slate-100 transition-colors hover:bg-slate-50/60",
                    completed && "cursor-pointer"
                  )}
                  onClick={() => {
                    if (completed) onPreview(job)
                  }}
                >
                  <TableCell className="px-5 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-sky-100 to-slate-100 text-sky-700">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-slate-900">
                          {job.title || job.original_filename || t("ocrJob")}
                        </p>
                        <p className="line-clamp-1 max-w-90 text-[12px] text-slate-400">
                          {job.original_filename || job.job_id}
                        </p>
                        {processing && (
                          <div className="mt-2 h-1.5 max-w-56 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-sky-500 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                        {job.error_message && (
                          <p
                            className="mt-1 line-clamp-1 max-w-90 text-[11px] text-red-500"
                            title={job.error_message}
                          >
                            {job.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
                    >
                      {getCategoryLabel(job.category, t)}
                    </Badge>
                  </TableCell>

                  <TableCell className="font-mono text-[12px] text-slate-500">
                    v{job.version_start ?? 1}
                  </TableCell>
                  <TableCell className="text-[12px] text-slate-500">
                    {job.pages ?? "—"}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                        statusBadge.className
                      )}
                    >
                      <StatusIcon
                        className={cn("size-3", processing && "animate-spin")}
                      />
                      {statusBadge.label}
                    </Badge>
                    {processing && job.stage && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        {job.stage}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="pr-5">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg border-slate-200 bg-white text-slate-500 shadow-none hover:text-slate-900"
                        disabled={!completed}
                        onClick={(e) => {
                          e.stopPropagation()
                          onPreview(job)
                        }}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg border-slate-200 bg-white text-slate-500 shadow-none hover:text-slate-900"
                        disabled={!completed || downloading}
                        onClick={(e) => {
                          e.stopPropagation()
                          onDownload(job)
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
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg border-amber-200 bg-white text-amber-600 shadow-none hover:bg-amber-50 hover:text-amber-700"
                        disabled={!failed || retrying}
                        onClick={(e) => {
                          e.stopPropagation()
                          onRetry(job)
                        }}
                      >
                        {retrying ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RefreshCcw className="size-3.5" />
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
                          onDelete(job)
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
          {t("pageInfo", { current: page, total: normalizedTotalPages })}
        </p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text={t("prev")}
                className={cn(
                  "h-8 rounded-lg px-3 text-[12px]",
                  page === 1 && "pointer-events-none opacity-40"
                )}
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) onPageChange(page - 1)
                }}
              />
            </PaginationItem>
            {pageItems.map((pageItem) => (
              <PaginationItem key={pageItem}>
                <PaginationLink
                  href="#"
                  isActive={pageItem === page}
                  className="h-8 w-8 rounded-lg text-[12px]"
                  onClick={(e) => {
                    e.preventDefault()
                    onPageChange(pageItem)
                  }}
                >
                  {pageItem}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                text={t("next")}
                className={cn(
                  "h-8 rounded-lg px-3 text-[12px]",
                  page === normalizedTotalPages &&
                    "pointer-events-none opacity-40"
                )}
                onClick={(e) => {
                  e.preventDefault()
                  if (page < normalizedTotalPages) onPageChange(page + 1)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

export default QuickProcessingTable
