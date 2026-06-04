import { useTranslation } from "react-i18next"

import { FileText, Loader2, Save, SendHorizontal } from "lucide-react"

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
import {
  admissionCategoryOptions,
  type AdmissionCategory,
} from "@/types/knowledge-chunk-type"
import type { OcrJob } from "@/types/ocr-type"

type QuickProcessingPreviewDialogProps = {
  open: boolean
  job: OcrJob | null
  content: string
  draftContent: string
  category: AdmissionCategory
  chunkSize: string
  chunkOverlap: string
  errorMessage?: string | null
  isLoading?: boolean
  isSaving?: boolean
  isSending?: boolean
  onOpenChange: (open: boolean) => void
  onDraftContentChange: (value: string) => void
  onCategoryChange: (value: AdmissionCategory) => void
  onChunkSizeChange: (value: string) => void
  onChunkOverlapChange: (value: string) => void
  onSave: () => void
  onSendToKb: () => void
}

const QuickProcessingPreviewDialog = ({
  open,
  job,
  content,
  draftContent,
  category,
  chunkSize,
  chunkOverlap,
  errorMessage,
  isLoading = false,
  isSaving = false,
  isSending = false,
  onOpenChange,
  onDraftContentChange,
  onCategoryChange,
  onChunkSizeChange,
  onChunkOverlapChange,
  onSave,
  onSendToKb,
}: QuickProcessingPreviewDialogProps) => {
  const { t } = useTranslation("quick-processing")
  const isDirty = draftContent !== content
  const isSent = Boolean(job?.sent_to_kb)
  const canSave = Boolean(draftContent.trim()) && isDirty && !isSent
  const canSend = Boolean(draftContent.trim()) && !isDirty && !isSent

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)] sm:max-w-5xl">
        <div className="h-0.75 bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

        <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-[15px] font-semibold text-slate-900">
                {job?.title || job?.original_filename || t("previewTitle")}
              </DialogTitle>
              <DialogDescription className="truncate text-[12px] text-slate-500">
                {t("previewDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          {/* Controls */}
          <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
            <FieldGroup className="grid gap-4 md:grid-cols-[minmax(0,1fr)_8rem_8rem]">
              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  {t("category")}
                </FieldLabel>
                <FieldContent>
                  <Select value={category} onValueChange={onCategoryChange}>
                    <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-[13px] shadow-none focus:border-slate-300 focus:ring-0">
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
                  {t("chunkSize")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    min={100}
                    max={5000}
                    value={chunkSize}
                    className="h-10 rounded-xl border-slate-200 bg-white text-[13px] shadow-none focus:border-slate-300 focus-visible:ring-0"
                    onChange={(event) => onChunkSizeChange(event.target.value)}
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
                    className="h-10 rounded-xl border-slate-200 bg-white text-[13px] shadow-none focus:border-slate-300 focus-visible:ring-0"
                    onChange={(event) =>
                      onChunkOverlapChange(event.target.value)
                    }
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          </div>

          {/* Editor */}
          <div className="min-h-0 px-6 py-4">
            {isLoading ? (
              <div className="flex h-[min(46vh,420px)] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-[13px] text-slate-500">
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("loadingMarkdown")}
              </div>
            ) : (
              <textarea
                value={draftContent}
                spellCheck={false}
                disabled={isSent}
                className="h-[min(46vh,420px)] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 p-4 font-mono text-[13px] leading-relaxed text-slate-800 transition outline-none focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                onChange={(event) => onDraftContentChange(event.target.value)}
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
              ? t("alreadySentToKb")
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

export default QuickProcessingPreviewDialog
