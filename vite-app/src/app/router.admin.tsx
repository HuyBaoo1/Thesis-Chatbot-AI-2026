import type { ReactNode } from "react"
import NotFound from "@/components/common/not-found"
import DashboardPage from "@/features/dashboard/dashboard-page"
import HotQuestionsPage from "@/features/hot-questions/hot-questions-page"
import LeadPage from "@/features/lead/lead-page"
import KnowledgeChunkPage from "@/features/knowledge-chunk/knowledge-chunk-page"
import MajorPage from "@/features/major/major-page"
import StaffPage from "@/features/staff/staff-page"
import TuitionPolicyPage from "@/features/tuition-policy/tuition-policy-page"
import QuickProcessingPage from "@/features/quick-processing/quick-processing-page"
import WebCrawlerPage from "@/features/web-crawler/web-crawler-page"
import WidgetIntegrationPage from "@/features/widget-integration/widget-integration-page"
import AdminLayout from "@/layouts/admin-layout"
import LoginLayout from "@/layouts/login-layout"
import MessageLayout from "@/layouts/message-layout"
import { hasAnyRole } from "@/lib/permissions"
import useAuthStore from "@/stores/auth-store"
import type { UserRole } from "@/types/auth-type"
import { createBrowserRouter, Navigate } from "react-router-dom"

type ProtectedRouteProps = {
  roles: readonly UserRole[]
  children: ReactNode
  redirectTo?: string
}

const ProtectedRoute = ({
  roles,
  children,
  redirectTo = "/admin",
}: ProtectedRouteProps) => {
  const userRole = useAuthStore((state) => state.user?.role)

  if (!userRole) {
    return <Navigate to="/login" replace />
  }

  if (!hasAnyRole(userRole, roles)) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

const adminRouter = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/admin" replace />,
  },
  {
    path: "/login",
    element: <LoginLayout />,
    errorElement: <NotFound />,
  },
  {
    path: "/message",
    element: (
      <ProtectedRoute roles={["ADMIN", "COUNSELOR"]}>
        <MessageLayout />
      </ProtectedRoute>
    ),
    errorElement: <NotFound />,
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute roles={["ADMIN", "COUNSELOR"]} redirectTo="/login">
        <AdminLayout />
      </ProtectedRoute>
    ),
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "staffs",
        element: (
          <ProtectedRoute roles={["ADMIN"]}>
            <StaffPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "leads",
        element: <LeadPage />,
      },
      {
        path: "hot-questions",
        element: <HotQuestionsPage />,
      },
      {
        path: "knowledge-chunks",
        element: <KnowledgeChunkPage />,
      },
      {
        path: "majors",
        element: <MajorPage />,
      },
      {
        path: "tuition-policies",
        element: <TuitionPolicyPage />,
      },
      {
        path: "quick-processing",
        element: (
          <ProtectedRoute roles={["ADMIN"]}>
            <QuickProcessingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "web-crawler",
        element: (
          <ProtectedRoute roles={["ADMIN"]}>
            <WebCrawlerPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "widget-integration",
        element: <WidgetIntegrationPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
])

export default adminRouter
