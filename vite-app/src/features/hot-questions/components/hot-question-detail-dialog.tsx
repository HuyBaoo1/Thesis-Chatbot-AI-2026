import { FileSearch, Loader2, MessageSquareQuote } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { HotQuestion } from "@/types/admin-analytics-type"
import type { MessageSources } from "@/types/chat-type"

type HotQuestionDetailDialogProps = {
  open: boolean
  detail?: HotQuestion
  sources?: MessageSources
  isLoading: boolean
  isFetching: boolean
  isSourcesLoading?: boolean
  isSourcesFetching?: boolean
  sourcesError?: string
  onOpenChange: (open: boolean) => void
}

const HotQuestionDetailDialog = ({
  open,
  detail,
  sources,
  isLoading,
  isFetching,
  isSourcesLoading = false,
  isSourcesFetching = false,
  sourcesError = "",
  onOpenChange,
}: HotQuestionDetailDialogProps) => {
  const { t } = useTranslation("hot-questions")
  const { t: tc } = useTranslation("common")
  const hasAssistantMessage = Boolean(detail?.last_assistant_message_id)
  const sourceItems = sources?.items ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)] sm:max-w-3xl">
        <div className="h-0.75 bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

        <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <MessageSquareQuote className="size-4" />
            </div>

            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[15px] font-semibold text-slate-900">
                {t("detailTitle")}
              </DialogTitle>
              <DialogDescription className="text-[12px] text-slate-500">
                {t("detailDescription")}
              </DialogDescription>
            </div>

            {isFetching ? (
              <Badge
                variant="outline"
                className="shrink-0 border-slate-200 bg-white text-[11px] text-slate-500"
              >
                {t("loading")}
              </Badge>
            ) : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {isLoading && !detail ? (
            <>
              <Skeleton className="h-10 rounded-xl" />
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl" />
              ))}
            </>
          ) : detail ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
                    <FileSearch className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900">
                      {t("sourceChunks")}
                    </p>
                    <p className="text-[12px] text-slate-500">
                      {t("messageIdLabel")}{" "}
                      {detail.last_assistant_message_id ?? "--"}
                    </p>
                  </div>
                </div>

                {isSourcesFetching ? (
                  <Badge
                    variant="outline"
                    className="w-fit shrink-0 gap-1 border-slate-200 bg-white text-[11px] text-slate-500"
                  >
                    <Loader2 className="size-3 animate-spin" />
                    {t("loading")}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="w-fit shrink-0 border-slate-200 bg-white text-[11px] text-slate-500"
                  >
                    {t("chunkCount", { count: sourceItems.length })}
                  </Badge>
                )}
              </div>

              {!hasAssistantMessage ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-[12px] text-slate-500">
                  {t("noAssistantMessage")}
                </div>
              ) : sourcesError ? (
                <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-[12px] text-red-600">
                  {sourcesError}
                </div>
              ) : isSourcesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : sourceItems.length > 0 ? (
                <div className="space-y-2.5">
                  {sourceItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 shadow-none transition-colors hover:bg-slate-50/70"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className="rounded-full border-slate-200 bg-slate-50 text-[11px] text-slate-700"
                            >
                              {t("rankLabel", { rank: item.rank ?? index + 1 })}
                            </Badge>

                            {item.category ? (
                              <Badge
                                variant="outline"
                                className="rounded-full border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700"
                              >
                                {item.category}
                              </Badge>
                            ) : null}

                            {item.score !== null ? (
                              <span className="font-mono text-[11px] text-slate-500">
                                {t("scoreLabel", {
                                  score: item.score.toFixed(3),
                                })}
                              </span>
                            ) : null}
                          </div>

                          <p className="text-xs wrap-break-word text-slate-500">
                            {item.source ?? t("unknownSource")}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-[13px] leading-6 wrap-break-word whitespace-pre-wrap text-slate-800">
                        {item.content ?? "--"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-[12px] text-slate-500">
                  {t("noChunksRecorded")}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-[12px] text-slate-500">
              {t("selectQuestionHint")}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 shadow-none hover:bg-slate-50 hover:text-slate-900"
            onClick={() => onOpenChange(false)}
          >
            {tc("close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default HotQuestionDetailDialog
