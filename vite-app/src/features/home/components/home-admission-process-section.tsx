import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle2, FileText, ListChecks } from "lucide-react"
import { useTranslation } from "react-i18next"

const HomeAdmissionProcessSection = () => {
  const { t } = useTranslation("home")
  const processSteps = [
    {
      icon: FileText,
      title: t("admissionSections.process.steps.application.title"),
      text: t("admissionSections.process.steps.application.text"),
    },
    {
      icon: ListChecks,
      title: t("admissionSections.process.steps.review.title"),
      text: t("admissionSections.process.steps.review.text"),
    },
    {
      icon: ArrowRight,
      title: t("admissionSections.process.steps.interview.title"),
      text: t("admissionSections.process.steps.interview.text"),
    },
    {
      icon: CheckCircle2,
      title: t("admissionSections.process.steps.decision.title"),
      text: t("admissionSections.process.steps.decision.text"),
    },
  ]

  return (
    <section
      id="admission-process"
      className="relative scroll-mt-28 overflow-hidden border-y border-slate-200 bg-slate-950 py-16 text-slate-100 lg:py-20"
    >
      <div className="pointer-events-none absolute right-10 -bottom-16 h-52 w-52 rounded-full bg-[#d6ae4e]/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Badge className="rounded-full bg-white/10 px-4 py-1 text-xs tracking-[0.14em] text-slate-200 uppercase">
          {t("admissionSections.process.badge")}
        </Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight lg:text-4xl">
          {t("admissionSections.process.title")}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          {t("admissionSections.process.description")}
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {processSteps.map((item, index) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-slate-800 text-[#d6ae4e]">
                  <item.icon className="size-5" />
                </div>
                <span className="text-xs font-semibold tracking-[0.1em] text-slate-400">
                  {t("admissionSections.process.stepLabel", {
                    number: index + 1,
                  })}
                </span>
              </div>
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-300">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HomeAdmissionProcessSection
