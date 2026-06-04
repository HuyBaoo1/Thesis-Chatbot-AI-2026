import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { leadService } from "../../lib/lead.service";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Spinner } from "../../components/ui/spinner";
import { formatRelativeTime } from "../../lib/utils";
import { LEAD_STATUS, LEAD_TEMPERATURE, STATUS_COLORS, TEMPERATURE_COLORS } from "../../lib/constants";
import { Search, Filter, Flame, Users } from 'lucide-react';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function usePagination(initialOffset = 0, initialLimit = 20) {
  const [offset, setOffset] = useState(initialOffset);
  const [limit] = useState(initialLimit);
  const reset = useCallback(() => setOffset(0), []);
  const next = useCallback(() => setOffset(prev => prev + limit), [limit]);
  const prev = useCallback(() => setOffset(prev => Math.max(0, prev - limit)), [limit]);
  return { offset, limit, reset, next, prev };
}

export default function LeadListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [temperature, setTemperature] = useState("");
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });

  const debouncedSearch = useDebounce(search, 300);
  const { offset, limit, reset, next, prev } = usePagination();
  const hasNext = offset + limit < pagination.total;
  const hasPrev = offset > 0;

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit, offset };
      if (debouncedSearch) params.q = debouncedSearch;
      if (status) params.status = status;
      if (temperature) params.temperature = temperature;
      const res = await leadService.list(params);
      const items = res.data?.items || res.data || [];
      setLeads(Array.isArray(items) ? items : []);
      setPagination({ total: res.data?.total || 0, limit: res.data?.limit || limit, offset: res.data?.offset || offset });
    } catch (error) {
      console.error("Failed to fetch leads:", error);
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, status, temperature, limit, offset]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { reset(); }, [status, temperature, reset]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('leads.title')}</h1>
          <p className="page-subtitle">{t('leads.subtitle')}</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input type="text" placeholder={t('leads.search')} value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/15 focus:border-[var(--color-primary-500)] transition-all" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/15 cursor-pointer">
            <option value="">{t('leads.allStatus')}</option>
            {Object.values(LEAD_STATUS).map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <select value={temperature} onChange={(e) => setTemperature(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/15 cursor-pointer">
            <option value="">{t('leads.allTemperature')}</option>
            {Object.values(LEAD_TEMPERATURE).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button onClick={fetchLeads} variant="outline">
            <Filter className="w-4 h-4 mr-2" /> {t('leads.searchButton')}
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
        ) : !Array.isArray(leads) || leads.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-tertiary)] flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-[var(--color-text-muted)]" />
            </div>
            <p className="text-[var(--color-text-secondary)] font-medium">{t('leads.noLeadsFound')}</p>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">{t('leads.tryAdjustingFilters')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('leads.name')}</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('leads.contact')}</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('leads.status')}</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('leads.temperature')}</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('leads.score')}</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('leads.lastActivity')}</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}
                    className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-secondary)] cursor-pointer transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-accent-600)] flex items-center justify-center text-white text-sm font-semibold">
                          {lead.full_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-600)] transition-colors">{lead.full_name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{lead.province || t('leads.noLocation')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-[var(--color-text-secondary)]">{lead.email || "-"}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{lead.phone || "-"}</p>
                    </td>
                    <td className="px-5 py-4">
                      {lead.status && <Badge className={STATUS_COLORS[lead.status]}>{lead.status.replace("_", " ")}</Badge>}
                    </td>
                    <td className="px-5 py-4">
                      {lead.temperature && (
                        <Badge className={TEMPERATURE_COLORS[lead.temperature]}>
                          <Flame className="w-3 h-3 mr-1" />{lead.temperature}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4"><span className="text-xl font-bold text-[var(--color-text-primary)] tabular-nums">{lead.score || 0}</span></td>
                    <td className="px-5 py-4"><span className="text-sm text-[var(--color-text-muted)]">{formatRelativeTime(lead.last_interaction_at)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.total > limit && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
            <p className="text-sm text-[var(--color-text-muted)]">{t('leads.pagination.showing')} {offset + 1} {t('leads.pagination.to')} {Math.min(offset + limit, pagination.total)} {t('leads.pagination.of')} {pagination.total}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={prev} disabled={!hasPrev}>{t('common.previous')}</Button>
              <Button variant="outline" size="sm" onClick={next} disabled={!hasNext}>{t('common.next')}</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
