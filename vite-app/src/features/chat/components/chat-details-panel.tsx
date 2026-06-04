import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { getDisplayName, getInitials } from "@/features/chat/chat-utils"
import { formatDateTime } from "@/lib/date"
import type {
  ChatConversation,
  ChatConversationStatus,
} from "@/types/chat-type"
import {
  CheckCircle2,
  Circle,
  Clock3,
  FileSearch,
  Mail,
  MessageCircle,
  Phone,
  UserRound,
} from "lucide-react"
import { type ComponentType, useState } from "react"
import { useTranslation } from "react-i18next"

type ChatDetailsPanelProps = {
  conversation: ChatConversation | null
  onOpenLead: () => void
  onStatusChange: (status: ChatConversationStatus) => void | Promise<void>
}

const ChatDetailsPanel = ({
  conversation,
  onOpenLead,
  onStatusChange,
}: ChatDetailsPanelProps) => {
  const { t } = useTranslation("chat")
  const [confirmStatus, setConfirmStatus] =
    useState<ChatConversationStatus | null>(null)

  return (
    <>
      <aside className="hidden h-full min-h-0 flex-col overflow-hidden border-l border-slate-200/80 bg-white lg:flex">
        {/* Header */}
        <div className="border-b border-slate-100 px-4 py-3.5">
          <p className="text-[13px] font-semibold text-slate-950">
            {t("detailsTitle")}
          </p>
        </div>

        {conversation ? (
          <div
            className="min-h-0 flex-1 overflow-y-auto p-4"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#e2e8f0 transparent",
            }}
          >
            {/* Avatar + name */}
            <div className="flex flex-col items-center text-center">
              <Avatar className="size-14">
                <AvatarFallback className="bg-slate-950 text-[15px] font-semibold text-white">
                  {getInitials(getDisplayName(conversation))}
                </AvatarFallback>
              </Avatar>
              <p className="mt-3 text-[14px] font-semibold text-slate-950">
                {getDisplayName(conversation)}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                {conversation.lead_id.slice(0, 8)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 h-8 w-full rounded-xl border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50"
                onClick={onOpenLead}
              >
                <FileSearch className="size-3.5" />
                {t("openLeadDetails")}
              </Button>
            </div>

            {/* Info rows */}
            <div className="mt-5 space-y-3">
              <InfoRow
                icon={Mail}
                label={t("emailLabel")}
                value={conversation.lead_email || "--"}
              />
              <InfoRow
                icon={Phone}
                label={t("phoneLabel")}
                value={conversation.lead_phone || "--"}
              />
              <InfoRow
                icon={UserRound}
                label={t("staffLabel")}
                value={conversation.staff_name || t("unassigned")}
              />
              <InfoRow
                icon={Clock3}
                label={t("updatedLabel")}
                value={formatDateTime(conversation.updated_at)}
              />
            </div>

            {/* Status buttons */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2.5 text-[10px] font-semibold tracking-[0.15em] text-slate-400 uppercase">
                {t("statusSection")}
              </p>
              <div className="grid gap-1.5">
                <StatusButton
                  label={t("statusOpen")}
                  icon={Circle}
                  isActive={conversation.status === "OPEN"}
                  onClick={() => setConfirmStatus("OPEN")}
                />
                <StatusButton
                  label={t("statusHandoff")}
                  icon={MessageCircle}
                  isActive={conversation.status === "HANDOFF"}
                  onClick={() => setConfirmStatus("HANDOFF")}
                />
                <StatusButton
                  label={t("statusClosed")}
                  icon={CheckCircle2}
                  isActive={conversation.status === "CLOSED"}
                  onClick={() => setConfirmStatus("CLOSED")}
                />
              </div>
            </div>

            {/* Summary */}
            {conversation.summary ? (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-2 text-[10px] font-semibold tracking-[0.15em] text-slate-400 uppercase">
                  {t("summarySection")}
                </p>
                <p className="text-[13px] leading-relaxed text-slate-600">
                  {conversation.summary}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-slate-400">
            {t("noConversationSelected")}
          </div>
        )}
      </aside>

      {/* Confirm status dialog */}
      <AlertDialog
        open={Boolean(confirmStatus)}
        onOpenChange={(open) => {
          if (!open) setConfirmStatus(null)
        }}
      >
        <AlertDialogContent className="max-w-sm gap-0 overflow-hidden rounded-2xl border border-slate-200/70 p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)]">
          <div className="h-0.75 bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />
          <AlertDialogHeader className="px-6 pt-6 pb-4">
            <AlertDialogTitle className="text-[15px] font-semibold text-slate-900">
              {t("confirmStatusChange")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] text-slate-500">
              {confirmStatus
                ? t("confirmStatusChangeDescription", { status: confirmStatus })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
            <AlertDialogCancel className="h-9 rounded-xl border-slate-200 text-[13px] text-slate-600">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-9 rounded-xl bg-slate-950 text-[13px] hover:bg-slate-800"
              onClick={() => {
                if (confirmStatus) void onStatusChange(confirmStatus)
                setConfirmStatus(null)
              }}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) => (
  <div className="flex gap-3">
    <Icon className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
    <div className="min-w-0">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-[12px] wrap-break-word text-slate-700">{value}</p>
    </div>
  </div>
)

const StatusButton = ({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string
  icon: ComponentType<{ className?: string }>
  isActive: boolean
  onClick: () => void
}) => (
  <Button
    type="button"
    variant="outline"
    size="sm"
    className={cn(
      "h-8 justify-start gap-2 rounded-xl border-slate-200 text-[12px] font-medium",
      isActive
        ? "border-slate-900 bg-slate-950 text-white hover:bg-slate-800 hover:text-white"
        : "text-slate-600 hover:bg-slate-50"
    )}
    onClick={onClick}
  >
    <Icon className="size-3.5" />
    {label}
  </Button>
)

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

export default ChatDetailsPanel
