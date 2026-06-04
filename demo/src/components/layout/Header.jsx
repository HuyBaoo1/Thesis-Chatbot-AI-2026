import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { Avatar, AvatarFallback } from "../ui/avatar";
import LanguageToggle from "../ui/language-toggle";
import { Bell, Menu, Settings, LogOut, User, Search, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect } from "react";

export function Header() {
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 h-16 px-4 lg:px-6 flex items-center gap-4 bg-card border-b border-border">
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search leads, conversations..."
            className="w-full h-10 pl-10 pr-4 text-sm bg-accent border border-transparent rounded-lg text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-background focus:border-input focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1 md:hidden" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Language Toggle */}
        <LanguageToggle />

        {/* Notifications */}
        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Avatar size="sm">
              <AvatarFallback>{user?.name?.[0] || user?.email?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-sm font-semibold text-card-foreground">{user?.name || "User"}</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-xl border border-border shadow-xl overflow-hidden z-50">
              <div className="px-4 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar size="md">
                    <AvatarFallback>{user?.name?.[0] || user?.email?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-card-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
              <div className="py-2">
                <button
                  onClick={() => { navigate("/profile"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                </button>
                <button
                  onClick={() => { navigate("/settings"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                </button>
              </div>
              <div className="border-t border-border py-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}