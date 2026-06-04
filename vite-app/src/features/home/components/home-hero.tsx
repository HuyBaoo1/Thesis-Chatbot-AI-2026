import { Sparkles, Send } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

const TELEGRAM_BOT_URL = "https://t.me/vinunitele_bot"

type HomeHighlight = {
  label: string
  value: string
  description: string
}

const HomeHero = () => {
  const { t } = useTranslation("home")

  const highlights: HomeHighlight[] = (t("hero.highlights", { returnObjects: true }) as unknown as HomeHighlight[])

  return (
    <div className="flex h-full min-h-0 flex-col justify-between gap-8 py-2 lg:gap-10 lg:py-4">
      {/* Top content */}
      <div className="space-y-6 lg:space-y-7">
        {/* Badge */}
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d6ae4e]/30 bg-[#d6ae4e]/8 px-4 py-2 text-[13px] font-medium text-[#a07c24] shadow-[0_1px_3px_rgba(214,174,78,0.12)]">
          <Sparkles className="h-3.5 w-3.5 text-[#d6ae4e]" />
          {t("hero.badge")}
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="max-w-xl text-[2rem] leading-[1.12] font-semibold tracking-[-0.02em] text-slate-950 sm:text-[2.5rem] lg:text-[2.75rem]">
            {t("hero.headline")}{" "}
            <span className="relative">
              <span className="relative z-10 text-slate-950">
                {t("hero.headlineHighlight")}
              </span>
              <span
                aria-hidden
                className="absolute right-0 bottom-1 left-0 z-0 h-[0.35em] rounded-full bg-[#d6ae4e]/20"
              />
            </span>
          </h1>
          <p className="max-w-md text-[15px] leading-relaxed text-slate-500">
            {t("hero.description")}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px w-16 bg-linear-to-r from-[#d6ae4e]/60 to-transparent" />

        {/* Highlights */}
        <div className="grid grid-cols-3 gap-3">
          {highlights.map((item) => (
            <div
              key={item.label}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] transition-shadow duration-200 hover:shadow-[0_4px_20px_-6px_rgba(15,23,42,0.12)] lg:p-5"
            >
              {/* Subtle top accent */}
              <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-linear-to-r from-[#d6ae4e]/60 via-[#d6ae4e]/30 to-transparent" />

              <p className="text-[10px] font-semibold tracking-[0.2em] text-[#b8922e] uppercase">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 lg:text-3xl">
                {item.value}
              </p>
              <p className="mt-1.5 text-[12px] leading-normal text-slate-500">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="ghost"
          className="group h-auto gap-2.5 rounded-full border border-slate-200 bg-white/90 px-5 py-2.5 text-[13px] font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:bg-white hover:text-slate-800"
        >
          <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer">
            <Send className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            {t("hero.telegramButton")}
          </a>
        </Button>
        <span className="text-[12px] text-slate-400">
          {t("hero.orUseChatbox")}
        </span>
      </div>
    </div>
  )
}

export default HomeHero
