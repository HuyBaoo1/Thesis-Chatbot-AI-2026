import { zodResolver } from "@hookform/resolvers/zod"
import {
  FileText,
  Hash,
  Layers3,
  Link2,
  Loader2,
  ScanSearch,
  Tags,
} from "lucide-react"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"

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
  FieldError,
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
import { useTranslation } from "react-i18next"
import {
  knowledgeChunkFormSchema,
  type KnowledgeChunkFormInput,
  type KnowledgeChunkFormValues,
} from "@/schemas/knowledge-chunk-schema"
import {
  admissionCategoryOptions,
  type KnowledgeChunk,
} from "@/types/knowledge-chunk-type"

type KnowledgeChunkFormDialogProps = {
  open: boolean
  mode: "create" | "edit"
  chunk?: KnowledgeChunk | null
  errorMessage?: string | null
  isSubmitting?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: KnowledgeChunkFormValues) => void | Promise<void>
}

const textareaClassName =
  "min-h-32 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-[13px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"

const defaultValues: KnowledgeChunkFormInput = {
  major_id: "",
  category: "FAQ",
  title: "",
  content: "",
  year: undefined,
  source: "",
  source_url: "",
  version: 1,
}

const KnowledgeChunkFormDialog = ({
  open,
  mode,
  chunk,
  errorMessage,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: KnowledgeChunkFormDialogProps) => {
  const { t } = useTranslation("knowledge-chunk")
  const form = useForm<
    KnowledgeChunkFormInput,
    unknown,
    KnowledgeChunkFormValues
  >({
    resolver: zodResolver(knowledgeChunkFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
      return
    }
    form.reset({
      major_id: chunk?.major_id ?? "",
      category: chunk?.category ?? "FAQ",
      title: chunk?.title ?? "",
      content: chunk?.content ?? "",
      year: chunk?.year ?? undefined,
      source: chunk?.source ?? "",
      source_url: chunk?.source_url ?? "",
      version: chunk?.version ?? 1,
    })
  }, [chunk, form, open])

  const isCreate = mode === "create"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)] sm:max-w-3xl">
        <div className="h-0.75 bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

        <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <ScanSearch className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-semibold text-slate-900">
                {isCreate ? t("formCreateTitle") : t("formEditTitle")}
              </DialogTitle>
              <DialogDescription className="text-[12px] text-slate-500">
                {t("description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          noValidate
          className="overflow-y-auto px-6 py-5"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  <Tags className="size-3.5 text-slate-400" />
                  {t("category")}
                </FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
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
                    )}
                  />
                  <FieldError errors={[form.formState.errors.category]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="knowledge-title"
                  className="text-[12px] font-medium text-slate-600"
                >
                  <FileText className="size-3.5 text-slate-400" />
                  {t("titleField")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="knowledge-title"
                    placeholder={t("titlePlaceholder")}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    {...form.register("title")}
                  />
                  <FieldDescription className="text-[11px] text-slate-400">
                    {t("titleHint")}
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.title]} />
                </FieldContent>
              </Field>
            </div>

            <Field>
              <FieldLabel
                htmlFor="knowledge-content"
                className="text-[12px] font-medium text-slate-600"
              >
                <ScanSearch className="size-3.5 text-slate-400" />
                {t("contentField")}
              </FieldLabel>
              <FieldContent>
                <textarea
                  id="knowledge-content"
                  placeholder={t("contentPlaceholder")}
                  className={textareaClassName}
                  {...form.register("content")}
                />
                <FieldError errors={[form.formState.errors.content]} />
              </FieldContent>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field>
                <FieldLabel
                  htmlFor="knowledge-source"
                  className="text-[12px] font-medium text-slate-600"
                >
                  <Layers3 className="size-3.5 text-slate-400" />
                  {t("sourceField")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="knowledge-source"
                    placeholder={t("sourcePlaceholder")}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    {...form.register("source")}
                  />
                  <FieldError errors={[form.formState.errors.source]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="knowledge-source-url"
                  className="text-[12px] font-medium text-slate-600"
                >
                  <Link2 className="size-3.5 text-slate-400" />
                  {t("sourceUrl")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="knowledge-source-url"
                    placeholder={t("sourceUrlPlaceholder")}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    {...form.register("source_url")}
                  />
                  <FieldError errors={[form.formState.errors.source_url]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="knowledge-year"
                  className="text-[12px] font-medium text-slate-600"
                >
                  <Hash className="size-3.5 text-slate-400" />
                  {t("yearField")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="knowledge-year"
                    type="number"
                    placeholder={t("yearPlaceholder")}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    {...form.register("year")}
                  />
                  <FieldError errors={[form.formState.errors.year]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="knowledge-version"
                  className="text-[12px] font-medium text-slate-600"
                >
                  <Hash className="size-3.5 text-slate-400" />
                  {t("versionField")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="knowledge-version"
                    type="number"
                    min={1}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    {...form.register("version")}
                  />
                  <FieldError errors={[form.formState.errors.version]} />
                </FieldContent>
              </Field>
            </div>

            <Field>
              <FieldLabel
                htmlFor="knowledge-major-id"
                className="text-[12px] font-medium text-slate-600"
              >
                {t("majorIdField")}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="knowledge-major-id"
                  placeholder={t("majorIdPlaceholder")}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 font-mono text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  {...form.register("major_id")}
                />
                <FieldDescription className="text-[11px] text-slate-400">
                  {t("majorIdHint")}
                </FieldDescription>
                <FieldError errors={[form.formState.errors.major_id]} />
              </FieldContent>
            </Field>

            {errorMessage && (
              <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-[12px] text-red-600">
                {errorMessage}
              </div>
            )}
          </FieldGroup>

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 shadow-none hover:bg-slate-50 hover:text-slate-900"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 rounded-xl bg-slate-950 px-4 text-[13px] font-medium text-white shadow-sm hover:bg-slate-800"
              disabled={form.formState.isSubmitting || isSubmitting}
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              {isCreate
                ? isSubmitting
                  ? t("creating")
                  : t("createChunkButton")
                : isSubmitting
                  ? t("saving")
                  : t("savingChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default KnowledgeChunkFormDialog
