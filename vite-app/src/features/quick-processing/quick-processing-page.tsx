import { useState } from "react"
import { useTranslation } from "react-i18next"

import QuickProcessingPreviewDialog from "@/features/quick-processing/components/quick-processing-preview-dialog"
import QuickProcessingTable from "@/features/quick-processing/components/quick-processing-table"
import QuickProcessingToolbar from "@/features/quick-processing/components/quick-processing-toolbar"
import QuickProcessingUploadDialog from "@/features/quick-processing/components/quick-processing-upload-dialog"
import useOcr from "@/hooks/use-ocr"
import {
  admissionCategoryOptions,
  type AdmissionCategory,
} from "@/types/knowledge-chunk-type"
import type { OcrJob } from "@/types/ocr-type"

const PAGE_SIZE = 8

const isAdmissionCategory = (value: unknown): value is AdmissionCategory =>
  admissionCategoryOptions.some((item) => item.value === value)

const getDefaultCategory = (job: OcrJob | null): AdmissionCategory =>
  isAdmissionCategory(job?.category) ? job.category : "FAQ"

const QuickProcessingPage = () => {
  const { t } = useTranslation("quick-processing")
  const [page, setPage] = useState(1)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<OcrJob | null>(null)
  const [markdownContent, setMarkdownContent] = useState("")
  const [draftContent, setDraftContent] = useState("")
  const [sendCategory, setSendCategory] = useState<AdmissionCategory>("FAQ")
  const [chunkSize, setChunkSize] = useState("1200")
  const [chunkOverlap, setChunkOverlap] = useState("100")
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null)
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null)

  const {
    ocrJobList,
    ocrJobListPending,
    ocrJobListFetching,
    refetchOcrJobs,
    createOcrJob: createOcrJobAction,
    createOcrJobPending,
    getOcrJobContent: getOcrJobContentAction,
    getOcrJobContentPending,
    getOcrJobDownloadUrl: getOcrJobDownloadUrlAction,
    updateOcrJobContent: updateOcrJobContentAction,
    updateOcrJobContentPending,
    retryOcrJob: retryOcrJobAction,
    sendOcrJobToKb: sendOcrJobToKbAction,
    sendOcrJobToKbPending,
    deleteOcrJob: deleteOcrJobAction,
  } = useOcr({ page, page_size: PAGE_SIZE })

  const jobs = ocrJobList?.jobs ?? []
  const total = ocrJobList?.total ?? 0
  const totalPages = ocrJobList?.pages ?? 1

  const openPreview = async (job: OcrJob) => {
    setSelectedJob(job)
    setSendCategory(getDefaultCategory(job))
    setChunkSize("1200")
    setChunkOverlap("100")
    setMarkdownContent("")
    setDraftContent("")
    setPreviewError(null)
    setActionError(null)
    setActionSuccess(null)
    setPreviewDialogOpen(true)
    try {
      const content = await getOcrJobContentAction(job.job_id)
      setMarkdownContent(content)
      setDraftContent(content)
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : t("contentLoadError")
      )
    }
  }

  const handlePreviewOpenChange = (open: boolean) => {
    setPreviewDialogOpen(open)
    if (!open) {
      setSelectedJob(null)
      setMarkdownContent("")
      setDraftContent("")
      setPreviewError(null)
    }
  }

  const handleSaveMarkdown = async () => {
    if (!selectedJob) return
    setPreviewError(null)
    setActionError(null)
    setActionSuccess(null)
    try {
      const updatedJob = await updateOcrJobContentAction({
        jobId: selectedJob.job_id,
        content: draftContent,
      })
      setSelectedJob(updatedJob)
      setMarkdownContent(draftContent)
      setActionSuccess(t("saveSuccess"))
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : t("saveError")
      )
    }
  }

  const handleSendToKb = async () => {
    if (!selectedJob) return
    const normalizedChunkSize = Number(chunkSize || 1200)
    const normalizedChunkOverlap = Number(chunkOverlap || 100)
    setPreviewError(null)
    setActionError(null)
    setActionSuccess(null)
    if (normalizedChunkOverlap >= normalizedChunkSize) {
      setPreviewError(t("chunkOverlapError"))
      return
    }
    try {
      await sendOcrJobToKbAction({
        jobId: selectedJob.job_id,
        category: sendCategory,
        chunk_size: normalizedChunkSize,
        chunk_overlap: normalizedChunkOverlap,
      })
      setPreviewDialogOpen(false)
      setSelectedJob(null)
      setMarkdownContent("")
      setDraftContent("")
      setActionSuccess(t("sentToKb"))
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : t("sendError")
      )
    }
  }

  const handleDownload = async (job: OcrJob) => {
    setDownloadingJobId(job.job_id)
    setActionError(null)
    setActionSuccess(null)
    try {
      const url = await getOcrJobDownloadUrlAction(job.job_id)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : t("downloadError")
      )
    } finally {
      setDownloadingJobId(null)
    }
  }

  const handleDelete = async (job: OcrJob) => {
    if (!window.confirm(t("deleteConfirm"))) return
    setDeletingJobId(job.job_id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await deleteOcrJobAction(job.job_id)
      if (jobs.length === 1 && page > 1) setPage(page - 1)
      setActionSuccess(t("deleteSuccess"))
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("deleteError")
      )
    } finally {
      setDeletingJobId(null)
    }
  }

  const handleRetry = async (job: OcrJob) => {
    setRetryingJobId(job.job_id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await retryOcrJobAction(job.job_id)
      setActionSuccess(t("retryQueued"))
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("retryError")
      )
    } finally {
      setRetryingJobId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-semibold text-slate-950">{t("title")}</h1>
        <p className="text-[13px] text-slate-500">{t("description")}</p>
      </div>

      <QuickProcessingToolbar
        total={total}
        isFetching={ocrJobListFetching}
        onUploadClick={() => {
          setActionError(null)
          setActionSuccess(null)
          setUploadDialogOpen(true)
        }}
        onRefreshClick={() => void refetchOcrJobs()}
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

      <QuickProcessingTable
        jobs={jobs}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        totalPages={totalPages}
        isLoading={ocrJobListPending}
        isFetching={ocrJobListFetching}
        deletingJobId={deletingJobId}
        downloadingJobId={downloadingJobId}
        retryingJobId={retryingJobId}
        onPageChange={setPage}
        onPreview={(job) => void openPreview(job)}
        onDownload={(job) => void handleDownload(job)}
        onRetry={(job) => void handleRetry(job)}
        onDelete={(job) => void handleDelete(job)}
      />

      <QuickProcessingUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSubmit={async (payload) => {
          const response = await createOcrJobAction(payload)
          setActionSuccess(
            response.reused
              ? t("reusedResult")
              : t("createdSuccess")
          )
          return response
        }}
        isSubmitting={createOcrJobPending}
      />

      <QuickProcessingPreviewDialog
        open={previewDialogOpen}
        job={selectedJob}
        content={markdownContent}
        draftContent={draftContent}
        category={sendCategory}
        chunkSize={chunkSize}
        chunkOverlap={chunkOverlap}
        errorMessage={previewError}
        isLoading={getOcrJobContentPending}
        isSaving={updateOcrJobContentPending}
        isSending={sendOcrJobToKbPending}
        onOpenChange={handlePreviewOpenChange}
        onDraftContentChange={setDraftContent}
        onCategoryChange={setSendCategory}
        onChunkSizeChange={setChunkSize}
        onChunkOverlapChange={setChunkOverlap}
        onSave={() => void handleSaveMarkdown()}
        onSendToKb={() => void handleSendToKb()}
      />
    </div>
  )
}

export default QuickProcessingPage
