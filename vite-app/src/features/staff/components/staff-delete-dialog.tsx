import { AlertTriangle, Loader2, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

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
import type { Staff } from "@/types/staff-type"

type StaffDeleteDialogProps = {
  open: boolean
  staff?: Staff | null
  isDeleting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}

const StaffDeleteDialog = ({
  open,
  staff,
  isDeleting = false,
  onOpenChange,
  onConfirm,
}: StaffDeleteDialogProps) => {
  const { t } = useTranslation("staff")

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm gap-0 overflow-hidden rounded-2xl border border-slate-200/70 p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)]">
        <div className="h-0.75 bg-linear-to-r from-red-400 via-red-300 to-red-200/40" />

        <div className="flex flex-col items-center gap-3 bg-red-50/80 px-6 py-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 shadow-sm">
            <AlertTriangle className="size-5" />
          </div>
          <AlertDialogHeader className="space-y-1 text-center">
            <AlertDialogTitle className="text-[15px] font-semibold text-slate-900">
              {t("deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] leading-relaxed text-slate-500">
              {staff ? (
                <>
                  {t("deleteWarningWithName", {
                    name: staff.name,
                    email: staff.email,
                  })}
                </>
              ) : (
                t("deleteWarningGeneric")
              )}{" "}
              {t("deleteUndoWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <AlertDialogFooter className="flex flex-row items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <AlertDialogCancel
            disabled={isDeleting}
            className="h-9 rounded-xl border-slate-200 text-[13px] text-slate-600"
          >
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={onConfirm}
            className="h-9 rounded-xl bg-red-600 text-[13px] hover:bg-red-700 focus:ring-red-500"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {t("deleting")}
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                {t("deleteAccount")}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default StaffDeleteDialog
