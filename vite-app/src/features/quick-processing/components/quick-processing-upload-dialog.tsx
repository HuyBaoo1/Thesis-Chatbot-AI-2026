import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FileText, FileUp, Hash, Loader2, Tags } from "lucide-react"

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
import type { CreateOcrJobPayload, OcrJob } from "@/types/ocr-type"

type QuickProcessingUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: CreateOcrJobPayload) => Promise<OcrJob>
  isSubmitting?: boolean
}

const getFileTitle = (fileName: string) => fileName.replace(/\.[^.]+$/, "")

const QuickProcessingUploadDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: QuickProcessingUploadDialogProps) => {
  const { t } = useTranslation("quick-processing")
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<AdmissionCategory>("FAQ")
  const [year, setYear] = useState("")
  const [versionStart, setVersionStart] = useState("1")
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setFile(null)
    setTitle("")
    setCategory("FAQ")
    setYear("")
    setVersionStart("1")
    setError(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleSubmit = async () => {
    setError(null)
    if (!file) {
      setError(t("selectFileError"))
      return
    }
    if (!title.trim()) {
      setError(t("titleRequiredError"))
      return
    }
    try {
      await onSubmit({
        file,
        title: title.trim(),
        category,
        year: year ? Number(year) : undefined,
        version_start: versionStart ? Number(versionStart) : 1,
      })
      handleOpenChange(false)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("uploadFailed")
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)] sm:max-w-2xl">
        <div className="h-0.75 bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

        <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <FileUp className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-semibold text-slate-900">
                {t("uploadTitle")}
              </DialogTitle>
              <DialogDescription className="text-[12px] text-slate-500">
                {t("uploadDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel
                htmlFor="ocr-upload-file"
                className="text-[12px] font-medium text-slate-600"
              >
                {t("file")}
              </FieldLabel>
              <FieldContent>
                <input
                  id="ocr-upload-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.xlsx,.xls,.csv"
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[13px] text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-white hover:file:bg-slate-800"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0] ?? null
                    setFile(selectedFile)
                    if (selectedFile && !title.trim())
                      setTitle(getFileTitle(selectedFile.name))
                  }}
                />
              </FieldContent>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="ocr-upload-title"
                  className="text-[12px] font-medium text-slate-600"
                >
                  <FileText className="size-3.5 text-slate-400" />
                  {t("title_field")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="ocr-upload-title"
                    value={title}
                    placeholder={t("titlePlaceholder")}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  <Tags className="size-3.5 text-slate-400" />
                  {t("category")}
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={category}
                    onValueChange={(value) =>
                      setCategory(value as AdmissionCategory)
                    }
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none focus:border-slate-300 focus:ring-0">
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  <Hash className="size-3.5 text-slate-400" />
                  {t("year")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    value={year}
                    placeholder="2026"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    onChange={(e) => setYear(e.target.value)}
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  <Hash className="size-3.5 text-slate-400" />
                  {t("version")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    min={1}
                    value={versionStart}
                    placeholder="1"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    onChange={(e) => setVersionStart(e.target.value)}
                  />
                </FieldContent>
              </Field>
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-[12px] text-red-600">
                {error}
              </div>
            )}
          </FieldGroup>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 shadow-none hover:bg-slate-50"
            onClick={() => handleOpenChange(false)}
          >
            {t("close")}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-xl bg-slate-950 px-4 text-[13px] font-medium text-white shadow-sm hover:bg-slate-800"
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {t("uploading")}
              </>
            ) : (
              <>
                <FileUp className="size-3.5" />
                {t("uploadAndOcr")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default QuickProcessingUploadDialog
