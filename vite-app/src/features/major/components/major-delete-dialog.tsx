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
import type { Major } from "@/types/major-type"

type MajorDeleteDialogProps = {
  open: boolean
  major?: Major | null
  isDeleting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}

const MajorDeleteDialog = ({
  open,
  major,
  isDeleting = false,
  onOpenChange,
  onConfirm,
}: MajorDeleteDialogProps) => {
  const { t } = useTranslation("major")
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm gap-0 overflow-hidden rounded-2xl border border-slate-200 p-0">
        {/* Icon header */}
        <div className="flex flex-col items-center gap-3 bg-red-50 px-6 py-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-red-200 bg-white text-red-500">
            <AlertTriangle className="size-5" />
          </div>

          <AlertDialogHeader className="space-y-1 text-center">
            <AlertDialogTitle className="text-base font-semibold text-slate-900">
              {t("deleteTitle")}
            </AlertDialogTitle>

            <AlertDialogDescription className="text-xs leading-relaxed text-slate-500">
              {major
                ? t("deleteWarning", { name: major.name, code: major.code })
                : t("deleteWarningGeneric")}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Footer */}
        <AlertDialogFooter className="flex flex-row items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <AlertDialogCancel
            disabled={isDeleting}
            className="h-9 rounded-xl border-slate-200 text-sm text-slate-600"
          >
            {t("cancel")}
          </AlertDialogCancel>

          <AlertDialogAction
            disabled={isDeleting}
            onClick={onConfirm}
            className="h-9 rounded-xl bg-red-600 text-sm hover:bg-red-700 focus:ring-red-500"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {t("deleting")}
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                {t("deleteMajor")}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default MajorDeleteDialog
