import { Activity, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/date"
import { buildPageItems, cn } from "@/lib/utils"
import type { Lead, LeadActivity } from "@/types/lead-type"

type LeadActivitiesDialogProps = {
  open: boolean
  lead?: Lead | null
  activities?: LeadActivity[]
  total?: number
  limit: number
  offset: number
  isLoading?: boolean
  isFetching?: boolean
  onOpenChange: (open: boolean) => void
  onPageChange: (page: number) => void
}

const LeadActivitiesDialog = ({
  open,
  lead,
  activities = [],
  total = 0,
  limit,
  offset,
  isLoading = false,
  isFetching = false,
  onOpenChange,
  onPageChange,
}: LeadActivitiesDialogProps) => {
  const { t } = useTranslation("leads")
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const pageItems = buildPageItems(currentPage, totalPages)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)] sm:max-w-3xl">
        <div className="h-0.75 bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

        <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Activity className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-semibold text-slate-900">
                {lead?.full_name || t("lead")} - {t("activities")}
              </DialogTitle>
              <DialogDescription className="text-[12px] text-slate-500">
                {t("activitiesDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(100vh-14rem)] overflow-y-auto px-6 py-5">
          <div className="mb-4 flex items-center justify-between text-[12px] text-slate-500">
            <span>{t("totalActivities", { count: total })}</span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500">
              {isFetching && !isLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              {activities.length ? offset + 1 : 0}-{offset + activities.length}{" "}
              {t("outOf")} {total}
            </span>
          </div>

          <div className="space-y-3">
            {isLoading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 rounded-2xl" />
                ))
              : null}

            {!isLoading && activities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-900">
                  {t("noActivities")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {t("noActivitiesHint")}
                </p>
              </div>
            ) : null}

            {!isLoading
              ? activities.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white px-4 py-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {item.action}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(item.created_at)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                          item.score_delta >= 0
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        )}
                      >
                        {item.score_delta >= 0 ? "+" : ""}
                        {item.score_delta}
                      </Badge>
                    </div>

                    {item.extra_data ? (
                      <pre className="mt-3 overflow-x-auto rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                        {JSON.stringify(item.extra_data, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))
              : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-[12px] text-slate-500">
            {t("page", { current: currentPage, total: totalPages })}
          </p>

          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text={t("prev")}
                  className={cn(
                    "h-8 rounded-lg px-3 text-[12px]",
                    currentPage === 1 && "pointer-events-none opacity-40"
                  )}
                  onClick={(event) => {
                    event.preventDefault()
                    if (currentPage > 1) onPageChange(currentPage - 1)
                  }}
                />
              </PaginationItem>

              {pageItems.map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={page === currentPage}
                    className="h-8 w-8 rounded-lg text-[12px]"
                    onClick={(event) => {
                      event.preventDefault()
                      onPageChange(page)
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  text={t("next")}
                  className={cn(
                    "h-8 rounded-lg px-3 text-[12px]",
                    currentPage === totalPages &&
                      "pointer-events-none opacity-40"
                  )}
                  onClick={(event) => {
                    event.preventDefault()
                    if (currentPage < totalPages) onPageChange(currentPage + 1)
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LeadActivitiesDialog
