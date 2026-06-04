import HeaderAdmin from "@/components/common/header-admin"
import AppSidebar from "@/components/common/sidebar-admin"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"

const AdminLayout = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen bg-slate-50">
        <HeaderAdmin />
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default AdminLayout
