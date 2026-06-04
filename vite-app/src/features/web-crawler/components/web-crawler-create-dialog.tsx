import { useEffect, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { Globe2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { CreateCrawlSessionPayload } from "@/types/crawl-type"

type WebCrawlerCreateDialogProps = {
  open: boolean
  isSubmitting?: boolean
  errorMessage?: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: CreateCrawlSessionPayload) => void
}

const WebCrawlerCreateDialog = ({
  open,
  isSubmitting = false,
  errorMessage,
  onOpenChange,
  onSubmit,
}: WebCrawlerCreateDialogProps) => {
  const { t } = useTranslation("web-crawler")
  const [targetUrl, setTargetUrl] = useState("")
  const [limit, setLimit] = useState("100")

  useEffect(() => {
    if (open) return
    const timeoutId = window.setTimeout(() => {
      setTargetUrl("")
      setLimit("100")
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [open])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedLimit = Math.max(1, Math.min(10000, Number(limit || 100)))
    onSubmit({ target_url: targetUrl.trim(), limit: normalizedLimit })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTargetUrl("")
      setLimit("100")
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-0 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18)] sm:max-w-lg">
        <div className="h-0.75 bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

        <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Globe2 className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-semibold text-slate-900">
                {t("newSiteCrawl")}
              </DialogTitle>
              <DialogDescription className="text-[12px] text-slate-500">
                {t("newSiteCrawlHint")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  {t("targetUrl")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    type="url"
                    required
                    value={targetUrl}
                    placeholder="https://admissions.vinuni.edu.vn"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    onChange={(event) => setTargetUrl(event.target.value)}
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel className="text-[12px] font-medium text-slate-600">
                  {t("pageLimit")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    required
                    value={limit}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-[13px] shadow-none focus:border-slate-300 focus:bg-white focus-visible:ring-0"
                    onChange={(event) => setLimit(event.target.value)}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>

            {errorMessage && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-[12px] text-red-600">
                {errorMessage}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 shadow-none hover:bg-slate-50"
              onClick={() => handleOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              className="h-9 rounded-xl bg-slate-950 px-4 text-[13px] font-medium text-white shadow-sm hover:bg-slate-800"
              disabled={isSubmitting || !targetUrl.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Globe2 className="size-3.5" />
              )}
              {t("startCrawl")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default WebCrawlerCreateDialog
