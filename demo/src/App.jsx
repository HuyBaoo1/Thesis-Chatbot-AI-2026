import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, lazy, Suspense, Component } from "react";
import { useAuthStore } from "./stores/authStore";
import { useNotificationStore } from "./stores/notificationStore";
import { useRealtimeConnection } from "./hooks/useRealtime";
import { MainLayout } from "./components/layout/MainLayout";
import { Spinner } from "./components/ui/spinner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Lazy load pages for code splitting
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LeadListPage = lazy(() => import("./pages/leads/LeadListPage"));
const LeadDetailPage = lazy(() => import("./pages/leads/LeadDetailPage"));
const ChatInboxPage = lazy(() => import("./pages/chat/ChatInboxPage"));
const ChatPage = lazy(() => import("./pages/chat/ChatPage"));
const ConversationPage = lazy(() => import("./pages/chat/ConversationPage"));
const NotificationListPage = lazy(() => import("./pages/notifications/NotificationListPage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const AnalyticsDashboardPage = lazy(() => import("./pages/analytics/AnalyticsDashboardPage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const QuickProcessingPage = lazy(() => import("./pages/QuickProcessingPage"));
const CrawlSessionsPage = lazy(() => import("./pages/admin/CrawlSessionsPage"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

// Error Boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">Something went wrong</h2>
            <p className="text-[var(--color-text-muted)] mb-4">Please refresh the page or contact support.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 gradient-primary text-white rounded-xl hover:opacity-90 transition-opacity"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children, allowedRoles }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const subscribeRealtime = useNotificationStore((s) => s.subscribeRealtime);
  const unsubscribeRealtime = useNotificationStore((s) => s.unsubscribeRealtime);

  useRealtimeConnection();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      subscribeRealtime();
    } else {
      unsubscribeRealtime();
    }
    return () => unsubscribeRealtime();
  }, [isAuthenticated, subscribeRealtime, unsubscribeRealtime]);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

            {/* Public chat route - no auth required */}
            <Route path="/chat" element={<ChatPage />} />

            <Route
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "COUNSELOR"]}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/leads" element={<LeadListPage />} />
              <Route path="/leads/:id" element={<LeadDetailPage />} />
              <Route path="/chat/inbox" element={<ChatInboxPage />} />
              <Route path="/chat/:id" element={<ConversationPage />} />
              <Route path="/notifications" element={<NotificationListPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/quick-processing" element={<QuickProcessingPage />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/analytics" element={<AnalyticsDashboardPage />} />
              <Route path="/crawl" element={<CrawlSessionsPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;