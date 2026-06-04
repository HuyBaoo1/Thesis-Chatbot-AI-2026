import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  FileCheck2,
  Languages,
  NotebookPen,
  Users,
} from "lucide-react"
import { useTranslation } from "react-i18next"

const HomeAdmissionConditionsSection = () => {
  const { t } = useTranslation("home")
  const criteria = [
    {
      icon: FileCheck2,
      title: t("admissionSections.conditions.criteria.academic.title"),
      items: [
        t("admissionSections.conditions.criteria.academic.items.0"),
        t("admissionSections.conditions.criteria.academic.items.1"),
      ],
    },
    {
      icon: Languages,
      title: t("admissionSections.conditions.criteria.language.title"),
      items: [
        t("admissionSections.conditions.criteria.language.items.0"),
        t("admissionSections.conditions.criteria.language.items.1"),
      ],
    },
    {
      icon: Users,
      title: t("admissionSections.conditions.criteria.leadership.title"),
      items: [
        t("admissionSections.conditions.criteria.leadership.items.0"),
        t("admissionSections.conditions.criteria.leadership.items.1"),
      ],
    },
    {
      icon: NotebookPen,
      title: t("admissionSections.conditions.criteria.statement.title"),
      items: [
        t("admissionSections.conditions.criteria.statement.items.0"),
        t("admissionSections.conditions.criteria.statement.items.1"),
      ],
    },
  ]

  return (
    <section
      id="admission-conditions"
      className="scroll-mt-28 bg-white py-16 lg:py-20"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Badge className="rounded-full bg-slate-100 px-4 py-1 text-xs tracking-[0.14em] text-slate-700 uppercase">
          {t("admissionSections.conditions.badge")}
        </Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 lg:text-4xl">
          {t("admissionSections.conditions.title")}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          {t("admissionSections.conditions.description")}
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {criteria.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_8px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-10 items-center justify-center rounded-xl bg-[#f6ebcd] text-[#a07c24]">
                  <item.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {item.items.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#d6ae4e]" />
                        <span className="text-sm leading-6 text-slate-600">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HomeAdmissionConditionsSection
