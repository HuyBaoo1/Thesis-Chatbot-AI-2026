import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Trash2,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type {
  DeleteUploadedKnowledgeChunkFilePayload,
  DeleteUploadedKnowledgeChunkFileResponse,
  KnowledgeChunkUploadedFile,
} from "@/types/knowledge-chunk-type"

type KnowledgeChunkDeleteUploadedFileDialogProps = {
  open: boolean
  files: KnowledgeChunkUploadedFile[]
  total: number
  limit: number
  offset: number
  searchInput: string
  isLoading?: boolean
  isFetching?: boolean
  onSearchInputChange: (value: string) => void
  onPageChange: (offset: number) => void
  onOpenChange: (open: boolean) => void
  onSubmit: (
    payload: DeleteUploadedKnowledgeChunkFilePayload
  ) => Promise<DeleteUploadedKnowledgeChunkFileResponse>
  isSubmitting?: boolean
}

const formatDate = (value?: string | null) => {
  if (!value) return "-"
  return new Intl.DateTimeFormat("vi", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

const KnowledgeChunkDeleteUploadedFileDialog = ({
  open,
  files,
  total,
  limit,
  offset,
  searchInput,
  isLoading = false,
  isFetching = false,
  onSearchInputChange,
  onPageChange,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: KnowledgeChunkDeleteUploadedFileDialogProps) => {
  const { t } = useTranslation("knowledge-chunk")
  const [fileToDelete, setFileToDelete] =
    useState<KnowledgeChunkUploadedFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] =
    useState<DeleteUploadedKnowledgeChunkFileResponse | null>(null)

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const startItem = total === 0 ? 0 : offset + 1
  const endItem = Math.min(offset + files.length, total)
  const canGoPrevious = offset > 0
  const canGoNext = offset + limit < total

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFileToDelete(null)
      setError(null)
      setResult(null)
    }
    onOpenChange(nextOpen)
  }

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return
    setError(null)
    setResult(null)
    try {
      const response = await onSubmit({ r2_key: fileToDelete.r2_key })
      setResult(response)
      setFileToDelete(null)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("deleteFailed")
      )
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[88vh] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)] sm:max-w-3xl">
          <div className="h-0.75 bg-linear-to-r from-red-400 via-red-300 to-red-200/40" />

          <DialogHeader className="border-b border-slate-100 bg-red-50/50 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
                <Trash2 className="size-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-[15px] font-semibold text-slate-900">
                  {t("deleteUploadedFileTitle")}
                </DialogTitle>
                <DialogDescription className="text-[12px] text-slate-500">
                  {t("deleteUploadedFileDescription")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="border-b border-slate-100 px-6 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchInput}
                placeholder={t("uploadedFileSearchPlaceholder")}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/80 pl-9 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                onChange={(event) => onSearchInputChange(event.target.value)}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>{t("uploadedFileGroups", { count: total })}</span>
              {isFetching && !isLoading && (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" />
                  {t("refreshing")}
                </span>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-[13px] text-slate-500">
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("loadingFileList")}
              </div>
            ) : files.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
                <FileText className="size-8 text-slate-300" />
                <p className="mt-3 text-[13px] font-medium text-slate-700">
                  {t("noFilesUploaded")}
                </p>
                <p className="mt-1 max-w-sm text-[11px] text-slate-400">
                  {t("noFilesUploadedHint")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.r2_key}
                    className="rounded-xl border border-slate-200/80 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50/60"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <FileText className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-slate-900">
                              {file.title ||
                                file.file_name ||
                                t("uploadedFileDefaultName")}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">
                              {file.r2_key}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                {file.chunk_count} chunk
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                v{file.version ?? 1}
                              </span>
                              {file.year && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                  {file.year}
                                </span>
                              )}
                              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                {t("updatedAt", { date: formatDate(file.updated_at) })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center justify-end gap-2">
                        {file.file_url && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-lg border-slate-200 bg-white text-slate-500 shadow-none hover:text-slate-900"
                            onClick={() =>
                              window.open(
                                file.file_url || "",
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            <ExternalLink className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg border-red-100 bg-white text-[12px] text-red-500 shadow-none hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          disabled={isSubmitting}
                          onClick={() => setFileToDelete(file)}
                        >
                          <Trash2 className="size-3.5" />
                          {t("deleteFile")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-[12px] text-red-600">
                {error}
              </div>
            )}

            {result && (
              <div className="mt-4 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50">
                <div className="border-b border-emerald-200 px-4 py-2.5">
                  <p className="text-[12px] font-semibold text-emerald-800">
                    {result.message}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-4 py-3 md:grid-cols-4">
                  {[
                    { label: t("resultChunkLabel"), value: result.total_chunks },
                    { label: t("resultQdrantLabel"), value: result.qdrant_deleted_chunks },
                    {
                      label: t("resultDbDeactivatedLabel"),
                      value: result.db_deactivated_chunks,
                    },
                    {
                      label: t("resultR2DeletedLabel"),
                      value: result.r2_file_deleted ? t("yes") : t("no"),
                    },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] tracking-[0.15em] text-emerald-600 uppercase">
                        {label}
                      </p>
                      <p className="text-[14px] font-semibold text-emerald-900">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <div className="mr-auto text-[11px] text-slate-500">
              {t("uploadedFilePaginationInfo", { start: startItem, end: endItem, total, current: currentPage, totalPages })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-xl border-slate-200 bg-white text-[12px] text-slate-600 shadow-none"
              disabled={!canGoPrevious || isFetching}
              onClick={() => onPageChange(Math.max(0, offset - limit))}
            >
              {t("prev")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-xl border-slate-200 bg-white text-[12px] text-slate-600 shadow-none"
              disabled={!canGoNext || isFetching}
              onClick={() => onPageChange(offset + limit)}
            >
              {t("next")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-xl border-slate-200 bg-white text-[12px] text-slate-600 shadow-none"
              onClick={() => handleOpenChange(false)}
            >
              {t("close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(fileToDelete)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setFileToDelete(null)
        }}
      >
        <AlertDialogContent className="max-w-sm gap-0 overflow-hidden rounded-2xl border border-slate-200/70 p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)]">
          <div className="h-0.75 bg-linear-to-r from-red-400 via-red-300 to-red-200/40" />
          <div className="flex flex-col items-center gap-3 bg-red-50/80 px-6 py-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 shadow-sm">
              <AlertTriangle className="size-5" />
            </div>
            <AlertDialogHeader className="space-y-1 text-center">
              <AlertDialogTitle className="text-[15px] font-semibold text-slate-900">
                {t("deleteUploadedFileConfirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[12px] leading-relaxed text-slate-500">
                {t("deleteUploadedFileConfirmDescription", { name: fileToDelete?.title || fileToDelete?.file_name || "file" })}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="flex flex-row items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
            <AlertDialogCancel
              disabled={isSubmitting}
              className="h-9 rounded-xl border-slate-200 text-[13px] text-slate-600"
            >
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              className="h-9 rounded-xl bg-red-600 text-[13px] hover:bg-red-700 focus:ring-red-500"
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmDelete()
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  {t("deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  {t("deleteFile")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default KnowledgeChunkDeleteUploadedFileDialog
