import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router-dom"
import {
  BookOpenText,
  Code2,
  CreditCard,
  Globe2,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  MessageSquareQuote,
  Scan,
  ShieldCheck,
  Users,
} from "lucide-react"

import logo from "@/assets/logo.png"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { canAccessAdminOnlyTools } from "@/lib/permissions"
import useAuthStore from "@/stores/auth-store"
import type { UserRole } from "@/types/auth-type"

type NavItem = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  roles?: UserRole[]
}

type NavSection = {
  title: string
  items: NavItem[]
}

const AppSidebar = () => {
  const location = useLocation()
  const { t } = useTranslation("sidebar-admin")
  const userRole = useAuthStore((state) => state.user?.role)

  const navSections: NavSection[] = [
    {
      title: t("sections.overview"),
      items: [
        { label: t("nav.dashboard"), icon: LayoutDashboard, href: "/admin" },
        {
          label: t("nav.hotQuestions"),
          icon: MessageSquareQuote,
          href: "/admin/hot-questions",
        },
        { label: t("nav.leads"), icon: Users, href: "/admin/leads" },
      ],
    },
    {
      title: t("sections.admissionsOperations"),
      items: [
        {
          label: t("nav.webCrawler"),
          icon: Globe2,
          href: "/admin/web-crawler",
          roles: ["ADMIN"],
        },
        {
          label: t("nav.quickProcessing"),
          icon: Scan,
          href: "/admin/quick-processing",
          roles: ["ADMIN"],
        },
        {
          label: t("nav.knowledgeChunks"),
          icon: BookOpenText,
          href: "/admin/knowledge-chunks",
        },
        {
          label: "Embed Widget",
          icon: Code2,
          href: "/admin/widget-integration",
        },
      ],
    },
    {
      title: t("sections.contentAndPolicy"),
      items: [
        { label: t("nav.majors"), icon: GraduationCap, href: "/admin/majors" },
        {
          label: t("nav.tuitionPolicies"),
          icon: CreditCard,
          href: "/admin/tuition-policies",
        },
      ],
    },
    {
      title: t("sections.systemAdmin"),
      items: [
        {
          label: t("nav.staffs"),
          icon: ShieldCheck,
          href: "/admin/staffs",
          roles: ["ADMIN"],
        },
      ],
    },
    {
      title: t("sections.chat"),
      items: [{ label: t("nav.chat"), icon: MessageCircle, href: "/message" }],
    },
  ]

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles || item.roles.length === 0) {
          return true
        }

        if (item.roles.length === 1 && item.roles[0] === "ADMIN") {
          return canAccessAdminOnlyTools(userRole)
        }

        return item.roles.includes(userRole ?? "COUNSELOR")
      }),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          to="/admin"
          className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-white/70 px-3 py-2 shadow-sm"
        >
          <img
            className="h-10 w-auto shrink-0"
            src={logo}
            alt="VinUni AI Admissions"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {t("adminLabel")}
            </p>
            <p className="truncate text-xs text-slate-500">
              {t("adminDescription")}
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {visibleSections.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link to={item.href}>
                        <Icon className="text-sidebar-foreground/80" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}

export default AppSidebar
