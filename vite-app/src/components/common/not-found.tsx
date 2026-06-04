import { Home, SearchX } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

const NotFound = () => {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-6 py-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-120px] left-1/2 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-amber-200/60 blur-3xl" />
        <div className="absolute right-[-80px] bottom-[-80px] h-[280px] w-[280px] rounded-full bg-slate-200/70 blur-3xl" />
      </div>

      <section className="relative w-full max-w-2xl rounded-[2rem] border border-slate-200/70 bg-white p-8 text-center shadow-[0_24px_80px_-24px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.85)_inset] sm:p-12">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-amber-300 shadow-sm">
          <SearchX className="h-7 w-7" />
        </div>

        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
          Error 404
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Trang bạn tìm không tồn tại
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-500 sm:text-base">
          Có thể đường dẫn đã thay đổi hoặc không còn khả dụng. Bạn có thể quay
          lại trang chủ để tiếp tục.
        </p>

        <div className="mt-8 flex items-center justify-center">
          <Button
            asChild
            size="lg"
            className="rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800"
          >
            <Link to="/">
              <Home className="h-4 w-4" />
              Quay về trang chủ
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}

export default NotFound
