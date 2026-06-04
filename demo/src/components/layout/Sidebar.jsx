import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Bell,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  GraduationCap,
  FileText,
  Globe,
} from 'lucide-react';

const mainNav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "COUNSELOR"] },
  { name: "Analytics", href: "/analytics", icon: BarChart3, roles: ["ADMIN"] },
  { name: "Leads", href: "/leads", icon: Users, roles: ["ADMIN", "COUNSELOR"] },
  { name: "Conversations", href: "/chat/inbox", icon: MessageSquare, roles: ["ADMIN", "COUNSELOR"] },
  { name: "Notifications", href: "/notifications", icon: Bell, roles: ["ADMIN", "COUNSELOR"] },
  { name: "Quick Processing", href: "/quick-processing", icon: FileText, roles: ["ADMIN", "COUNSELOR"] },
  { name: "Web Crawler", href: "/crawl", icon: Globe, roles: ["ADMIN"] },
];

const secondaryNav = [
  { name: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const location = useLocation();

  const filteredMainNav = mainNav.filter((item) => item.roles.includes(user?.role));
  const filteredSecondaryNav = secondaryNav.filter((item) => item.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    window.location.replace("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 h-full w-[260px]
          bg-card border-r border-border
          flex flex-col
          lg:static lg:translate-x-0 lg:h-screen
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          transition-transform duration-200 ease-out
        `}
      >
        {/* Logo Header */}
        <div className="flex items-center h-16 px-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[1rem] font-bold text-card-foreground">VinUni</span>
              <span className="text-[0.625rem] text-muted-foreground block -mt-0.5 uppercase tracking-wider">Admissions</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {/* Main section */}
          <div className="mb-6">
            <p className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">
              Workspace
            </p>
            <div className="space-y-1">
              {filteredMainNav.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg
                      text-sm font-medium
                      transition-colors duration-150
                      ${isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}
                    `}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Secondary section */}
          {filteredSecondaryNav.length > 0 && (
            <div className="pt-4 border-t border-border">
              <div className="space-y-1">
                {filteredSecondaryNav.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg
                        text-sm font-medium
                        transition-colors duration-150
                        ${isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}
                      `}
                    >
                      <item.icon className="w-[18px] h-[18px]" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          {/* User */}
          <div className="flex items-center gap-3 p-2 mb-2 rounded-lg bg-accent">
            <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[0.75rem] font-semibold">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-card-foreground truncate">{user?.name || "User"}</p>
              <p className="text-[0.625rem] text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-1">
            <button
              onClick={() => window.open("https://vinuni.edu.vn", "_blank")}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <HelpCircle className="w-[18px] h-[18px]" />
              <span>Help & Support</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile FAB */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-6 left-6 z-30 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center lg:hidden"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
    </>
  );
}