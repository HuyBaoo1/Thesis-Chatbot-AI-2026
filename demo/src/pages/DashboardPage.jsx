import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuthStore } from "../stores/authStore";
import { useTodayAnalytics, useTopLeads } from "../hooks/useAnalytics";
import { parseApiError } from "../lib/errors";
import { formatRelativeTime } from "../lib/utils";
import toast from "react-hot-toast";
import "./Dashboard.css";
import {
  Users,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Flame,
  Clock,
  Bell,
  ChevronRight,
  RefreshCw,
  BarChart3,
} from 'lucide-react';

function StatCard({ title, value, icon: Icon, trend, onClick }) {
  return (
    <div className={`kpi-card ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
      <div className="kpi-card-top">
        <div className="kpi-icon kpi-icon-primary">
          <Icon size={20} />
        </div>
        {trend !== null && trend !== undefined && (
          <span className={`kpi-badge ${trend >= 0 ? "kpi-badge-success" : "kpi-badge-hot"}`}>
            <TrendingUp size={10} className={trend < 0 ? "rotate-180" : ""} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{title}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState("30d");

  const { data: analytics, isLoading: isLoadingAnalytics, error: errorAnalytics, refetch: refetchAnalytics } = useTodayAnalytics();
  const { data: topLeadsData, isLoading: isLoadingTopLeads, error: errorTopLeads, refetch: refetchTopLeads } = useTopLeads({ limit: 5 });

  const isLoading = isLoadingAnalytics || isLoadingTopLeads;
  const error = errorAnalytics || errorTopLeads;
  const topLeads = topLeadsData?.items || topLeadsData || [];

  const handleRefresh = () => {
    refetchAnalytics();
    refetchTopLeads();
  };

  const stats = [
    { title: t('dashboard.totalLeads'), value: analytics?.new_leads ?? 0, icon: Users, trend: 12 },
    { title: t('dashboard.activeConversations'), value: analytics?.total_conversations ?? 0, icon: MessageSquare, trend: 5 },
    { title: t('dashboard.conversionRate'), value: `${((analytics?.fallback_rate || 0) * 100).toFixed(1)}%`, icon: AlertTriangle, trend: -3 },
    { title: t('dashboard.newThisWeek'), value: topLeads.length, icon: Flame, trend: null },
  ];

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            <h1>{t('dashboard.title')}</h1>
            <p>{t('dashboard.subtitle') || 'Real-time analytics for your admissions pipeline'}</p>
          </div>
        </div>
        <div className="dashboard-kpi-row">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="kpi-card skeleton">
              <div className="kpi-card-top">
                <div className="skeleton-icon" />
              </div>
              <div className="skeleton-value" />
              <div className="skeleton-label" />
            </div>
          ))}
        </div>
        <div className="dashboard-main-grid">
          <div className="dashboard-panel skeleton-panel" />
          <div className="dashboard-panel skeleton-panel" />
        </div>
      </div>
    );
  }

  if (error) {
    const parsedError = parseApiError(error);
    const errorMessage = parsedError.code === 'NETWORK_ERROR'
      ? 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.'
      : parsedError.code === 'UNAUTHORIZED'
      ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
      : parsedError.message || 'Đã xảy ra lỗi không mong muốn';

    toast.error(errorMessage, { id: 'dashboard-error' });
    return (
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            <h1>{t('dashboard.title')}</h1>
            <p>{t('dashboard.subtitle') || 'Real-time analytics for your admissions pipeline'}</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-red-50 p-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <p className="mb-2 text-lg font-semibold text-[var(--color-vinuni-navy)]">{errorMessage}</p>
          <p className="mb-4 text-sm text-[var(--color-vinuni-muted)]">Mã lỗi: {parsedError.code}</p>
          <button className="btn" onClick={handleRefresh}>
            <RefreshCw size={14} />
            {t('dashboard.refresh')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
            <h1>{t('dashboard.title')}</h1>
            <p>{t('dashboard.overview')}</p>
          </div>
        <div className="dashboard-header-actions">
          <button className="btn" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            {t('dashboard.refresh')}
          </button>
          <button className="btn" onClick={() => navigate("/analytics")}>
            <BarChart3 size={14} />
            {t('dashboard.analytics')}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-strip">
        <button className="quick-action-chip" onClick={() => navigate("/leads")}>
          <div className="qa-chip-icon qa-icon-primary"><Users size={14} /></div>
          <span>{t('dashboard.viewDetails')}</span>
        </button>
        <button className="quick-action-chip" onClick={() => navigate("/chat/inbox")}>
          <div className="qa-chip-icon qa-icon-info"><MessageSquare size={14} /></div>
          <span>{t('chat.chatting.header.newChat')}</span>
        </button>
        <button className="quick-action-chip" onClick={() => navigate("/notifications")}>
          <div className="qa-chip-icon qa-icon-warning"><Bell size={14} /></div>
          <span>{t('dashboard.overview')}</span>
        </button>
        <button className="quick-action-chip" onClick={() => navigate("/analytics")}>
          <div className="qa-chip-icon qa-icon-accent"><BarChart3 size={14} /></div>
          <span>{t('dashboard.analytics')}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-kpi-row">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Date Filters */}
      <div className="dashboard-filters">
        <div className="dashboard-filters-left">
          <Clock size={16} className="text-[var(--color-text-muted)]" />
          <div className="filter-pill-group">
            {(["7d", "30d", "quarter", "ytd"]).map((key) => (
              <button
                key={key}
                className={`filter-pill${dateRange === key ? " active" : ""}`}
                onClick={() => setDateRange(key)}
              >
                {key === "7d" ? "7 ngày" : key === "30d" ? "30 ngày" : key === "quarter" ? "Quý này" : "Năm nay"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-main-grid">
        {/* Hot Leads */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <Flame size={18} className="text-[var(--color-warning)]" />
              {t('dashboard.newThisWeek')}
            </h3>
            <button className="panel-link" onClick={() => navigate("/leads")}>
              Browse all <ChevronRight size={14} />
            </button>
          </div>
          <div className="panel-body">
            {errorTopLeads ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-red-500 mb-2">Không thể tải danh sách leads</p>
                <button onClick={() => { toast.error('Đang tải lại...'); refetchTopLeads(); }} className="text-sm text-[var(--color-vinuni-red)] font-medium">Thử lại</button>
              </div>
            ) : topLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center mb-3">
                  <Flame size={24} className="text-[var(--color-text-muted)]" />
                </div>
                <p className="text-[0.875rem] font-medium text-[var(--color-text-primary)]">{t('dashboard.noHotLeads') || 'No hot leads yet'}</p>
                <p className="text-[0.8125rem] text-[var(--color-text-secondary)] mt-1">{t('dashboard.hotLeadsDescription') || 'Leads with score 80+ appear here'}</p>
              </div>
            ) : (
              <div className="leads-list">
                {topLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="lead-row-item"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    <div className="lead-avatar">
                      {lead.full_name?.charAt(0) || "?"}
                    </div>
                    <div className="lead-info">
                      <span className="lead-name">{lead.full_name}</span>
                      <span className="lead-contact">{lead.email || lead.phone || t('leads.noLocation')}</span>
                    </div>
                    <div className="lead-meta">
                      <span className="lead-score">{lead.score}</span>
                      <span className="lead-time">{formatRelativeTime(lead.last_interaction_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Overview */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <BarChart3 size={18} className="text-[var(--color-primary)]" />
              {t('dashboard.pipelineOverview') || 'Pipeline Overview'}
            </h3>
          </div>
          <div className="panel-body">
            <div className="stats-summary">
              <div className="stats-summary-row">
                <span className="stats-summary-label">{t('dashboard.totalLeads')}</span>
                <span className="stats-summary-value">{analytics?.new_leads ?? 0}</span>
              </div>
              <div className="stats-summary-row">
                <span className="stats-summary-label">{t('dashboard.activeConversations')}</span>
                <span className="stats-summary-value">{analytics?.total_conversations ?? 0}</span>
              </div>
              <div className="stats-summary-row">
                <span className="stats-summary-label">{t('analytics.fallbackRate')}</span>
                <span className="stats-summary-value">{((analytics?.fallback_rate || 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="stats-summary-row">
                <span className="stats-summary-label">{t('dashboard.hotLeads') || 'Hot Leads'}</span>
                <span className="stats-summary-value">{topLeads.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}