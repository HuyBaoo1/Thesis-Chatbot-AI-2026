import { FileSearch, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import LeadDetailPanel from "@/features/lead/components/lead-detail-panel"
import type {
  Lead,
  LeadApplication,
  LeadInterest,
  UpdateLeadPayload,
} from "@/types/lead-type"

type LeadFormDialogProps = {
  open: boolean
  lead?: Lead | null
  leadPending?: boolean
  leadFetching?: boolean
  interests?: LeadInterest[]
  interestsPending?: boolean
  applications?: LeadApplication[]
  applicationsPending?: boolean
  savePending?: boolean
  errorMessage?: string | null
  onOpenChange: (open: boolean) => void
  onSave: (values: UpdateLeadPayload) => Promise<void> | void
}

const LeadFormDialog = ({
  open,
  lead,
  leadPending = false,
  leadFetching = false,
  interests = [],
  interestsPending = false,
  applications = [],
  applicationsPending = false,
  savePending = false,
  errorMessage,
  onOpenChange,
  onSave,
}: LeadFormDialogProps) => {
  const { t } = useTranslation("leads")
  const { t: tc } = useTranslation("common")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-1.5rem)] max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)] sm:max-w-6xl">
        <div className="h-0.75 bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

        <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <FileSearch className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-[15px] font-semibold text-slate-900">
                {lead?.full_name || t("detailTitle")}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[12px] leading-5 text-slate-500">
                {t("detailDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(100vh-11rem)] overflow-y-auto bg-slate-50/30 px-6 py-5">
          <LeadDetailPanel
            key={lead ? `${lead.id}-${lead.updated_at ?? ""}` : "lead-empty"}
            lead={lead}
            leadPending={leadPending}
            leadFetching={leadFetching}
            interests={interests}
            interestsPending={interestsPending}
            applications={applications}
            applicationsPending={applicationsPending}
            savePending={savePending}
            errorMessage={errorMessage}
            onSave={onSave}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 shadow-none hover:bg-slate-50 hover:text-slate-900"
            disabled={savePending}
            onClick={() => onOpenChange(false)}
          >
            {tc("close")}
          </Button>
          {savePending && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500">
              <Loader2 className="size-3.5 animate-spin" />
              {t("savingChanges")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LeadFormDialog
