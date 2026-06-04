import { zodResolver } from "@hookform/resolvers/zod"
import {
  Calendar,
  CreditCard,
  DollarSign,
  GraduationCap,
  Loader2,
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
  tuitionPolicyFormSchema,
  type TuitionPolicyFormInput,
  type TuitionPolicyFormValues,
} from "@/schemas/tuition-policy-schema"
import type { Major } from "@/types/major-type"
import { feeTypeOptions, type TuitionPolicy } from "@/types/tuition-policy-type"

type TuitionPolicyFormDialogProps = {
  open: boolean
  mode: "create" | "edit"
  policy?: TuitionPolicy | null
  majorOptions: Major[]
  majorOptionsPending?: boolean
  errorMessage?: string | null
  isSubmitting?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TuitionPolicyFormValues) => void | Promise<void>
}

const defaultValues: TuitionPolicyFormInput = {
  major_id: "",
  year: new Date().getFullYear(),
  fee_type: "YEAR",
  base_fee: 0,
}

const TuitionPolicyFormDialog = ({
  open,
  mode,
  policy,
  majorOptions,
  majorOptionsPending = false,
  errorMessage,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: TuitionPolicyFormDialogProps) => {
  const { t } = useTranslation("tuition-policy")
  const form = useForm<
    TuitionPolicyFormInput,
    unknown,
    TuitionPolicyFormValues
  >({
    resolver: zodResolver(tuitionPolicyFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
      return
    }

    form.reset({
      major_id: policy?.major_id ?? "",
      year: policy?.year ?? new Date().getFullYear(),
      fee_type: policy?.fee_type ?? "YEAR",
      base_fee: policy?.base_fee ?? 0,
    })
  }, [form, open, policy])

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
              <CreditCard className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-semibold text-slate-900">
                {isCreate ? t("createTitle") : t("editTitle")}
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
            {/* Major + Year */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  <GraduationCap className="size-3.5 text-slate-400" />
                  {t("major")}
                </FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="major_id"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={
                          majorOptionsPending || majorOptions.length === 0
                        }
                      >
                        <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none focus:border-slate-300 focus:ring-0">
                          <SelectValue placeholder={t("selectMajor")} />
                        </SelectTrigger>
                        <SelectContent>
                          {majorOptions.map((major) => (
                            <SelectItem key={major.id} value={major.id}>
                              {major.code} - {major.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldDescription className="text-[11px] text-slate-400">
                    {majorOptions.length === 0
                      ? t("noMajorsHint")
                      : t("selectMajorHint")}
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.major_id]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  <Calendar className="size-3.5 text-slate-400" />
                  {t("academicYear")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    placeholder="2026"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    {...form.register("year")}
                  />
                  <FieldError errors={[form.formState.errors.year]} />
                </FieldContent>
              </Field>
            </div>

            {/* Fee type + Base fee */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  <CreditCard className="size-3.5 text-slate-400" />
                  {t("feeType")}
                </FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="fee_type"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none focus:border-slate-300 focus:ring-0">
                          <SelectValue placeholder={t("selectFeeType")} />
                        </SelectTrigger>
                        <SelectContent>
                          {feeTypeOptions.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[form.formState.errors.fee_type]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  <DollarSign className="size-3.5 text-slate-400" />
                  {t("baseFee")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="12000000"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    {...form.register("base_fee")}
                  />
                  <FieldError errors={[form.formState.errors.base_fee]} />
                </FieldContent>
              </Field>
            </div>

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
              disabled={
                form.formState.isSubmitting ||
                isSubmitting ||
                majorOptionsPending ||
                majorOptions.length === 0
              }
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              {isCreate ? (isSubmitting ? t("creating") : t("createPolicy")) : (isSubmitting ? t("saving") : t("saveChanges"))}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default TuitionPolicyFormDialog
