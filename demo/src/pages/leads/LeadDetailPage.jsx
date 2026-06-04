import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { leadService } from "../../lib/lead.service";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Spinner } from "../../components/ui/spinner";
import { Avatar } from "../../components/ui/avatar";
import { formatDateTime, formatRelativeTime } from "../../lib/utils";
import { LEAD_STATUS, LEAD_TEMPERATURE, STATUS_COLORS, TEMPERATURE_COLORS } from "../../lib/constants";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Flame, Activity } from 'lucide-react';

export default function LeadDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const res = await leadService.get(id);
        setLead(res.data);
        const activitiesRes = await leadService.getActivities(id, { limit: 20 });
        setActivities(activitiesRes.data?.items || []);
      } catch (error) {
        console.error("Failed to fetch lead:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLead();
  }, [id]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  if (!lead) return (
    <div className="text-center py-12">
      <p className="text-[var(--color-text-muted)]">{t('leads.detail.leadNotFound')}</p>
      <Button variant="outline" onClick={() => navigate("/leads")} className="mt-4">{t('leads.detail.backToLeads')}</Button>
    </div>
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/leads")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="page-title">{lead.full_name}</h1>
          <p className="page-subtitle">{t('leads.detail.title')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>{t('leads.detail.profileInformation')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <Avatar fallback={lead.full_name} size="lg" />
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <span className="text-[var(--color-text-secondary)]">{lead.email || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <span className="text-[var(--color-text-secondary)]">{lead.phone || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <span className="text-[var(--color-text-secondary)]">{lead.province || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <span className="text-[var(--color-text-secondary)]">{t('leads.detail.created')} {formatDateTime(lead.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                {lead.status && <Badge className={STATUS_COLORS[lead.status]}>{lead.status.replace("_", " ")}</Badge>}
                {lead.temperature && (
                  <Badge className={TEMPERATURE_COLORS[lead.temperature]}>
                    <Flame className="w-3 h-3 mr-1" />{lead.temperature}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card>
            <Tabs defaultValue="activities">
              <CardHeader className="pb-0">
                <TabsList>
                  <TabsTrigger value="activities">{t('leads.detail.activities')}</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="activities">
                  {activities.length === 0 ? (
                    <p className="text-[var(--color-text-muted)] text-center py-8">{t('leads.detail.noActivitiesYet')}</p>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex gap-4">
                          <div className="w-2 h-2 rounded-full bg-[var(--color-primary-500)] mt-2 shrink-0" />
                          <div className="flex-1">
                            <p className="text-[var(--color-text-primary)]">{activity.action}</p>
                            {activity.score_delta !== 0 && (
                              <p className={`text-sm ${activity.score_delta > 0 ? "text-emerald-600" : "text-[var(--color-accent-500)]"}`}>
                                {activity.score_delta > 0 ? "+" : ""}{activity.score_delta} {t('leads.detail.points')}
                              </p>
                            )}
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatDateTime(activity.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Sidebar - Scores */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t('leads.detail.leadScore')}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <span className="text-5xl font-bold text-gradient">{lead.score || 0}</span>
                <p className="text-[var(--color-text-muted)] text-sm mt-1">{t('leads.detail.overallScore')}</p>
              </div>
              <div className="space-y-4">
                {[t('leads.detail.ability'), t('leads.detail.aspiration'), t('leads.detail.creativity'), t('leads.detail.commitment'), t('leads.detail.fit')].map((label, i) => {
                  const values = [lead.ability_score, lead.aspiration_score, lead.creativity_score, lead.commitment_score, lead.fit_score];
                  const value = values[i] || 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[var(--color-text-secondary)]">{label}</span>
                        <span className="text-[var(--color-text-primary)] font-medium">{value}</span>
                      </div>
                      <div className="h-2 bg-[var(--color-surface-tertiary)] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-accent-500)] transition-all duration-500 rounded-full" style={{ width: `${(value / 10) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('leads.detail.academicInfo')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[[t('leads.detail.gpa'), lead.gpa], [t('leads.detail.ielts'), lead.ielts], [t('leads.detail.sat'), lead.sat], [t('leads.detail.act'), lead.act]].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">{label}</span>
                  <span className="text-[var(--color-text-primary)] font-medium">{value || "-"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
