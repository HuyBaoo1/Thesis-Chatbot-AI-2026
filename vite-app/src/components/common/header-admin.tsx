import {
  Bell,
  ChevronDown,
  Loader2,
  LogOut,
  Settings,
  Trash2,
  User,
} from "lucide-react"
import { type UIEvent, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useAuth from "@/hooks/use-auth"
import useNotification from "@/hooks/use-notification"
import useRealtime from "@/hooks/use-realtime"
import useAuthStore from "@/stores/auth-store"
import { formatDateTime } from "@/lib/date"
import type {
  NotificationItem,
  NotificationTarget,
} from "@/types/notification-type"

import LanguageSwitcher from "@/components/common/language-switcher"
import { Separator } from "../ui/separator"
import { SidebarTrigger } from "../ui/sidebar"

const HeaderAdmin = () => {
  const navigate = useNavigate()
  const { t: th } = useTranslation("header-admin")
  const { t: tc } = useTranslation("common")
  const { user, logout, logoutPending, clearAuthData } = useAuth()
  const accessToken = useAuthStore((state) => state.accessToken)
  const notificationTarget: NotificationTarget | undefined =
    user?.role === "ADMIN" ? "ADMIN" : user?.role ? "STAFF" : undefined
  const notificationStaffId = user?.role === "COUNSELOR" ? user.sub : undefined
  const {
    notifications,
    notificationsPending,
    notificationsHasMore,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    loadMoreNotifications,
    loadMoreNotificationsPending,
    markAllNotificationsReadPending,
    deleteNotification,
    deleteNotificationPending,
  } = useNotification({
    enabled: Boolean(user),
    staffId: notificationStaffId,
    target: notificationTarget,
    limit: 8,
  })
  const [deletingNotificationId, setDeletingNotificationId] = useState<
    string | null
  >(null)
  useRealtime({
    enabled: Boolean(user),
    token: accessToken,
  })

  const getInitials = (name?: string | null) => {
    if (!name) return "AD"
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Keep logout usable even if backend cookie cleanup fails.
    } finally {
      clearAuthData()
      navigate("/login", { replace: true })
    }
  }

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id)
      } catch {
        // Keep navigation available even if read status update fails.
      }
    }

    if (notification.conversation_id) {
      navigate(`/message?conversationId=${notification.conversation_id}`)
      return
    }

    if (notification.lead_id) {
      navigate(`/admin/leads?leadId=${notification.lead_id}`)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    setDeletingNotificationId(notificationId)
    try {
      await deleteNotification(notificationId)
    } catch {
      // Keep notification panel usable even when delete request fails.
    } finally {
      setDeletingNotificationId(null)
    }
  }

  const handleNotificationListScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!notificationsHasMore || loadMoreNotificationsPending) {
      return
    }

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    if (scrollHeight - scrollTop - clientHeight <= 24) {
      void loadMoreNotifications()
    }
  }

  return (
    <header className="sticky top-0 z-10 flex h-18 shrink-0 items-center justify-between gap-2 border-b bg-white px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute top-1 right-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-96">
            <div className="flex items-center justify-between px-2 py-1.5">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {th("notifications")}
                </p>
                <p className="text-xs text-slate-500">
                  {unreadCount} {tc("unread")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={unreadCount === 0 || markAllNotificationsReadPending}
                onClick={() => {
                  void markAllNotificationsRead()
                }}
              >
                {tc("markAllRead")}
              </Button>
            </div>

            <DropdownMenuSeparator />

            <div
              className="max-h-96 overflow-y-auto"
              onScroll={handleNotificationListScroll}
            >
              {notificationsPending ? (
                <div className="px-3 py-6 text-center text-sm text-slate-500">
                  {th("loadingNotifications")}
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-500">
                  {th("noNotifications")}
                </div>
              ) : (
                <>
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="items-start gap-3 px-3 py-2.5"
                      onClick={() => {
                        void handleNotificationClick(notification)
                      }}
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          notification.is_read ? "bg-slate-200" : "bg-red-500"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-3 text-sm leading-5 text-slate-700">
                          {notification.content}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDateTime(notification.created_at)}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                        disabled={deleteNotificationPending}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          void handleDeleteNotification(notification.id)
                        }}
                        aria-label={tc("delete")}
                      >
                        {deletingNotificationId === notification.id &&
                        deleteNotificationPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </DropdownMenuItem>
                  ))}

                  {loadMoreNotificationsPending ? (
                    <div className="flex items-center justify-center gap-2 px-3 py-3 text-xs text-slate-500">
                      <Loader2 className="size-3.5 animate-spin" />
                      {tc("loading")}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              variant="outline"
              className="h-8 gap-2 rounded-full pr-3 pl-1"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-slate-950 text-xs font-semibold text-white">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {user?.name || "Admin"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center justify-between gap-0.5">
                <p className="text-sm font-semibold">{user?.name || "Admin"}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.role || "Staff"}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              {th("profile")}
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              {th("settings")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              disabled={logoutPending}
              onClick={() => {
                void handleLogout()
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {logoutPending ? th("loggingOut") : th("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default HeaderAdmin
