import { useTranslation } from "react-i18next"

import { RefreshCcw, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"

type QuickProcessingToolbarProps = {
  total: number
  isFetching?: boolean
  onUploadClick: () => void
  onRefreshClick: () => void
}

const QuickProcessingToolbar = ({
  total,
  isFetching = false,
  onUploadClick,
  onRefreshClick,
}: QuickProcessingToolbarProps) => {
  const { t } = useTranslation("quick-processing")

  return (
    <div className="overflow-hidden rounded-2xl border border-t-[2.5px] border-slate-200/70 border-t-[#d6ae4e] bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-slate-900">
            {t("ocrQueue")}
          </h2>
          <p className="text-[12px] text-slate-500">
            {t("jobsPending", { count: total })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 rounded-xl border-slate-200 bg-white px-3 text-[13px] text-slate-600 shadow-none hover:bg-slate-50"
            onClick={onRefreshClick}
          >
            <RefreshCcw
              className={isFetching ? "size-4 animate-spin" : "size-4"}
            />
            {t("refresh")}
          </Button>

          <Button
            type="button"
            size="sm"
            className="h-10 rounded-xl bg-slate-950 px-4 text-[13px] font-medium text-white shadow-sm hover:bg-slate-800"
            onClick={onUploadClick}
          >
            <Upload className="size-4" />
            {t("uploadDocument")}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default QuickProcessingToolbar
