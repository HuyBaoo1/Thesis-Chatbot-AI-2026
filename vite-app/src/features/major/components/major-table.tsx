import {
  BookType,
  GraduationCap,
  Loader2,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react"
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
import { majorTypeLabelMap, type Major } from "@/types/major-type"

type MajorTableProps = {
  canManage?: boolean
  items: Major[]
  total: number
  limit: number
  offset: number
  isLoading?: boolean
  isFetching?: boolean
  togglingMajorId?: string | null
  onPageChange: (page: number) => void
  onEdit: (major: Major) => void
  onDelete: (major: Major) => void
  onToggleStatus: (major: Major) => void
}

const MajorTable = ({
  canManage = true,
  items,
  total,
  limit,
  offset,
  isLoading = false,
  isFetching = false,
  togglingMajorId = null,
  onPageChange,
  onEdit,
  onDelete,
  onToggleStatus,
}: MajorTableProps) => {
  const { t } = useTranslation("major")
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const pageItems = buildPageItems(currentPage, totalPages)

  return (
    <div className="overflow-hidden rounded-2xl border border-t-[2.5px] border-slate-200/70 border-t-[#d6ae4e] bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-slate-900">
            {t("catalog")}
          </h2>
          <p className="text-[12px] text-slate-500">
            {t("totalMajors", { count: total })}
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
              {t("majorType")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("degreeType")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("credits")}
            </TableHead>
            <TableHead className="text-[11px] font-medium text-slate-500">
              {t("duration")}
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
            ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow
                  key={`major-skeleton-${i}`}
                  className="border-slate-100"
                >
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-xl" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-40 rounded-full" />
                        <Skeleton className="h-3 w-64 rounded-full" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3.5 w-24 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3.5 w-8 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3.5 w-8 rounded-full" />
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
              <TableCell colSpan={8} className="py-20 text-center">
                <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                    <GraduationCap className="size-5 text-slate-400" />
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
            ? items.map((major) => {
                const isToggling = togglingMajorId === major.id

                return (
                  <TableRow
                    key={major.id}
                    tabIndex={canManage ? 0 : undefined}
                    className={cn(
                      "border-slate-100 transition-colors hover:bg-slate-50/60",
                      canManage && "cursor-pointer"
                    )}
                    onClick={() => {
                      if (canManage) {
                        onEdit(major)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (canManage && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        onEdit(major)
                      }
                    }}
                  >
                    <TableCell className="px-5 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-100 to-orange-100 text-amber-700">
                          <GraduationCap className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-900">
                            {major.name}
                          </p>
                          <p className="text-[10px] tracking-[0.18em] text-slate-400 uppercase">
                            {major.code}
                          </p>
                          {major.description ? (
                            <p className="line-clamp-1 max-w-[320px] text-[12px] text-slate-400">
                              {major.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700"
                    >
                      <BookType className="size-3" />
                      {t(majorTypeLabelMap[major.major_type])}
                    </Badge>
                  </TableCell>

                    <TableCell className="text-[12px] text-slate-500">
                      {major.degree_type || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-slate-500">
                      {major.credits ?? "—"}
                    </TableCell>
                    <TableCell className="text-[12px] text-slate-500">
                      {major.duration !== null
                        ? t("years", { count: major.duration })
                        : "—"}
                    </TableCell>

                    <TableCell>
                      <button
                        type="button"
                        disabled={!canManage || isToggling}
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (canManage) {
                            onToggleStatus(major)
                          }
                        }}
                        className={cn(
                          "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition-colors",
                          major.is_active
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
                          canManage && major.is_active && "hover:bg-emerald-100",
                          canManage && !major.is_active && "hover:bg-slate-200",
                          (!canManage || isToggling) &&
                            "cursor-not-allowed opacity-60"
                        )}
                      >
                        {isToggling ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : major.is_active ? (
                          <Power className="size-3" />
                        ) : (
                          <PowerOff className="size-3" />
                        )}
                        {major.is_active ? t("active") : t("inactive")}
                      </button>
                    </TableCell>

                    <TableCell className="text-[12px] text-slate-500">
                      {formatDateOnly(major.updated_at)}
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
                            onDelete(major)
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

export default MajorTable
