import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { applicationService } from "../../lib/application.service";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { Spinner } from "../../components/ui/spinner";
import { formatDateTime } from "../../lib/utils";
import { ADMISSION_STAGE, STAGE_COLORS } from "../../lib/constants";
import { ArrowLeft, Calendar, FileText } from 'lucide-react';

export default function ApplicationDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const res = await applicationService.get(id);
        setApplication(res.data);
      } catch (error) {
        console.error("Failed to fetch application:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchApplication();
  }, [id]);

  const handleStageChange = async (newStage) => {
    try {
      const res = await applicationService.updateStage(id, newStage);
      setApplication(res.data);
    } catch (error) {
      console.error("Failed to update stage:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-text-muted)]">{t('applications.detail.applicationNotFound')}</p>
        <Button variant="outline" onClick={() => navigate("/applications")} className="mt-4">
          {t('applications.detail.backToApplications')}
        </Button>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/applications")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="page-title">
            Application #{application.id?.slice(0, 8)}
          </h1>
          <p className="page-subtitle">{t('applications.detail.title')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('applications.detail.applicationInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[var(--color-primary-500)]" />
                  <span className="text-[var(--color-text-secondary)]">{t('applications.detail.leadId')}</span>
                </div>
                <span className="font-mono text-[var(--color-text-primary)]">{application.lead_id}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[var(--color-primary-500)]" />
                  <span className="text-[var(--color-text-secondary)]">{t('applications.detail.admissionYear')}</span>
                </div>
                <span className="font-medium text-[var(--color-text-primary)]">{application.admission_year}</span>
              </div>
              {application.round_name && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-secondary)]">{t('applications.detail.round')}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{application.round_name}</span>
                </div>
              )}
              {application.source_channel && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-secondary)]">{t('applications.detail.sourceChannel')}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{application.source_channel}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                <span className="text-[var(--color-text-secondary)]">{t('applications.detail.created')}</span>
                <span className="text-[var(--color-text-primary)]">{formatDateTime(application.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Stage */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('applications.detail.admissionStage')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={application.stage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full"
              >
                {Object.values(ADMISSION_STAGE).map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </Select>

              <div className="pt-4">
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">{t('applications.detail.stageProgress')}</p>
                <div className="space-y-2">
                  {Object.values(ADMISSION_STAGE).map((stage, index) => (
                    <div
                      key={stage}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        application.stage === stage ? "bg-[var(--color-primary-50)]" : ""
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          application.stage === stage
                            ? "gradient-primary text-white"
                            : "bg-[var(--color-surface-tertiary)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={`text-sm ${
                          application.stage === stage ? "text-[var(--color-text-primary)] font-medium" : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {stage.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
