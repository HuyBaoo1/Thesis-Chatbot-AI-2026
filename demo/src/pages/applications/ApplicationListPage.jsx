import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { applicationService } from "../../lib/application.service";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Spinner } from "../../components/ui/spinner";
import { ApplicationFormDialog } from "./ApplicationFormDialog";
import { formatDateTime } from "../../lib/utils";
import { ADMISSION_STAGE, STAGE_COLORS } from "../../lib/constants";
import { Search, Filter, Plus, FileText, ChevronRight } from 'lucide-react';

function usePagination(initialOffset = 0, initialLimit = 20) {
  const [offset, setOffset] = useState(initialOffset);
  const [limit] = useState(initialLimit);
  const reset = useCallback(() => setOffset(0), []);
  const next = useCallback(() => setOffset(prev => prev + limit), [limit]);
  const prev = useCallback(() => setOffset(prev => Math.max(0, prev - limit)), [limit]);
  return { offset, limit, reset, next, prev };
}

export default function ApplicationListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stage, setStage] = useState("");
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });
  const [formOpen, setFormOpen] = useState(false);

  const { offset, limit, reset, next, prev } = usePagination();
  const hasNext = offset + limit < pagination.total;
  const hasPrev = offset > 0;

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit, offset };
      if (stage) params.stage = stage;
      const res = await applicationService.list(params);
      const items = res.data?.items || res.data || [];
      setApplications(Array.isArray(items) ? items : []);
      setPagination({ total: res.data?.total || 0, limit: res.data?.limit || limit, offset: res.data?.offset || offset });
    } catch (error) {
      console.error("Failed to fetch applications:", error);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, [stage, limit, offset]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);
  useEffect(() => { reset(); }, [stage, reset]);

  const stageLabels = {
    [ADMISSION_STAGE.NEW]: "New",
    [ADMISSION_STAGE.PROFILE_SUBMITTED]: "Profile Submitted",
    [ADMISSION_STAGE.DOCUMENT_REVIEW]: "Document Review",
    [ADMISSION_STAGE.INTERVIEW]: "Interview",
    [ADMISSION_STAGE.OFFER_EXTENDED]: "Offer Extended",
    [ADMISSION_STAGE.ENROLLED]: "Enrolled",
    [ADMISSION_STAGE.REJECTED]: "Rejected",
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t('applications.title')}</h1>
          <p className="page-subtitle">{t('applications.subtitle')}</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> {t('applications.newApplication')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <select value={stage} onChange={(e) => { setStage(e.target.value); setPagination(p => ({ ...p, offset: 0 })); }}
            className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/15 cursor-pointer">
            <option value="">{t('applications.allStages')}</option>
            {Object.values(ADMISSION_STAGE).map((s) => <option key={s} value={s}>{stageLabels[s] || s}</option>)}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
        ) : !Array.isArray(applications) || applications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-tertiary)] flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-[var(--color-text-muted)]" />
            </div>
            <p className="text-[var(--color-text-secondary)] font-medium">{t('applications.noApplicationsFound')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('applications.id')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('applications.lead')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('applications.stage')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('applications.year')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('applications.created')}</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} onClick={() => navigate(`/applications/${app.id}`)}
                    className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-secondary)] cursor-pointer transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-[var(--color-text-muted)] group-hover:text-[var(--color-primary-600)]">#{app.id?.slice(0, 8) || "N/A"}</span>
                        <ChevronRight className="w-4 h-4 text-[var(--color-border-hover)] group-hover:text-[var(--color-primary-600)] transition-colors" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--color-text-primary)]">Lead #{app.lead_id?.slice(0, 8) || "N/A"}</p>
                    </td>
                    <td className="px-6 py-4">
                      {app.stage && <Badge className={STAGE_COLORS[app.stage]}>{stageLabels[app.stage] || app.stage}</Badge>}
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-secondary)]">{app.admission_year || "-"}</td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">{formatDateTime(app.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.total > limit && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
            <p className="text-sm text-[var(--color-text-muted)]">{t('common.showing')} {offset + 1} {t('common.to')} {Math.min(offset + limit, pagination.total)} {t('common.of')} {pagination.total}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!hasPrev} onClick={prev}>{t('common.previous')}</Button>
              <Button variant="outline" size="sm" disabled={!hasNext} onClick={next}>{t('common.next')}</Button>
            </div>
          </div>
        )}
      </Card>

      <ApplicationFormDialog open={formOpen} onOpenChange={setFormOpen} onSuccess={fetchApplications} />
    </div>
  );
}
