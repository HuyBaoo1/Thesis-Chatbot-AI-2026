import { Badge } from "@/components/ui/badge"
import {
  Atom,
  BriefcaseBusiness,
  Cpu,
  Palette,
  Scale,
  Stethoscope,
} from "lucide-react"
import { useTranslation } from "react-i18next"

const HomeProgramsSection = () => {
  const { t } = useTranslation("home")
  const programTracks = [
    {
      title: t("admissionSections.programs.tracks.business.title"),
      description: t("admissionSections.programs.tracks.business.description"),
      icon: BriefcaseBusiness,
    },
    {
      title: t("admissionSections.programs.tracks.engineering.title"),
      description: t(
        "admissionSections.programs.tracks.engineering.description"
      ),
      icon: Atom,
    },
    {
      title: t("admissionSections.programs.tracks.health.title"),
      description: t("admissionSections.programs.tracks.health.description"),
      icon: Stethoscope,
    },
    {
      title: t("admissionSections.programs.tracks.law.title"),
      description: t("admissionSections.programs.tracks.law.description"),
      icon: Scale,
    },
    {
      title: t("admissionSections.programs.tracks.arts.title"),
      description: t("admissionSections.programs.tracks.arts.description"),
      icon: Palette,
    },
    {
      title: t("admissionSections.programs.tracks.digital.title"),
      description: t("admissionSections.programs.tracks.digital.description"),
      icon: Cpu,
    },
  ]

  return (
    <section
      id="programs"
      className="relative scroll-mt-28 overflow-hidden border-t border-[#d6ae4e]/20 bg-white py-16 lg:py-20"
    >
      <div className="pointer-events-none absolute -top-10 right-0 h-48 w-48 rounded-full bg-[#d6ae4e]/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-end">
          <div>
            <Badge className="rounded-full bg-[#d6ae4e] px-4 py-1 text-xs tracking-[0.14em] text-white uppercase">
              {t("admissionSections.programs.badge")}
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              {t("admissionSections.programs.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 lg:text-lg">
              {t("admissionSections.programs.description")}
            </p>
          </div>
          <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:p-6">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              {t("admissionSections.programs.learningModelTitle")}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>{t("admissionSections.programs.learningModelItems.0")}</li>
              <li>{t("admissionSections.programs.learningModelItems.1")}</li>
              <li>{t("admissionSections.programs.learningModelItems.2")}</li>
            </ul>
          </aside>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {programTracks.map((track) => (
            <article
              key={track.title}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_8px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#d6ae4e]/45 hover:shadow-[0_14px_28px_-18px_rgba(15,23,42,0.4)]"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#f6ebcd] text-[#a07c24] transition-colors group-hover:bg-[#d6ae4e] group-hover:text-white">
                <track.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {track.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {track.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HomeProgramsSection
