import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function MainLayout() {
  return (
    <div className="min-h-screen flex bg-[var(--color-bg-primary)]">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col ml-0 lg:ml-0">
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden bg-[var(--color-bg-primary)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}