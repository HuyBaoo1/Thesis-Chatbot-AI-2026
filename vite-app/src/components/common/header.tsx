import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router-dom"
import { Menu, X } from "lucide-react"

import logo from "@/assets/logo.png"
import LanguageSwitcher from "@/components/common/language-switcher"

import { cn } from "@/lib/utils"

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { t } = useTranslation("header")

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.hash])

  const sections = [
    { label: t("sections.home"), href: "/#home", sectionId: "home" },
    { label: t("sections.programs"), href: "/#programs", sectionId: "programs" },
    { label: t("sections.scholarship"), href: "/#scholarship", sectionId: "scholarship" },
    {
      label: t("sections.admissionConditions"),
      href: "/#admission-conditions",
      sectionId: "admission-conditions",
    },
    {
      label: t("sections.admissionProcess"),
      href: "/#admission-process",
      sectionId: "admission-process",
    },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-10">
        <Link to="/" className="shrink-0">
          <img className="h-12 w-auto" src={logo} alt="VinUni AI Admissions" />
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {sections.map((section) => {
            const currentHash = location.hash.replace("#", "") || "home"
            const isActive = location.pathname === "/" && currentHash === section.sectionId

            return (
              <Link
                key={`${section.href}-${section.label}`}
                to={section.href}
                className={cn(
                  "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                  "text-muted-foreground hover:bg-accent hover:text-foreground",
                  isActive && "bg-accent text-foreground"
                )}
              >
                {section.label}
                {isActive ? (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary" />
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <button
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={t("toggleMenu")}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="flex flex-col gap-1 border-t border-border/50 bg-background/95 px-6 py-4 backdrop-blur-xl md:hidden">
          {sections.map((section) => {
            const currentHash = location.hash.replace("#", "") || "home"
            const isActive = location.pathname === "/" && currentHash === section.sectionId

            return (
              <Link
                key={`${section.href}-${section.label}`}
                to={section.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "text-muted-foreground hover:bg-accent hover:text-foreground",
                  isActive && "bg-accent text-foreground"
                )}
              >
                {section.label}
              </Link>
            )
          })}
        </div>
      ) : null}
    </header>
  )
}

export default Header
