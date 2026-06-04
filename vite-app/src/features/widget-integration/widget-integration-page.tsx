import { useState, useCallback } from "react"
import { Check, Copy, ExternalLink, Globe, Code2, Palette } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Falls back to window.location.origin — set VITE_WIDGET_URL explicitly if
// the admin panel and public widget are served from different domains.
const WIDGET_URL =
  import.meta.env.VITE_WIDGET_URL || window.location.origin

const PRESET_COLORS = [
  { label: "Slate", value: "#0f172a" },
  { label: "VinUni Gold", value: "#b8922e" },
  { label: "Blue", value: "#2563eb" },
  { label: "Emerald", value: "#059669" },
]

const WidgetIntegrationPage = () => {
  const [org, setOrg] = useState("vinuni")
  const [primaryColor, setPrimaryColor] = useState("#0f172a")
  const [position, setPosition] = useState<"right" | "left">("right")
  const [copied, setCopied] = useState(false)

  const snippet = `<script
  src="${WIDGET_URL}/widget.js"
  data-org="${org}"
  data-primary="${primaryColor}"
  data-position="${position}">
</script>`

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [snippet])

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Embed Chat Widget
        </h1>
        <p className="mt-1.5 text-[14px] text-slate-500">
          Nhúng AI Chat vào website tuyển sinh của bạn. Chỉ cần copy 1 dòng code.
        </p>
      </div>

      {/* Quick start */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Code2 className="h-4 w-4 text-slate-500" />
          <h2 className="text-[15px] font-semibold text-slate-800">
            Embed Code
          </h2>
        </div>

        <p className="mb-4 text-[13px] text-slate-500">
          Copy đoạn code này vào thẻ <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px]">&lt;head&gt;</code> hoặc trước thẻ <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px]">&lt;/body&gt;</code> trên website của bạn.
        </p>

        {/* Code block */}
        <div className="relative">
          <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-5 text-[13px] leading-relaxed text-slate-200">
            <code>{snippet}</code>
          </pre>
          <Button
            size="sm"
            variant="outline"
            className="absolute right-3 top-3 h-8 cursor-pointer rounded-lg border-slate-700 bg-slate-800 px-3 text-[12px] text-slate-200 hover:bg-slate-700 hover:text-white"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Configuration */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-4 w-4 text-slate-500" />
          <h2 className="text-[15px] font-semibold text-slate-800">
            Tùy chỉnh
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Organization */}
          <div className="space-y-1.5">
            <Label htmlFor="widget-org" className="text-[13px]">
              Organization
            </Label>
            <Input
              id="widget-org"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className="h-10 rounded-xl"
              placeholder="vinuni"
            />
            <p className="text-[11px] text-slate-400">
              Dùng để tracking nguồn lead
            </p>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">Màu nút chat</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`h-8 rounded-lg border px-3 text-[12px] font-medium transition-all ${
                    primaryColor === c.value
                      ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                  onClick={() => setPrimaryColor(c.value)}
                >
                  <span
                    className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: c.value }}
                  />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Position */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">Vị trí</Label>
            <div className="flex gap-2">
              {(["right", "left"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`h-8 rounded-lg border px-3 text-[12px] font-medium capitalize transition-all ${
                    position === p
                      ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                  onClick={() => setPosition(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-500" />
          <h2 className="text-[15px] font-semibold text-slate-800">
            Preview
          </h2>
        </div>

        <p className="mb-4 text-[13px] text-slate-500">
          Sau khi thêm code, chat bubble sẽ hiển thị ở góc dưới website như thế này:
        </p>

        {/* Simulated preview */}
        <div className="relative h-64 overflow-hidden rounded-xl border border-slate-200 bg-[#faf9f6]">
          {/* Fake content bars */}
          <div className="space-y-3 p-6">
            <div className="h-3 w-3/4 rounded bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-slate-200" />
            <div className="h-3 w-5/6 rounded bg-slate-200" />
            <div className="mt-4 h-32 rounded-xl border border-dashed border-slate-300 bg-slate-100/50" />
          </div>

          {/* Fake floating button */}
          <div
            className="absolute flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-lg"
            style={{
              backgroundColor: primaryColor,
              [position]: "20px",
              bottom: "20px",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="absolute right-0.5 top-0.5 h-[11px] w-[11px] rounded-full border-2 border-white bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-slate-500" />
          <h2 className="text-[15px] font-semibold text-slate-800">
            Cách hoạt động
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-[12px] font-bold text-white">
              1
            </div>
            <h3 className="text-[13px] font-semibold text-slate-800">
              Thêm script
            </h3>
            <p className="mt-1 text-[12px] text-slate-500">
              Copy 1 dòng code vào website. Widget tự động hiển thị chat bubble
              góc dưới.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-[12px] font-bold text-white">
              2
            </div>
            <h3 className="text-[13px] font-semibold text-slate-800">
              Khách chat
            </h3>
            <p className="mt-1 text-[12px] text-slate-500">
              Khách nhấn vào bubble → điền tên/email → chat với AI 24/7 về
              tuyển sinh.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-[12px] font-bold text-white">
              3
            </div>
            <h3 className="text-[13px] font-semibold text-slate-800">
              Thu thập lead
            </h3>
            <p className="mt-1 text-[12px] text-slate-500">
              Lead tự động lưu vào dashboard. Admin xem được nguồn từ domain
              nào.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WidgetIntegrationPage
