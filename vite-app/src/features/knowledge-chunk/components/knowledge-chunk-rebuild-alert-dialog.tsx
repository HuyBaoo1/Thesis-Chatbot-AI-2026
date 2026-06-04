import { AlertTriangle, DatabaseZap, Loader2 } from "lucide-react"
import { Trans, useTranslation } from "react-i18next"

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

type KnowledgeChunkRebuildAlertDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  isSubmitting?: boolean
}

const KnowledgeChunkRebuildAlertDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: KnowledgeChunkRebuildAlertDialogProps) => {
  const { t } = useTranslation("knowledge-chunk")

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm gap-0 overflow-hidden rounded-2xl border border-slate-200/70 p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)]">
        <div className="h-0.75 bg-linear-to-r from-amber-400 via-amber-300 to-amber-200/40" />
        <div className="flex flex-col items-center gap-3 bg-amber-50/80 px-6 py-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-amber-200 bg-white text-amber-600 shadow-sm">
            <DatabaseZap className="size-5" />
          </div>
          <AlertDialogHeader className="space-y-1 text-center">
            <AlertDialogTitle className="text-[15px] font-semibold text-slate-900">
              {t("rebuildDialogTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] leading-relaxed text-slate-500">
              {t("rebuildDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <div className="px-5 pt-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
            <p className="text-[11px] text-amber-800">
              <Trans
                i18nKey="rebuildDialogNote"
                ns="knowledge-chunk"
                components={{
                  code: (
                    <code className="rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[10px]" />
                  ),
                }}
              />
            </p>
          </div>
        </div>

        <AlertDialogFooter className="mt-4 flex flex-row items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <AlertDialogCancel
            disabled={isSubmitting}
            className="h-9 rounded-xl border-slate-200 text-[13px] text-slate-600"
          >
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            onClick={onConfirm}
            className="h-9 rounded-xl bg-amber-500 text-[13px] hover:bg-amber-600 focus:ring-amber-400"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {t("rebuilding")}
              </>
            ) : (
              <>
                <DatabaseZap className="size-3.5" />
                {t("rebuild")}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default KnowledgeChunkRebuildAlertDialog
