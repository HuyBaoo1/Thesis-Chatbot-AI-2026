import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { analyticsService } from "../../lib/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Spinner } from "../../components/ui/spinner";
import { Badge } from "../../components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { BarChart3, TrendingUp, MessageSquare, AlertTriangle, Zap } from 'lucide-react';

const COLORS = ["var(--color-primary-600)", "var(--color-accent-500)", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"];

export default function AnalyticsDashboardPage() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [dailyData, setDailyData] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [hotQuestions, setHotQuestions] = useState([]);
  const [conversationStats, setConversationStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dailyRes, funnelRes, questionsRes, convStatsRes] = await Promise.all([
          analyticsService.getDaily({ params: { days: 30 } }),
          analyticsService.getConversionFunnel(),
          analyticsService.getHotQuestions({ params: { limit: 10 } }),
          analyticsService.getConversationStats(),
        ]);

        const dailyItems = dailyRes.data?.items || dailyRes.data || [];
        setDailyData(Array.isArray(dailyItems) ? dailyItems : []);

        const funnelItems = funnelRes.data?.items || funnelRes.data?.stages || funnelRes.data || [];
        setFunnelData(Array.isArray(funnelItems) ? funnelItems : []);

        const questionItems = questionsRes.data?.items || questionsRes.data || [];
        setHotQuestions(Array.isArray(questionItems) ? questionItems : []);

        setConversationStats(convStatsRes.data || null);

      } catch (err) {
        console.error("Failed to fetch analytics:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
        <AlertTriangle className="w-8 h-8 mb-2" />
        <p>{t('common.error')}: {error}</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">{t('analytics.title')}</h1>
        <p className="page-subtitle">{t('analytics.subtitle')}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 stagger-children">
        <Card className="card-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">{t('analytics.totalConversations')}</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {conversationStats?.total_conversations ?? 0}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--color-info-light)]">
                <MessageSquare className="w-5 h-5 text-[var(--color-info)]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">{t('analytics.avgMessagesPerConv')}</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {conversationStats?.avg_messages_per_conversation?.toFixed(1) ?? "-"}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--color-success-light)]">
                <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">{t('analytics.hotQuestions')}</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{hotQuestions.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-100">
                <Zap className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Analytics Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.dailyActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-[var(--color-text-muted)]">
                {t('analytics.noDataAvailable')}
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={12} />
                    <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid var(--color-border)",
                        borderRadius: "12px",
                        boxShadow: "var(--shadow-lg)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="new_leads"
                      stroke="var(--color-primary-600)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_conversations"
                      stroke="var(--color-accent-500)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.conversionFunnel')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!Array.isArray(funnelData) || funnelData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-[var(--color-text-muted)]">
                {t('analytics.noDataAvailable')}
              </div>
            ) : (
              <div className="space-y-4">
                {funnelData.map((stage, index) => (
                  <div key={stage.stage || index} className="flex items-center gap-4">
                    <div className="w-32 text-sm text-[var(--color-text-secondary)]">
                      {(stage.stage || "Unknown").replace(/_/g, " ")}
                    </div>
                    <div className="flex-1 h-8 bg-[var(--color-surface-tertiary)] rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-accent-500)] transition-all duration-500 rounded-lg"
                        style={{ width: `${Math.max((stage.count / (funnelData[0]?.count || 1)) * 100, 1)}%` }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-primary)]">
                        {stage.count ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hot Questions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.hotQuestionsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!Array.isArray(hotQuestions) || hotQuestions.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-center py-8">{t('analytics.noHotQuestions')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hotQuestions.map((q, index) => (
                <div key={q.question || index} className="p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[var(--color-primary-600)] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[var(--color-text-primary)] font-medium">{q.question || "N/A"}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge className="bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)]">{q.intent || "General"}</Badge>
                        <span className="text-xs text-[var(--color-text-muted)]">{q.count || 0} {t('analytics.times')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}