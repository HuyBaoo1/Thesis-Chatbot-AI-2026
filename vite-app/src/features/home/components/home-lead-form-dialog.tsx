import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, UserRound } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { initLeadSchema, type InitLeadSchema } from "@/schemas/chat-schema"

type HomeLeadFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: InitLeadSchema) => void | Promise<void>
  isSubmitting?: boolean
}

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-[14px] text-black caret-black outline-none transition-all placeholder:text-slate-500 focus:border-slate-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(15,23,42,0.06)] [&:-webkit-autofill]:[-webkit-text-fill-color:#000000] [&:-webkit-autofill]:caret-black [&:-webkit-autofill]:shadow-[0_0_0_1000px_rgba(248,250,252,0.95)_inset]"
const fieldErrorClassName = "text-[12px] text-red-600"

const HomeLeadFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: HomeLeadFormDialogProps) => {
  const { t } = useTranslation("home")

  const form = useForm<InitLeadSchema>({
    resolver: zodResolver(initLeadSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [form, open])

  const contactError =
    form.formState.errors.email?.message ??
    form.formState.errors.phone?.message ??
    (form.formState.errors as Record<string, { message?: string }>)[""]?.message

  const handleSubmit = async (values: InitLeadSchema) => {
    await onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="home-lead-form-dialog"
        className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-0 text-slate-900 shadow-[0_32px_80px_-20px_rgba(15,23,42,0.2)] sm:max-w-lg"
      >
        {/* Gold accent top bar */}
        <div className="h-0.75 bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/40" />

        <DialogHeader className="px-6 pt-6 pb-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
            <UserRound className="h-5 w-5 text-slate-600" />
          </div>
          <DialogTitle className="text-[18px] font-semibold tracking-tight text-slate-950">
            {t("leadForm.title")}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
            {t("leadForm.description")}
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="px-6 pb-6"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <FieldGroup className="gap-4">
            {/* Full name */}
            <Field>
              <FieldLabel
                htmlFor="lead-full-name"
                className="text-[13px] font-medium text-slate-900"
              >
                {t("leadForm.fullName")} <span className="text-red-400">*</span>
              </FieldLabel>
              <FieldContent>
                <input
                  id="lead-full-name"
                  className={inputClassName}
                  placeholder={t("leadForm.fullNamePlaceholder")}
                  {...form.register("full_name")}
                />
                <FieldError
                  className={fieldErrorClassName}
                  errors={[form.formState.errors.full_name]}
                />
              </FieldContent>
            </Field>

            {/* Email + Phone side by side */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="lead-email"
                  className="text-[13px] font-medium text-slate-900"
                >
                  {t("leadForm.email")}
</FieldLabel>
                <FieldContent>
                  <input
                    id="lead-email"
                    type="email"
                    className={inputClassName}
                    placeholder={t("leadForm.emailPlaceholder")}
                    {...form.register("email")}
                  />
                  <FieldError
                    className={fieldErrorClassName}
                    errors={[form.formState.errors.email]}
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="lead-phone"
                  className="text-[13px] font-medium text-slate-900"
                >
                  {t("leadForm.phone")}
                </FieldLabel>
                <FieldContent>
                  <input
                    id="lead-phone"
                    className={inputClassName}
                    placeholder={t("leadForm.phonePlaceholder")}
                    {...form.register("phone")}
                  />
                  <FieldError
                    className={fieldErrorClassName}
                    errors={[form.formState.errors.phone]}
                  />
                </FieldContent>
              </Field>
            </div>

            {/* Combined contact error */}
            {contactError ? (
              <div className="rounded-xl border border-red-100 bg-red-50/80 px-3.5 py-3 text-[12px] text-red-600">
                {contactError}
              </div>
            ) : null}
          </FieldGroup>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              className="h-10 cursor-pointer rounded-xl px-4 text-[13px] text-slate-600 hover:bg-slate-100"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              {t("close", { ns: "common" })}
            </Button>
            <Button
              type="submit"
              className="h-10 cursor-pointer rounded-xl bg-slate-950 px-5 text-[13px] font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              disabled={form.formState.isSubmitting || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              {isSubmitting ? t("leadForm.submitting") : t("leadForm.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default HomeLeadFormDialog
