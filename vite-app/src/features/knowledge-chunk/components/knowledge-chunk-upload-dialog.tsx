import { useState } from "react"
import { FileText, FileUp, Hash, Layers3, Loader2, Tags } from "lucide-react"
import { useTranslation } from "react-i18next"

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
  FieldDescription,
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
  type KnowledgeChunkUploadResponse,
  type UploadKnowledgeChunkFilePayload,
} from "@/types/knowledge-chunk-type"

type KnowledgeChunkUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (
    payload: UploadKnowledgeChunkFilePayload
  ) => Promise<KnowledgeChunkUploadResponse>
  isSubmitting?: boolean
}

const KnowledgeChunkUploadDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: KnowledgeChunkUploadDialogProps) => {
  const { t } = useTranslation("knowledge-chunk")

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<AdmissionCategory>("FAQ")
  const [majorId, setMajorId] = useState("")
  const [year, setYear] = useState("")
  const [versionStart, setVersionStart] = useState("1")
  const [chunkSize, setChunkSize] = useState("1200")
  const [chunkOverlap, setChunkOverlap] = useState("100")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<KnowledgeChunkUploadResponse | null>(
    null
  )

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFile(null)
      setTitle("")
      setCategory("FAQ")
      setMajorId("")
      setYear("")
      setVersionStart("1")
      setChunkSize("1200")
      setChunkOverlap("100")
      setError(null)
      setResult(null)
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async () => {
    setError(null)
    setResult(null)
    if (!file) {
      setError(t("pleaseSelectFile"))
      return
    }
    try {
      const response = await onSubmit({
        file,
        title: title.trim() || undefined,
        category,
        major_id: majorId.trim() || undefined,
        year: year ? Number(year) : undefined,
        version_start: versionStart ? Number(versionStart) : undefined,
        chunk_size: chunkSize ? Number(chunkSize) : undefined,
        chunk_overlap: chunkOverlap ? Number(chunkOverlap) : undefined,
      })
      setResult(response)
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
                htmlFor="knowledge-upload-file"
                className="text-[12px] font-medium text-slate-600"
              >
                {t("fileField")}
              </FieldLabel>
              <FieldContent>
                <input
                  id="knowledge-upload-file"
                  type="file"
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[13px] text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-white hover:file:bg-slate-800"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </FieldContent>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  <Tags className="size-3.5 text-slate-400" />
                  {t("category")}
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as AdmissionCategory)}
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

              <Field>
                <FieldLabel
                  htmlFor="knowledge-upload-title"
                  className="text-[12px] font-medium text-slate-600"
                >
                  <FileText className="size-3.5 text-slate-400" />
                  {t("titleField")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="knowledge-upload-title"
                    value={title}
                    placeholder={t("titleOptionalPlaceholder")}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </FieldContent>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {([
                { labelKey: "yearField", value: year, setter: setYear, placeholder: "2026" } as const,
                { labelKey: "versionStart", value: versionStart, setter: setVersionStart, placeholder: "1" } as const,
                { labelKey: "chunkSize", value: chunkSize, setter: setChunkSize, placeholder: "1200" } as const,
                { labelKey: "chunkOverlap", value: chunkOverlap, setter: setChunkOverlap, placeholder: "200" } as const,
              ] as const).map(({ labelKey, value, setter, placeholder }) => (
                <Field key={labelKey}>
                  <FieldLabel className="text-[12px] font-medium text-slate-600">
                    <Hash className="size-3.5 text-slate-400" />
                    {t(labelKey)}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      value={value}
                      placeholder={placeholder}
                      className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                      onChange={(e) => setter(e.target.value)}
                    />
                  </FieldContent>
                </Field>
              ))}
            </div>

            <Field>
              <FieldLabel
                htmlFor="knowledge-upload-major-id"
                className="text-[12px] font-medium text-slate-600"
              >
                <Layers3 className="size-3.5 text-slate-400" />
                {t("majorIdField")}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="knowledge-upload-major-id"
                  value={majorId}
                  placeholder={t("majorIdPlaceholder")}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 font-mono text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(e) => setMajorId(e.target.value)}
                />
                <FieldDescription className="text-[11px] text-slate-400">
                  {t("majorIdFileHint")}
                </FieldDescription>
              </FieldContent>
            </Field>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-[12px] text-red-600">
                {error}
              </div>
            )}

            {result && (
              <div className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50">
                <div className="border-b border-emerald-200 px-4 py-2.5">
                  <p className="truncate text-[12px] font-semibold text-emerald-800">
                    {result.file_name}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 px-4 py-3">
                  {[
                    { label: t("uploadResultTotal"), value: result.total_chunks },
                    { label: t("uploadResultEmbedded"), value: result.embedded_chunks },
                    { label: t("uploadResultFailed"), value: result.failed_embedding_chunks },
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
                {result.failed_embedding_chunks > 0 && (
                  <div className="border-t border-red-200 bg-red-50 px-4 py-2.5">
                    <p className="text-[12px] text-red-700">
                      {t("uploadResultFailedWarning")}
                    </p>
                  </div>
                )}
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
                {t("uploadFileButton")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default KnowledgeChunkUploadDialog
