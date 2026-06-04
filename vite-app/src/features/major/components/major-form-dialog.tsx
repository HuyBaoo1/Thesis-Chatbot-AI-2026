import { zodResolver } from "@hookform/resolvers/zod"
import {
  BookType,
  GraduationCap,
  Hash,
  Loader2,
  NotebookPen,
  TimerReset,
} from "lucide-react"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
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
import {
  majorFormSchema,
  type MajorFormInput,
  type MajorFormValues,
} from "@/schemas/major-schema"
import { majorTypeOptions, type Major } from "@/types/major-type"

type MajorFormDialogProps = {
  open: boolean
  mode: "create" | "edit"
  major?: Major | null
  errorMessage?: string | null
  isSubmitting?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: MajorFormValues) => void | Promise<void>
}

const textareaClassName =
  "min-h-32 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-[13px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"

const defaultValues: MajorFormInput = {
  code: "",
  name: "",
  description: "",
  credits: undefined,
  duration: undefined,
  degree_type: "",
  major_type: "UNDERGRAD_MAJOR",
}

const MajorFormDialog = ({
  open,
  mode,
  major,
  errorMessage,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: MajorFormDialogProps) => {
  const { t } = useTranslation("major")
  const form = useForm<MajorFormInput, unknown, MajorFormValues>({
    resolver: zodResolver(majorFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
      return
    }

    form.reset({
      code: major?.code ?? "",
      name: major?.name ?? "",
      description: major?.description ?? "",
      credits: major?.credits ?? undefined,
      duration: major?.duration ?? undefined,
      degree_type: major?.degree_type ?? "",
      major_type: major?.major_type ?? "UNDERGRAD_MAJOR",
    })
  }, [form, major, open])

  const isCreate = mode === "create"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)] sm:max-w-3xl">
        {/* Gold accent bar */}
        <div className="h-0.75 bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

        {/* Header */}
        <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <GraduationCap className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-semibold text-slate-900">
                {isCreate ? t("createNewMajor") : t("editMajor")}
              </DialogTitle>
              <DialogDescription className="text-[12px] text-slate-500">
                {t("formDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <form
          noValidate
          className="overflow-y-auto px-6 py-5"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup className="gap-4">
            {/* Code + Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="major-code"
                  className="text-[12px] font-medium text-slate-600"
                >
                  <Hash className="size-3.5 text-slate-400" />
                  {t("code")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="major-code"
                    placeholder={t("codePlaceholder")}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    {...form.register("code")}
                  />
                  <FieldError errors={[form.formState.errors.code]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="major-name"
                  className="text-[12px] font-medium text-slate-600"
                >
                  <GraduationCap className="size-3.5 text-slate-400" />
                  {t("name")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="major-name"
                    placeholder={t("namePlaceholder")}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    {...form.register("name")}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </FieldContent>
              </Field>
            </div>

            {/* Major type + Degree type + Credits + Duration */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field>
                <FieldLabel
                  htmlFor="major-type"
                  className="text-[12px] font-medium text-slate-600"
                >
                  <BookType className="size-3.5 text-slate-400" />
                  {t("majorType")}
                </FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="major_type"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="major-type"
                          className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none focus:border-slate-300 focus:ring-0"
                        >
                          <SelectValue placeholder={t("selectMajorType")} />
                        </SelectTrigger>
                        <SelectContent>
                          {majorTypeOptions.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {t(item.label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[form.formState.errors.major_type]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="major-degree-type"
                  className="text-[12px] font-medium text-slate-600"
                >
                  <NotebookPen className="size-3.5 text-slate-400" />
                  {t("degreeType")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="major-degree-type"
                    placeholder={t("degreeTypePlaceholder")}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    {...form.register("degree_type")}
                  />
                  <FieldError errors={[form.formState.errors.degree_type]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="major-credits"
                  className="text-[12px] font-medium text-slate-600"
                >
                  <Hash className="size-3.5 text-slate-400" />
                  {t("credits")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="major-credits"
                    type="number"
                    placeholder={t("creditsPlaceholder")}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    {...form.register("credits")}
                  />
                  <FieldError errors={[form.formState.errors.credits]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="major-duration"
                  className="text-[12px] font-medium text-slate-600"
                >
                  <TimerReset className="size-3.5 text-slate-400" />
                  {t("duration")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="major-duration"
                    type="number"
                    placeholder={t("durationPlaceholder")}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    {...form.register("duration")}
                  />
                  <FieldDescription className="text-[11px] text-slate-400">
                    {t("durationHint")}
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.duration]} />
                </FieldContent>
              </Field>
            </div>

            {/* Description */}
            <Field>
              <FieldLabel
                htmlFor="major-description"
                className="text-[12px] font-medium text-slate-600"
              >
                <NotebookPen className="size-3.5 text-slate-400" />
                {t("descriptionLabel")}
              </FieldLabel>
              <FieldContent>
                <textarea
                  id="major-description"
                  placeholder={t("descriptionPlaceholder")}
                  className={textareaClassName}
                  {...form.register("description")}
                />
                <FieldError errors={[form.formState.errors.description]} />
              </FieldContent>
            </Field>

            {errorMessage && (
              <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-[12px] text-red-600">
                {errorMessage}
              </div>
            )}
          </FieldGroup>

          {/* Footer */}
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
                  : t("createMajor")
                : isSubmitting
                  ? t("saving")
                  : t("saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default MajorFormDialog
