import { Badge } from "@/components/ui/badge"
import { Award, CircleDollarSign, Sparkles, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

const HomeScholarshipSection = () => {
  const { t } = useTranslation("home")
  const scholarshipTypes = [
    {
      title: t("admissionSections.scholarship.types.merit.title"),
      value: t("admissionSections.scholarship.types.merit.value"),
      description: t("admissionSections.scholarship.types.merit.description"),
    },
    {
      title: t("admissionSections.scholarship.types.needBased.title"),
      value: t("admissionSections.scholarship.types.needBased.value"),
      description: t(
        "admissionSections.scholarship.types.needBased.description"
      ),
    },
    {
      title: t("admissionSections.scholarship.types.talent.title"),
      value: t("admissionSections.scholarship.types.talent.value"),
      description: t("admissionSections.scholarship.types.talent.description"),
    },
  ]

  const timeline = [
    t("admissionSections.scholarship.timeline.0"),
    t("admissionSections.scholarship.timeline.1"),
    t("admissionSections.scholarship.timeline.2"),
    t("admissionSections.scholarship.timeline.3"),
  ]

  return (
    <section
      id="scholarship"
      className="relative scroll-mt-28 overflow-hidden bg-[#f7f3e7] py-16 lg:py-20"
    >
      <div className="pointer-events-none absolute top-16 -left-14 h-48 w-48 rounded-full bg-[#d6ae4e]/12 blur-3xl" />
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Badge className="rounded-full bg-slate-900 px-4 py-1 text-xs tracking-[0.14em] text-white uppercase">
          {t("admissionSections.scholarship.badge")}
        </Badge>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.18fr_1fr]">
          <article className="rounded-3xl bg-white p-7 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] ring-1 ring-slate-200">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 lg:text-4xl">
              {t("admissionSections.scholarship.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {t("admissionSections.scholarship.description")}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <CircleDollarSign className="size-5 text-emerald-600" />
                <p className="mt-2 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                  {t("admissionSections.scholarship.stats.coverage.label")}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {t("admissionSections.scholarship.stats.coverage.value")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Users className="size-5 text-[#a07c24]" />
                <p className="mt-2 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                  {t("admissionSections.scholarship.stats.approach.label")}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {t("admissionSections.scholarship.stats.approach.value")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Award className="size-5 text-indigo-600" />
                <p className="mt-2 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                  {t("admissionSections.scholarship.stats.decision.label")}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {t("admissionSections.scholarship.stats.decision.value")}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {scholarshipTypes.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    <span className="rounded-full bg-[#f6ebcd] px-2.5 py-1 text-xs font-semibold text-[#8f6b1f]">
                      {item.value}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <aside className="rounded-3xl bg-slate-900 p-7 text-slate-100">
            <p className="flex items-center gap-2 text-sm tracking-[0.12em] text-slate-300 uppercase">
              <Sparkles className="size-4 text-[#d6ae4e]" />
              {t("admissionSections.scholarship.timelineTitle")}
            </p>
            <ol className="mt-5 space-y-4">
              {timeline.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-[#d6ae4e] text-xs font-semibold text-slate-950">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6 text-slate-200">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </section>
  )
}

export default HomeScholarshipSection
