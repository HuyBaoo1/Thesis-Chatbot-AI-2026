import { startTransition, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import WebCrawlerCreateDialog from "@/features/web-crawler/components/web-crawler-create-dialog"
import WebCrawlerPageJobTable from "@/features/web-crawler/components/web-crawler-page-job-table"
import WebCrawlerPreviewDialog from "@/features/web-crawler/components/web-crawler-preview-dialog"
import WebCrawlerSessionTable from "@/features/web-crawler/components/web-crawler-session-table"
import WebCrawlerToolbar, {
  type PageJobFilter,
} from "@/features/web-crawler/components/web-crawler-toolbar"
import useCrawl from "@/hooks/use-crawl"
import type {
  CreateCrawlSessionPayload,
  CrawlPageJob,
  CrawlPageJobListParams,
  CrawlSession,
  CrawlSessionListParams,
} from "@/types/crawl-type"
import {
  admissionCategoryOptions,
  type AdmissionCategory,
} from "@/types/knowledge-chunk-type"

const SESSION_PAGE_SIZE = 5
const PAGE_JOB_PAGE_SIZE = 8

const isAdmissionCategory = (value: unknown): value is AdmissionCategory =>
  admissionCategoryOptions.some((item) => item.value === value)

const getDefaultCategory = (pageJob: CrawlPageJob | null): AdmissionCategory =>
  isAdmissionCategory(pageJob?.category)
    ? pageJob.category
    : isAdmissionCategory(pageJob?.suggested_metadata?.category)
      ? pageJob.suggested_metadata.category
      : "FAQ"

const getDefaultTitle = (pageJob: CrawlPageJob | null) =>
  pageJob?.title ||
  pageJob?.detected_title ||
  pageJob?.suggested_metadata?.title ||
  pageJob?.source_url ||
  ""

const getSessionLabel = (session: CrawlSession | null) => {
  if (!session) return undefined
  try {
    const url = new URL(session.target_url)
    return `Session: ${url.hostname}`
  } catch {
    return `Session: ${session.target_url}`
  }
}

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

const WebCrawlerPage = () => {
  const { t } = useTranslation("web-crawler")
  const [sessionOffset, setSessionOffset] = useState(0)
  const [pageJobOffset, setPageJobOffset] = useState(0)
  const [selectedSession, setSelectedSession] = useState<CrawlSession | null>(
    null
  )
  const [searchInput, setSearchInput] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [pageJobFilter, setPageJobFilter] = useState<PageJobFilter>("ALL")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [selectedPageJob, setSelectedPageJob] = useState<CrawlPageJob | null>(
    null
  )
  const [markdownContent, setMarkdownContent] = useState("")
  const [draftContent, setDraftContent] = useState("")
  const [sendTitle, setSendTitle] = useState("")
  const [sendCategory, setSendCategory] = useState<AdmissionCategory>("FAQ")
  const [sendYear, setSendYear] = useState("")
  const [versionStart, setVersionStart] = useState("1")
  const [chunkSize, setChunkSize] = useState("1200")
  const [chunkOverlap, setChunkOverlap] = useState("100")
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null
  )
  const [deletingPageJobId, setDeletingPageJobId] = useState<string | null>(
    null
  )
  const [downloadingPageJobId, setDownloadingPageJobId] = useState<
    string | null
  >(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setPageJobOffset(0)
        setAppliedSearch(searchInput.trim())
      })
    }, 700)
    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const sessionParams: CrawlSessionListParams = {
    limit: SESSION_PAGE_SIZE,
    offset: sessionOffset,
  }
  const pageJobParams: CrawlPageJobListParams = {
    crawl_session_id: selectedSession?.id,
    sent_to_kb:
      pageJobFilter === "ALL" ? undefined : pageJobFilter === "SENT_KB",
    q: appliedSearch || undefined,
    limit: PAGE_JOB_PAGE_SIZE,
    offset: pageJobOffset,
  }

  const {
    crawlSessionList,
    crawlSessionListPending,
    crawlSessionListFetching,
    refetchCrawlSessions,
    crawlPageJobList,
    crawlPageJobListPending,
    crawlPageJobListFetching,
    refetchCrawlPageJobs,
    createCrawlSession: createCrawlSessionAction,
    createCrawlSessionPending,
    deleteCrawlSession: deleteCrawlSessionAction,
    getCrawlPageJobContent: getCrawlPageJobContentAction,
    getCrawlPageJobContentPending,
    updateCrawlPageJobContent: updateCrawlPageJobContentAction,
    updateCrawlPageJobContentPending,
    getCrawlPageJobDownloadUrl: getCrawlPageJobDownloadUrlAction,
    sendCrawlPageJobToKb: sendCrawlPageJobToKbAction,
    sendCrawlPageJobToKbPending,
    deleteCrawlPageJob: deleteCrawlPageJobAction,
  } = useCrawl(sessionParams, pageJobParams)

  const sessions = crawlSessionList?.items ?? []
  const sessionsTotal = crawlSessionList?.total ?? 0
  const pageJobs = crawlPageJobList?.items ?? []
  const pageJobsTotal = crawlPageJobList?.total ?? 0

  const resetPreviewState = () => {
    setSelectedPageJob(null)
    setMarkdownContent("")
    setDraftContent("")
    setSendTitle("")
    setSendCategory("FAQ")
    setSendYear("")
    setVersionStart("1")
    setChunkSize("1200")
    setChunkOverlap("100")
    setPreviewError(null)
  }

  const handleCreateSession = async (payload: CreateCrawlSessionPayload) => {
    setCreateError(null)
    setActionError(null)
    setActionSuccess(null)
    try {
      const session = await createCrawlSessionAction(payload)
      setSelectedSession(session)
      setSessionOffset(0)
      setPageJobOffset(0)
      setCreateDialogOpen(false)
      setActionSuccess("Crawl session created. Pages will appear as jobs.")
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Failed to create crawl session."
      )
    }
  }

  const handleRefresh = () => {
    setActionError(null)
    setActionSuccess(null)
    void refetchCrawlSessions()
    void refetchCrawlPageJobs()
  }

  const handleSelectSession = (session: CrawlSession) => {
    setSelectedSession(session)
    setPageJobOffset(0)
    setActionError(null)
    setActionSuccess(null)
  }

  const handleDeleteSession = async (session: CrawlSession) => {
    if (!window.confirm("Delete this crawl session and its page jobs?")) return
    setDeletingSessionId(session.id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await deleteCrawlSessionAction(session.id)
      if (selectedSession?.id === session.id) {
        setSelectedSession(null)
        setPageJobOffset(0)
      }
      if (sessions.length === 1 && sessionOffset > 0)
        setSessionOffset(Math.max(0, sessionOffset - SESSION_PAGE_SIZE))
      setActionSuccess("Crawl session deleted successfully.")
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to delete crawl session."
      )
    } finally {
      setDeletingSessionId(null)
    }
  }

  const openPreview = async (pageJob: CrawlPageJob) => {
    setSelectedPageJob(pageJob)
    setSendTitle(getDefaultTitle(pageJob))
    setSendCategory(getDefaultCategory(pageJob))
    setSendYear(String(pageJob.year ?? pageJob.suggested_metadata?.year ?? ""))
    setVersionStart(String(pageJob.version_start ?? 1))
    setChunkSize("1200")
    setChunkOverlap("100")
    setMarkdownContent("")
    setDraftContent("")
    setPreviewError(null)
    setActionError(null)
    setActionSuccess(null)
    setPreviewDialogOpen(true)
    try {
      const content = await getCrawlPageJobContentAction(pageJob.id)
      setMarkdownContent(content)
      setDraftContent(content)
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : "Failed to load crawled markdown."
      )
    }
  }

  const handlePreviewOpenChange = (open: boolean) => {
    setPreviewDialogOpen(open)
    if (!open) resetPreviewState()
  }

  const handleSaveMarkdown = async () => {
    if (!selectedPageJob) return
    setPreviewError(null)
    setActionError(null)
    setActionSuccess(null)
    try {
      const updatedPageJob = await updateCrawlPageJobContentAction({
        pageJobId: selectedPageJob.id,
        content: draftContent,
      })
      setSelectedPageJob(updatedPageJob)
      setMarkdownContent(draftContent)
      setActionSuccess("Markdown saved successfully.")
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Failed to save markdown."
      )
    }
  }

  const handleSendToKb = async () => {
    if (!selectedPageJob) return
    const normalizedYear = parseOptionalNumber(sendYear)
    const normalizedVersionStart = Number(versionStart || 1)
    const normalizedChunkSize = Number(chunkSize || 1200)
    const normalizedChunkOverlap = Number(chunkOverlap || 100)
    setPreviewError(null)
    setActionError(null)
    setActionSuccess(null)
    if (!sendTitle.trim()) {
      setPreviewError("Title is required before sending to KB.")
      return
    }
    if (sendYear.trim() && normalizedYear === undefined) {
      setPreviewError("Year must be a valid number.")
      return
    }
    if (normalizedChunkOverlap >= normalizedChunkSize) {
      setPreviewError("Chunk overlap must be smaller than chunk size.")
      return
    }
    try {
      await sendCrawlPageJobToKbAction({
        pageJobId: selectedPageJob.id,
        title: sendTitle.trim(),
        category: sendCategory,
        year: normalizedYear,
        version_start: normalizedVersionStart,
        chunk_size: normalizedChunkSize,
        chunk_overlap: normalizedChunkOverlap,
      })
      setPreviewDialogOpen(false)
      resetPreviewState()
      setActionSuccess("Crawled markdown sent to Knowledge Base successfully.")
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Failed to send page to KB."
      )
    }
  }

  const handleDownload = async (pageJob: CrawlPageJob) => {
    setDownloadingPageJobId(pageJob.id)
    setActionError(null)
    setActionSuccess(null)
    try {
      const url = await getCrawlPageJobDownloadUrlAction(pageJob.id)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to prepare download."
      )
    } finally {
      setDownloadingPageJobId(null)
    }
  }

  const handleDeletePageJob = async (pageJob: CrawlPageJob) => {
    if (!window.confirm("Delete this crawled page job?")) return
    setDeletingPageJobId(pageJob.id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await deleteCrawlPageJobAction(pageJob.id)
      if (pageJobs.length === 1 && pageJobOffset > 0)
        setPageJobOffset(Math.max(0, pageJobOffset - PAGE_JOB_PAGE_SIZE))
      setActionSuccess("Crawled page job deleted successfully.")
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to delete page job."
      )
    } finally {
      setDeletingPageJobId(null)
    }
  }

  const handleClearSession = () => {
    setSelectedSession(null)
    setPageJobOffset(0)
    setActionError(null)
    setActionSuccess(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-semibold text-slate-950">
          {t("title")}
        </h1>
        <p className="text-[13px] text-slate-500">{t("description")}</p>
      </div>

      <WebCrawlerToolbar
        sessionTotal={sessionsTotal}
        pageTotal={pageJobsTotal}
        searchInput={searchInput}
        pageJobFilter={pageJobFilter}
        selectedSessionLabel={getSessionLabel(selectedSession)}
        isFetching={crawlSessionListFetching || crawlPageJobListFetching}
        onSearchInputChange={setSearchInput}
        onPageJobFilterChange={(value) => {
          setPageJobFilter(value)
          setPageJobOffset(0)
        }}
        onCreateClick={() => {
          setCreateError(null)
          setActionError(null)
          setActionSuccess(null)
          setCreateDialogOpen(true)
        }}
        onRefreshClick={handleRefresh}
        onClearSession={handleClearSession}
      />

      {actionError && (
        <div className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-[13px] text-red-600">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-[13px] text-emerald-700">
          {actionSuccess}
        </div>
      )}

      <WebCrawlerSessionTable
        sessions={sessions}
        total={sessionsTotal}
        limit={SESSION_PAGE_SIZE}
        offset={sessionOffset}
        selectedSessionId={selectedSession?.id}
        isLoading={crawlSessionListPending}
        isFetching={crawlSessionListFetching}
        deletingSessionId={deletingSessionId}
        onPageChange={setSessionOffset}
        onSelectSession={handleSelectSession}
        onDeleteSession={(session) => void handleDeleteSession(session)}
      />

      <WebCrawlerPageJobTable
        pageJobs={pageJobs}
        total={pageJobsTotal}
        limit={PAGE_JOB_PAGE_SIZE}
        offset={pageJobOffset}
        isLoading={crawlPageJobListPending}
        isFetching={crawlPageJobListFetching}
        deletingPageJobId={deletingPageJobId}
        downloadingPageJobId={downloadingPageJobId}
        onPageChange={setPageJobOffset}
        onPreview={(pageJob) => void openPreview(pageJob)}
        onDownload={(pageJob) => void handleDownload(pageJob)}
        onDelete={(pageJob) => void handleDeletePageJob(pageJob)}
      />

      <WebCrawlerCreateDialog
        open={createDialogOpen}
        isSubmitting={createCrawlSessionPending}
        errorMessage={createError}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) setCreateError(null)
        }}
        onSubmit={(payload) => void handleCreateSession(payload)}
      />

      <WebCrawlerPreviewDialog
        open={previewDialogOpen}
        pageJob={selectedPageJob}
        content={markdownContent}
        draftContent={draftContent}
        title={sendTitle}
        category={sendCategory}
        year={sendYear}
        versionStart={versionStart}
        chunkSize={chunkSize}
        chunkOverlap={chunkOverlap}
        errorMessage={previewError}
        isLoading={getCrawlPageJobContentPending}
        isSaving={updateCrawlPageJobContentPending}
        isSending={sendCrawlPageJobToKbPending}
        onOpenChange={handlePreviewOpenChange}
        onDraftContentChange={setDraftContent}
        onTitleChange={setSendTitle}
        onCategoryChange={setSendCategory}
        onYearChange={setSendYear}
        onVersionStartChange={setVersionStart}
        onChunkSizeChange={setChunkSize}
        onChunkOverlapChange={setChunkOverlap}
        onSave={() => void handleSaveMarkdown()}
        onSendToKb={() => void handleSendToKb()}
      />
    </div>
  )
}

export default WebCrawlerPage
