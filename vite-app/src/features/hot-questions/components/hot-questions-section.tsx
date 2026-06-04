import { AlertCircle, ChevronRight, MessagesSquare, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/date"
import { cn } from "@/lib/utils"
import type {
  HotQuestion,
  HotQuestionsSummary,
} from "@/types/admin-analytics-type"

type HotQuestionsSectionProps = {
  summary?: HotQuestionsSummary
  items: HotQuestion[]
  intentOptions: readonly string[]
  intentFilter: string
  fallbackFilter: "ALL" | "TRUE" | "FALSE"
  searchValue: string
  total: number
  limit: number
  offset: number
  isLoading: boolean
  isFetching: boolean
  onIntentFilterChange: (value: string) => void
  onFallbackFilterChange: (value: "ALL" | "TRUE" | "FALSE") => void
  onSearchValueChange: (value: string) => void
  onPageChange: (page: number) => void
  onSelectQuestion: (questionId: string) => void
}

type SummaryChipProps = {
  label: string
  value: string
  tone?: "slate" | "amber"
}

const SummaryChip = ({ label, value, tone = "slate" }: SummaryChipProps) => (
  <div
    className={cn(
      "rounded-xl border px-3 py-2.5 shadow-xs",
      tone === "amber"
        ? "border-amber-100 bg-linear-to-br from-amber-50 to-white"
        : "border-slate-200 bg-linear-to-br from-slate-50 to-white"
    )}
  >
    <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
      {label}
    </p>
    <p className="mt-1 text-lg font-bold tracking-tight text-slate-950">
      {value}
    </p>
  </div>
)

const HotQuestionsSection = ({
  summary,
  items,
  intentOptions,
  intentFilter,
  fallbackFilter,
  searchValue,
  total,
  limit,
  offset,
  isLoading,
  isFetching,
  onIntentFilterChange,
  onFallbackFilterChange,
  onSearchValueChange,
  onPageChange,
  onSelectQuestion,
}: HotQuestionsSectionProps) => {
  const { t } = useTranslation("hot-questions")
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            {t("sectionTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("sectionHint")}
          </p>
        </div>

        {isFetching ? (
          <Badge
            variant="outline"
            className="border-slate-200 bg-white text-xs text-slate-500"
          >
            {t("refreshing")}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col border-b border-slate-100 p-5 xl:border-r xl:border-b-0">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryChip
              label={t("totalQuestionsLabel")}
              value={`${summary?.total_questions ?? 0}`}
            />
            <SummaryChip
              label={t("totalAsksLabel")}
              value={`${summary?.total_asks ?? 0}`}
            />
            <SummaryChip
              label={t("fallbackQuestionsLabel")}
              value={`${summary?.fallback_questions ?? 0}`}
              tone="amber"
            />
            <SummaryChip
              label={t("fallbackAsksLabel")}
              value={`${summary?.fallback_asks ?? 0}`}
              tone="amber"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                {t("questionTable")}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {t("questionTableHint")}
              </p>
            </div>

            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {t("recordsCount", { count: total })}
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchValueChange(event.target.value)}
                placeholder={t("searchPlaceholderExtended")}
                className="h-10 rounded-xl border-slate-200 bg-white pl-9 text-sm shadow-xs placeholder:text-slate-400 focus-visible:ring-slate-200"
              />
            </div>

            <Select value={intentFilter} onValueChange={onIntentFilterChange}>
              <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-sm shadow-xs focus:ring-slate-200">
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
              <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-sm shadow-xs focus:ring-slate-200">
                <SelectValue placeholder={t("filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allQuestions")}</SelectItem>
                <SelectItem value="TRUE">{t("fallbackOnly")}</SelectItem>
                <SelectItem value="FALSE">{t("answered")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex-1 overflow-hidden rounded-xl border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className="text-xs font-semibold text-slate-500">
                    {t("question")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">
                    {t("intent")}
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500">
                    {t("count")}
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500">
                    {t("fallback")}
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  Array.from({ length: limit }).map((_, index) => (
                    <TableRow key={index} className="border-slate-100">
                      <TableCell colSpan={5} className="py-2">
                        <Skeleton className="h-8 rounded-lg" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : items.length ? (
                  items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer border-slate-100 transition-colors hover:bg-slate-50/70"
                      onClick={() => onSelectQuestion(item.id)}
                    >
                      <TableCell className="max-w-105 py-3">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                          {item.question}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {t("lastAskedLabel")} {formatDateTime(item.last_asked_at)}
                        </p>
                      </TableCell>

                      <TableCell className="text-sm text-slate-600">
                        {item.intent ?? "--"}
                      </TableCell>

                      <TableCell className="text-right text-sm font-semibold text-slate-900">
                        {item.count}
                      </TableCell>

                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "inline-block rounded-lg px-2 py-0.5 text-xs font-medium",
                            item.is_fallback
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          )}
                        >
                          {item.is_fallback ? t("yesFallback") : t("noFallback")}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          onClick={(event) => {
                            event.stopPropagation()
                            onSelectQuestion(item.id)
                          }}
                          aria-label={t("viewDetailAriaLabel")}
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 ring-1 ring-slate-200">
                          <MessagesSquare className="size-4 text-slate-400" />
                        </div>
                        <p className="text-xs text-slate-500">
                          {t("noResults")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              {t("pageInfo", { current: currentPage, total: totalPages, count: items.length })}
            </p>

            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    text={t("prev")}
                    className={cn(
                      "h-8 rounded-lg px-3 text-xs",
                      !canGoPrevious && "pointer-events-none opacity-40"
                    )}
                    onClick={(event) => {
                      event.preventDefault()
                      if (canGoPrevious) onPageChange(currentPage - 1)
                    }}
                  />
                </PaginationItem>

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    text={t("next")}
                    className={cn(
                      "h-8 rounded-lg px-3 text-xs",
                      !canGoNext && "pointer-events-none opacity-40"
                    )}
                    onClick={(event) => {
                      event.preventDefault()
                      if (canGoNext) onPageChange(currentPage + 1)
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>

        <div className="p-5">
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              {t("topIntents")}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {t("topIntentsHint")}
            </p>
          </div>

          <Separator className="my-4" />

          <div className="space-y-1.5">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-9 rounded-xl" />
              ))
            ) : summary?.top_intents?.length ? (
              summary.top_intents.map((item, index) => (
                <div
                  key={item.intent}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 transition-colors hover:border-slate-200 hover:bg-white"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-slate-200 text-[10px] font-bold text-slate-600">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                    {item.intent}
                  </span>
                  <span className="shrink-0 rounded-lg bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-xs text-slate-400">
                {t("noTopIntents")}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-amber-100 bg-linear-to-br from-amber-50 to-white p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 ring-1 ring-amber-200">
                <AlertCircle className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-950">
                  {t("fallbackOverview")}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {t("fallbackSummary", { questions: summary?.fallback_questions ?? 0, asks: summary?.fallback_asks ?? 0 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HotQuestionsSection
