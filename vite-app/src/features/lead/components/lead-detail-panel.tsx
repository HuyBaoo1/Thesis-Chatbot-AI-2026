import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ArrowUpRight,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Thermometer,
  Trophy,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateOnly, formatDateTime } from "@/lib/date"
import { cn } from "@/lib/utils"
import {
  admissionStageLabelMap,
  leadStatusLabelMap,
  leadStatusOptions,
  leadTemperatureLabelMap,
  leadTemperatureOptions,
  type Lead,
  type LeadApplication,
  type LeadInterest,
  type LeadStatus,
  type LeadTemperature,
  type UpdateLeadPayload,
} from "@/types/lead-type"

type LeadDetailPanelProps = {
  lead?: Lead | null
  leadPending?: boolean
  leadFetching?: boolean
  interests?: LeadInterest[]
  interestsPending?: boolean
  applications?: LeadApplication[]
  applicationsPending?: boolean
  savePending?: boolean
  errorMessage?: string | null
  onSave: (values: UpdateLeadPayload) => Promise<void> | void
}

type DetailFormState = {
  full_name: string
  email: string
  phone: string
  high_school: string
  province: string
  temperature: LeadTemperature | "NONE"
  gpa: string
  ielts: string
  sat: string
  act: string
  cv_url: string
  essay_url: string
  transcript_url: string
  extracurriculars: string
  ability_score: string
  aspiration_score: string
  creativity_score: string
  commitment_score: string
  fit_score: string
}

const textareaClassName =
  "min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-[13px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"

const emptyFormState: DetailFormState = {
  full_name: "",
  email: "",
  phone: "",
  high_school: "",
  province: "",
  temperature: "NONE",
  gpa: "",
  ielts: "",
  sat: "",
  act: "",
  cv_url: "",
  essay_url: "",
  transcript_url: "",
  extracurriculars: "",
  ability_score: "",
  aspiration_score: "",
  creativity_score: "",
  commitment_score: "",
  fit_score: "",
}

const statusClassNameMap: Record<LeadStatus, string> = {
  NEW: "border-slate-200 bg-slate-100 text-slate-700",
  CONTACTED: "border-sky-200 bg-sky-50 text-sky-700",
  QUALIFIED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  APPLIED: "border-violet-200 bg-violet-50 text-violet-700",
  ENROLLED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  LOST: "border-rose-200 bg-rose-50 text-rose-700",
}

const temperatureClassNameMap: Record<LeadTemperature, string> = {
  HOT: "border-red-200 bg-red-50 text-red-700",
  WARM: "border-amber-200 bg-amber-50 text-amber-700",
  COLD: "border-cyan-200 bg-cyan-50 text-cyan-700",
}

const toInputValue = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "" : String(value)

const buildFormState = (lead?: Lead | null): DetailFormState => {
  if (!lead) return emptyFormState

  return {
    full_name: lead.full_name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    high_school: lead.high_school ?? "",
    province: lead.province ?? "",
    temperature: lead.temperature ?? "NONE",
    gpa: toInputValue(lead.gpa),
    ielts: toInputValue(lead.ielts),
    sat: toInputValue(lead.sat),
    act: toInputValue(lead.act),
    cv_url: lead.cv_url ?? "",
    essay_url: lead.essay_url ?? "",
    transcript_url: lead.transcript_url ?? "",
    extracurriculars: lead.extracurriculars
      ? JSON.stringify(lead.extracurriculars, null, 2)
      : "",
    ability_score: toInputValue(lead.ability_score),
    aspiration_score: toInputValue(lead.aspiration_score),
    creativity_score: toInputValue(lead.creativity_score),
    commitment_score: toInputValue(lead.commitment_score),
    fit_score: toInputValue(lead.fit_score),
  }
}

const normalizeText = (value: string) => {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const normalizeNumber = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null

  const nextValue = Number(trimmed)
  return Number.isNaN(nextValue) ? null : nextValue
}

const LeadDetailPanel = ({
  lead,
  leadPending = false,
  leadFetching = false,
  interests = [],
  interestsPending = false,
  applications = [],
  applicationsPending = false,
  savePending = false,
  errorMessage,
  onSave,
}: LeadDetailPanelProps) => {
  const { t } = useTranslation("leads")
  const [formState, setFormState] = useState<DetailFormState>(() =>
    buildFormState(lead)
  )
  const [statusDraft, setStatusDraft] = useState<LeadStatus>(
    () => lead?.status ?? "NEW"
  )
  const [localError, setLocalError] = useState<string | null>(null)

  const surfaceError = localError || errorMessage

  const handleFieldChange = (field: keyof DetailFormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    if (!lead) return

    let extracurriculars: Record<string, unknown> | unknown[] | null = null

    if (formState.extracurriculars.trim()) {
      try {
        extracurriculars = JSON.parse(formState.extracurriculars) as
          | Record<string, unknown>
          | unknown[]
      } catch {
        setLocalError(t("invalidExtracurricularJson"))
        return
      }
    }

    setLocalError(null)

    await onSave({
      full_name: formState.full_name.trim() || lead.full_name,
      email: normalizeText(formState.email),
      phone: normalizeText(formState.phone),
      high_school: normalizeText(formState.high_school),
      province: normalizeText(formState.province),
      status: statusDraft,
      temperature:
        formState.temperature === "NONE" ? null : formState.temperature,
      gpa: normalizeNumber(formState.gpa),
      ielts: normalizeNumber(formState.ielts),
      sat: normalizeNumber(formState.sat),
      act: normalizeNumber(formState.act),
      cv_url: normalizeText(formState.cv_url),
      essay_url: normalizeText(formState.essay_url),
      transcript_url: normalizeText(formState.transcript_url),
      extracurriculars,
      ability_score: normalizeNumber(formState.ability_score),
      aspiration_score: normalizeNumber(formState.aspiration_score),
      creativity_score: normalizeNumber(formState.creativity_score),
      commitment_score: normalizeNumber(formState.commitment_score),
      fit_score: normalizeNumber(formState.fit_score),
    })
  }

  if (leadPending) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)]">
          <div className="space-y-3">
            <Skeleton className="h-6 w-48 rounded-full" />
            <Skeleton className="h-4 w-64 rounded-full" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)]">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!lead) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-t-[2.5px] border-slate-200/70 border-t-[#d6ae4e] bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  {lead.full_name}
                </h2>
                {leadFetching ? (
                  <Loader2 className="size-4 animate-spin text-slate-400" />
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5 text-slate-400" />
                  {lead.email || t("noEmail")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5 text-slate-400" />
                  {lead.phone || t("noPhone")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-slate-400" />
                  {lead.province || t("noProvince")}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {lead.status ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium",
                    statusClassNameMap[lead.status]
                  )}
                >
                  {leadStatusLabelMap[lead.status]}
                </Badge>
              ) : null}

              {lead.temperature ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium",
                    temperatureClassNameMap[lead.temperature]
                  )}
                >
                  <Thermometer className="size-3" />
                  {leadTemperatureLabelMap[lead.temperature]}
                </Badge>
              ) : null}

              <Badge
                variant="outline"
                className="rounded-full border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700"
              >
                <Sparkles className="size-3" />
                {t("scoreValue", { score: lead.score ?? 0 })}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50/80 to-white px-4 py-3 shadow-none">
            <p className="text-xs font-medium text-slate-500">
              {t("lastInteraction")}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {formatDateTime(lead.last_interaction_at)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50/80 to-white px-4 py-3 shadow-none">
            <p className="text-xs font-medium text-slate-500">
              {t("dateCreated")}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {formatDateTime(lead.created_at)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50/80 to-white px-4 py-3 shadow-none">
            <p className="text-xs font-medium text-slate-500">
              {t("updatedAt")}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {formatDateTime(lead.updated_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">
              {t("leadProfile")}
            </h3>
            <p className="text-[12px] text-slate-500">
              {t("leadProfileDescription")}
            </p>
          </div>

          <Button
            type="button"
            className="h-9 rounded-xl bg-slate-950 px-4 text-[13px] font-medium text-white shadow-sm hover:bg-slate-800"
            disabled={savePending}
            onClick={handleSave}
          >
            {savePending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {t("saveLead")}
          </Button>
        </div>

        {surfaceError ? (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-[12px] text-red-600">
            {surfaceError}
          </div>
        ) : null}

        <div className="mt-5 space-y-5">
          <div>
            <h4 className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
              {t("contactInfo")}
            </h4>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("fullName")}
                </p>
                <Input
                  value={formState.full_name}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("full_name", event.target.value)
                  }
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("email")}
                </p>
                <Input
                  value={formState.email}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("email", event.target.value)
                  }
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("phone")}
                </p>
                <Input
                  value={formState.phone}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("phone", event.target.value)
                  }
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("province")}
                </p>
                <Input
                  value={formState.province}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("province", event.target.value)
                  }
                />
              </div>
              <div className="md:col-span-2">
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("highSchool")}
                </p>
                <Input
                  value={formState.high_school}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("high_school", event.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
              {t("leadStatus")}
            </h4>
            <div className="mt-3 max-w-xs">
              <p className="mb-1.5 text-xs font-medium text-slate-500">
                {t("status")}
              </p>
              <Select
                value={statusDraft}
                onValueChange={(value) => setStatusDraft(value as LeadStatus)}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:ring-0">
                  <SelectValue placeholder={t("selectStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {leadStatusOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-slate-400">
                {t("statusSaveNote")}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
              {t("academicSignals")}
            </h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("temperature")}
                </p>
                <Select
                  value={formState.temperature}
                  onValueChange={(value) =>
                    handleFieldChange(
                      "temperature",
                      value as LeadTemperature | "NONE"
                    )
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:ring-0">
                    <SelectValue placeholder={t("noTemperature")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">{t("noTemperature")}</SelectItem>
                    {leadTemperatureOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">GPA</p>
                <Input
                  value={formState.gpa}
                  type="number"
                  step="0.01"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("gpa", event.target.value)
                  }
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  IELTS
                </p>
                <Input
                  value={formState.ielts}
                  type="number"
                  step="0.1"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("ielts", event.target.value)
                  }
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">SAT</p>
                <Input
                  value={formState.sat}
                  type="number"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("sat", event.target.value)
                  }
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">ACT</p>
                <Input
                  value={formState.act}
                  type="number"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("act", event.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
              {t("documents")}
            </h4>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("cvUrl")}
                </p>
                <Input
                  value={formState.cv_url}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("cv_url", event.target.value)
                  }
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("essayUrl")}
                </p>
                <Input
                  value={formState.essay_url}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("essay_url", event.target.value)
                  }
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("transcriptUrl")}
                </p>
                <Input
                  value={formState.transcript_url}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("transcript_url", event.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
              {t("scoringIndices")}
            </h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("ability")}
                </p>
                <Input
                  value={formState.ability_score}
                  type="number"
                  step="0.01"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("ability_score", event.target.value)
                  }
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("aspiration")}
                </p>
                <Input
                  value={formState.aspiration_score}
                  type="number"
                  step="0.01"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("aspiration_score", event.target.value)
                  }
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("creativity")}
                </p>
                <Input
                  value={formState.creativity_score}
                  type="number"
                  step="0.01"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("creativity_score", event.target.value)
                  }
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("commitment")}
                </p>
                <Input
                  value={formState.commitment_score}
                  type="number"
                  step="0.01"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("commitment_score", event.target.value)
                  }
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  {t("fit")}
                </p>
                <Input
                  value={formState.fit_score}
                  type="number"
                  step="0.01"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none transition-colors focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                  onChange={(event) =>
                    handleFieldChange("fit_score", event.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
              {t("extracurricularJson")}
            </h4>
            <textarea
              value={formState.extracurriculars}
              placeholder={t("extracurricularsPlaceholder")}
              className={cn(textareaClassName, "mt-3")}
              onChange={(event) =>
                handleFieldChange("extracurriculars", event.target.value)
              }
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">
              {t("interestedMajors")}
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            {interestsPending
              ? Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 rounded-2xl" />
                ))
              : null}

            {!interestsPending && interests.length === 0 ? (
              <p className="text-sm text-slate-500">{t("noInterests")}</p>
            ) : null}

            {!interestsPending
              ? interests.map((item) => (
                  <div
                    key={`${item.lead_id}-${item.major_id}`}
                    className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50/80 to-white px-4 py-3 shadow-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {item.major_name || t("unknownMajor")}
                        </p>
                        <p className="mt-1 text-xs tracking-[0.18em] text-slate-400 uppercase">
                          {item.major_code || item.major_id}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700"
                      >
                        {t("priority", { priority: item.priority ?? 0 })}
                      </Badge>
                    </div>
                  </div>
                ))
              : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">
              {t("applications")}
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            {applicationsPending
              ? Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-2xl" />
                ))
              : null}

            {!applicationsPending && applications.length === 0 ? (
              <p className="text-sm text-slate-500">{t("noApplications")}</p>
            ) : null}

            {!applicationsPending
              ? applications.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50/80 to-white px-4 py-3 shadow-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {admissionStageLabelMap[item.stage]}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {t("admissionYear", { year: item.admission_year })}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-full border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
                      >
                        <Trophy className="size-3" />
                        {item.round_name || t("defaultRound")}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                      <p className="inline-flex items-center gap-1.5">
                        <ArrowUpRight className="size-3.5" />
                        {item.source_channel || t("noSourceChannel")}
                      </p>
                      <p>
                        {t("majorCode")}: {item.major_id}
                      </p>
                      <p>
                        {t("updatedAt")}: {formatDateOnly(item.updated_at)}
                      </p>
                    </div>

                    {item.note ? (
                      <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                        {item.note}
                      </p>
                    ) : null}
                  </div>
                ))
              : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeadDetailPanel
