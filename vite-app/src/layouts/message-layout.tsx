import HeaderAdmin from "@/components/common/header-admin"
import AppSidebar from "@/components/common/sidebar-admin"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import ChatPage from "@/features/chat/chat-page"

const MessageLayout = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh max-h-svh min-h-0 overflow-hidden bg-slate-100">
        <HeaderAdmin />
        <main className="flex min-h-0 flex-1 overflow-hidden p-3 md:p-4">
          <ChatPage />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default MessageLayout
