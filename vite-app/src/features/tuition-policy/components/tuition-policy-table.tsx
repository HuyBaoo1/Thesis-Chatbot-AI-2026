import { CreditCard, Loader2, Power, PowerOff, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

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
import { formatDateOnly } from "@/lib/date"
import { buildPageItems, cn } from "@/lib/utils"
import {
  feeTypeLabelMap,
  type TuitionPolicy,
} from "@/types/tuition-policy-type"

type TuitionPolicyTableProps = {
  canManage?: boolean
  items: TuitionPolicy[]
  total: number
  limit: number
  offset: number
  majorNameById: Record<string, string>
  isLoading?: boolean
  isFetching?: boolean
  togglingPolicyId?: string | null
  onPageChange: (page: number) => void
  onEdit: (policy: TuitionPolicy) => void
  onDelete: (policy: TuitionPolicy) => void
  onToggleStatus: (policy: TuitionPolicy) => void
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value)

const TuitionPolicyTable = ({
  canManage = true,
  items,
  total,
  limit,
  offset,
  majorNameById,
  isLoading = false,
  isFetching = false,
  togglingPolicyId = null,
  onPageChange,
  onEdit,
  onDelete,
  onToggleStatus,
}: TuitionPolicyTableProps) => {
  const { t } = useTranslation("tuition-policy")
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const pageItems = buildPageItems(currentPage, totalPages)

  return (
    <div className="overflow-hidden rounded-2xl border border-t-[2.5px] border-slate-200/70 border-t-[#d6ae4e] bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-slate-900">
            {t("title")}
          </h2>
          <p className="text-[12px] text-slate-500">
            {t("totalPolicies", { count: total })}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500">
          {isFetching && !isLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : null}
          <span>
            {items.length ? offset + 1 : 0}–{offset + items.length} / {total}
          </span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
            <TableHead className="px-5 text-[11px] font-medium text-slate-500">
              {t("major")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("year")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("feeType")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("baseFee")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("status")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("updated")}
            </TableHead>
            <TableHead className="w-20 pr-5 text-right text-[11px] font-medium text-slate-500">
              {t("actions")}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <TableRow
                  key={`tuition-policy-skeleton-${index}`}
                  className="border-slate-100"
                >
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-xl" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-40 rounded-full" />
                        <Skeleton className="h-3 w-24 rounded-full" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3.5 w-14 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3.5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-7 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3.5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell className="pr-5">
                    <Skeleton className="ml-auto size-8 rounded-lg" />
                  </TableCell>
                </TableRow>
              ))
            : null}

          {!isLoading && items.length === 0 ? (
            <TableRow className="hover:bg-white">
              <TableCell colSpan={7} className="py-20 text-center">
                <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                    <CreditCard className="size-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">
                      {t("notFound")}
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {t("notFoundHint")}
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : null}

          {!isLoading
            ? items.map((policy) => {
                const isToggling = togglingPolicyId === policy.id
                const majorLabel =
                  majorNameById[policy.major_id] ?? t("unknownMajor")

                return (
                  <TableRow
                    key={policy.id}
                    tabIndex={canManage ? 0 : undefined}
                    className={cn(
                      "border-slate-100 transition-colors hover:bg-slate-50/60",
                      canManage && "cursor-pointer"
                    )}
                    onClick={() => {
                      if (canManage) {
                        onEdit(policy)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (canManage && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        onEdit(policy)
                      }
                    }}
                  >
                    <TableCell className="px-5 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-100 to-teal-100 text-emerald-700">
                          <CreditCard className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-900">
                            {majorLabel}
                          </p>
                          <p className="font-mono text-[10px] tracking-[0.12em] text-slate-400">
                            {policy.major_id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-[12px] text-slate-500">
                      {policy.year}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
                      >
                        {feeTypeLabelMap[policy.fee_type]}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-mono text-[12px] font-medium text-slate-700">
                      {formatCurrency(policy.base_fee)}
                    </TableCell>

                    <TableCell>
                      <button
                        type="button"
                        disabled={!canManage || isToggling}
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (canManage) {
                            onToggleStatus(policy)
                          }
                        }}
                        className={cn(
                          "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition-colors",
                          policy.is_active
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
                          canManage &&
                            policy.is_active &&
                            "hover:bg-emerald-100",
                          canManage &&
                            !policy.is_active &&
                            "hover:bg-slate-200",
                          (!canManage || isToggling) &&
                            "cursor-not-allowed opacity-60"
                        )}
                      >
                        {isToggling ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : policy.is_active ? (
                          <Power className="size-3" />
                        ) : (
                          <PowerOff className="size-3" />
                        )}
                        {policy.is_active ? t("active") : t("inactive")}
                      </button>
                    </TableCell>

                    <TableCell className="text-[12px] text-slate-500">
                      {formatDateOnly(policy.updated_at)}
                    </TableCell>

                    <TableCell className="pr-5">
                      {canManage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          tabIndex={-1}
                          className="ml-auto size-8 rounded-lg border border-red-100 bg-white text-red-400 shadow-none hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(policy)
                          }}
                          aria-label={t("delete")}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : (
                        <span className="ml-auto block text-right text-[12px] text-slate-300">
                          -
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            : null}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 md:flex-row md:items-center md:justify-between">
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
                onClick={(e) => {
                  e.preventDefault()
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
                  onClick={(e) => {
                    e.preventDefault()
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
                  currentPage === totalPages && "pointer-events-none opacity-40"
                )}
                onClick={(e) => {
                  e.preventDefault()
                  if (currentPage < totalPages) onPageChange(currentPage + 1)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

export default TuitionPolicyTable
