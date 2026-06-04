import { useTranslation } from "react-i18next"
import {
  ExternalLink,
  FileText,
  Loader2,
  Save,
  SendHorizontal,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CrawlPageJob } from "@/types/crawl-type"
import {
  admissionCategoryOptions,
  type AdmissionCategory,
} from "@/types/knowledge-chunk-type"

type WebCrawlerPreviewDialogProps = {
  open: boolean
  pageJob: CrawlPageJob | null
  content: string
  draftContent: string
  title: string
  category: AdmissionCategory
  year: string
  versionStart: string
  chunkSize: string
  chunkOverlap: string
  errorMessage?: string | null
  isLoading?: boolean
  isSaving?: boolean
  isSending?: boolean
  onOpenChange: (open: boolean) => void
  onDraftContentChange: (value: string) => void
  onTitleChange: (value: string) => void
  onCategoryChange: (value: AdmissionCategory) => void
  onYearChange: (value: string) => void
  onVersionStartChange: (value: string) => void
  onChunkSizeChange: (value: string) => void
  onChunkOverlapChange: (value: string) => void
  onSave: () => void
  onSendToKb: () => void
}

const WebCrawlerPreviewDialog = ({
  open,
  pageJob,
  content,
  draftContent,
  title,
  category,
  year,
  versionStart,
  chunkSize,
  chunkOverlap,
  errorMessage,
  isLoading = false,
  isSaving = false,
  isSending = false,
  onOpenChange,
  onDraftContentChange,
  onTitleChange,
  onCategoryChange,
  onYearChange,
  onVersionStartChange,
  onChunkSizeChange,
  onChunkOverlapChange,
  onSave,
  onSendToKb,
}: WebCrawlerPreviewDialogProps) => {
  const { t } = useTranslation("web-crawler")
  const isDirty = draftContent !== content
  const isSent = Boolean(pageJob?.sent_to_kb)
  const canSave = Boolean(draftContent.trim()) && isDirty && !isSent
  const canSend =
    Boolean(draftContent.trim()) && Boolean(title.trim()) && !isDirty && !isSent

  const displayTitle =
    pageJob?.title ||
    pageJob?.detected_title ||
    pageJob?.suggested_metadata?.title ||
    t("crawledPagePreview")

  const inputCls =
    "h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0 disabled:opacity-60"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)] sm:max-w-6xl">
        <div className="h-0.75 bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

        <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-[15px] font-semibold text-slate-900">
                {displayTitle}
              </DialogTitle>
              <DialogDescription className="truncate text-[12px] text-slate-500">
                {t("previewHint")}
              </DialogDescription>
              {pageJob?.source_url && (
                <a
                  href={pageJob.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex max-w-full items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="size-3" />
                  <span className="truncate">{pageJob.source_url}</span>
                </a>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          {/* Controls */}
          <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
            <FieldGroup className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_7rem_7rem_7rem_7rem]">
              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  {t("kbTitle")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    value={title}
                    disabled={isSent}
                    placeholder={t("kbTitlePlaceholder")}
                    className={inputCls}
                    onChange={(e) => onTitleChange(e.target.value)}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  {t("category")}
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={category}
                    disabled={isSent}
                    onValueChange={onCategoryChange}
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none focus:border-slate-300 focus:ring-0 disabled:opacity-60">
                      <SelectValue placeholder={t("selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {admissionCategoryOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  {t("year")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    min={2000}
                    value={year}
                    disabled={isSent}
                    placeholder={t("optional")}
                    className={inputCls}
                    onChange={(e) => onYearChange(e.target.value)}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  {t("version")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    min={1}
                    value={versionStart}
                    disabled={isSent}
                    className={inputCls}
                    onChange={(e) => onVersionStartChange(e.target.value)}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  {t("chunk")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    min={100}
                    max={5000}
                    value={chunkSize}
                    disabled={isSent}
                    className={inputCls}
                    onChange={(e) => onChunkSizeChange(e.target.value)}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  {t("overlap")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    min={0}
                    max={500}
                    value={chunkOverlap}
                    disabled={isSent}
                    className={inputCls}
                    onChange={(e) => onChunkOverlapChange(e.target.value)}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          </div>

          {/* Editor */}
          <div className="min-h-0 px-6 py-4">
            {isLoading ? (
              <div className="flex h-[min(50vh,460px)] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-[13px] text-slate-500">
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("loadingMarkdown")}
              </div>
            ) : (
              <textarea
                value={draftContent}
                spellCheck={false}
                disabled={isSent}
                className="h-[min(50vh,460px)] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 p-4 font-mono text-[13px] leading-relaxed text-slate-800 transition outline-none focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                onChange={(e) => onDraftContentChange(e.target.value)}
              />
            )}
            {errorMessage && (
              <div className="mt-3 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-[12px] text-red-600">
                {errorMessage}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-slate-500">
            {isSent
              ? t("pageAlreadySent")
              : isDirty
                ? t("saveBeforeSend")
                : t("markdownReady")}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 shadow-none hover:bg-slate-50"
              onClick={() => onOpenChange(false)}
            >
              {t("close")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-none hover:bg-slate-50"
              disabled={!canSave || isSaving}
              onClick={onSave}
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {t("saveMarkdown")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-xl bg-slate-950 px-4 text-[13px] font-medium text-white shadow-sm hover:bg-slate-800"
              disabled={!canSend || isSending}
              onClick={onSendToKb}
            >
              {isSending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <SendHorizontal className="size-3.5" />
              )}
              {t("sendToKbBtn")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WebCrawlerPreviewDialog
