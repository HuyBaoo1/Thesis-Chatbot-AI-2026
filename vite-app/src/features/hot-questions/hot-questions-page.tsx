import { useQuery } from "@tanstack/react-query"
import { startTransition, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { getMessageSources } from "@/api/chat-api"
import {
  getHotQuestionDetail,
  getHotQuestions,
  getHotQuestionsSummary,
} from "@/api/admin-analytics-api"
import HotQuestionDetailDialog from "@/features/hot-questions/components/hot-question-detail-dialog"
import HotQuestionsInsights from "@/features/hot-questions/components/hot-questions-insights"
import HotQuestionsTable from "@/features/hot-questions/components/hot-questions-table"
import HotQuestionsToolbar from "@/features/hot-questions/components/hot-questions-toolbar"
import {
  HOT_QUESTION_INTENT_OPTIONS,
  HOT_QUESTIONS_PAGE_SIZE,
} from "@/features/hot-questions/constants"

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const HotQuestionsPage = () => {
  const { t } = useTranslation("hot-questions")
  const [searchInput, setSearchInput] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [offset, setOffset] = useState(0)
  const [questionId, setQuestionId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [intentFilter, setIntentFilter] = useState<string>("ALL")
  const [fallbackFilter, setFallbackFilter] = useState<
    "ALL" | "TRUE" | "FALSE"
  >("ALL")

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setOffset(0)
        setAppliedSearch(searchInput.trim())
      })
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const hotQuestionsSummaryQuery = useQuery({
    queryKey: ["admin-analytics", "hot-questions-summary"],
    queryFn: () => getHotQuestionsSummary(),
    placeholderData: (previousData) => previousData,
  })

  const hotQuestionsListQuery = useQuery({
    queryKey: [
      "admin-analytics",
      "hot-questions",
      intentFilter,
      fallbackFilter,
      appliedSearch,
      offset,
      HOT_QUESTIONS_PAGE_SIZE,
    ],
    queryFn: () =>
      getHotQuestions({
        limit: HOT_QUESTIONS_PAGE_SIZE,
        offset,
        intent: intentFilter === "ALL" ? undefined : intentFilter,
        fallback_only:
          fallbackFilter === "ALL" ? undefined : fallbackFilter === "TRUE",
        q: appliedSearch || undefined,
      }),
    placeholderData: (previousData) => previousData,
  })

  const hotQuestionDetailQuery = useQuery({
    queryKey: ["admin-analytics", "hot-question-detail", questionId],
    queryFn: () => getHotQuestionDetail(questionId as string),
    enabled: dialogOpen && Boolean(questionId),
  })

  const assistantMessageId =
    hotQuestionDetailQuery.data?.last_assistant_message_id ?? null

  const messageSourcesQuery = useQuery({
    queryKey: ["chat", "message-sources", assistantMessageId],
    queryFn: () => getMessageSources(assistantMessageId as string),
    enabled: dialogOpen && Boolean(assistantMessageId),
  })

  const intentOptions = useMemo(() => {
    const values = new Set<string>(HOT_QUESTION_INTENT_OPTIONS)

    hotQuestionsSummaryQuery.data?.top_intents?.forEach((item) => {
      if (item.intent) {
        values.add(item.intent)
      }
    })

    hotQuestionsListQuery.data?.items?.forEach((item) => {
      if (item.intent) {
        values.add(item.intent)
      }
    })

    return Array.from(values)
  }, [
    hotQuestionsListQuery.data?.items,
    hotQuestionsSummaryQuery.data?.top_intents,
  ])

  const surfaceError =
    getErrorMessage(hotQuestionsSummaryQuery.error, "") ||
    getErrorMessage(hotQuestionsListQuery.error, "") ||
    getErrorMessage(hotQuestionDetailQuery.error, "") ||
    getErrorMessage(messageSourcesQuery.error, "")

  const handleClearFilters = () => {
    setSearchInput("")
    setAppliedSearch("")
    setIntentFilter("ALL")
    setFallbackFilter("ALL")
    setOffset(0)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-950">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("description")}</p>
      </div>

      <HotQuestionsToolbar
        searchInput={searchInput}
        appliedSearch={appliedSearch}
        intentFilter={intentFilter}
        fallbackFilter={fallbackFilter}
        intentOptions={intentOptions}
        onSearchInputChange={setSearchInput}
        onIntentFilterChange={(value) => {
          setIntentFilter(value)
          setOffset(0)
        }}
        onFallbackFilterChange={(value) => {
          setFallbackFilter(value)
          setOffset(0)
        }}
        onClearFilters={handleClearFilters}
      />

      {surfaceError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-600">
          {surfaceError}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <HotQuestionsTable
          items={hotQuestionsListQuery.data?.items ?? []}
          total={hotQuestionsListQuery.data?.total ?? 0}
          limit={hotQuestionsListQuery.data?.limit ?? HOT_QUESTIONS_PAGE_SIZE}
          offset={hotQuestionsListQuery.data?.offset ?? offset}
          selectedQuestionId={dialogOpen ? questionId : null}
          isLoading={hotQuestionsListQuery.isLoading}
          isFetching={hotQuestionsListQuery.isFetching}
          onPageChange={(page) => {
            setOffset((page - 1) * HOT_QUESTIONS_PAGE_SIZE)
          }}
          onSelect={(question) => {
            setQuestionId(question.id)
            setDialogOpen(true)
          }}
        />

        <HotQuestionsInsights
          summary={hotQuestionsSummaryQuery.data}
          isLoading={hotQuestionsSummaryQuery.isLoading}
        />
      </div>

      <HotQuestionDetailDialog
        open={dialogOpen}
        detail={hotQuestionDetailQuery.data}
        sources={messageSourcesQuery.data}
        isLoading={hotQuestionDetailQuery.isLoading}
        isFetching={hotQuestionDetailQuery.isFetching}
        isSourcesLoading={messageSourcesQuery.isLoading}
        isSourcesFetching={messageSourcesQuery.isFetching}
        sourcesError={getErrorMessage(messageSourcesQuery.error, "")}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setQuestionId(null)
          }
        }}
      />
    </div>
  )
}

export default HotQuestionsPage
