import { useEffect, useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { scholarshipService } from "../../lib/scholarship.service";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Spinner } from "../../components/ui/spinner";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { ScholarshipFormDialog } from "./ScholarshipFormDialog";
import { Plus, Edit, Trash2, Award, Search } from 'lucide-react';

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

export default function ScholarshipListPage() {
  const { t } = useTranslation();
  const [scholarships, setScholarships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });

  const debouncedSearch = useDebounce(search, 300);
  const { offset, limit, reset, next, prev } = usePagination();
  const hasNext = offset + limit < pagination.total;
  const hasPrev = offset > 0;

  const fetchScholarships = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit, offset };
      if (debouncedSearch) params.q = debouncedSearch;
      const res = await scholarshipService.list(params);
      const items = res.data?.items || res.data || [];
      setScholarships(Array.isArray(items) ? items : []);
      setPagination({ total: res.data?.total || 0, limit: res.data?.limit || limit, offset: res.data?.offset || offset });
    } catch (error) {
      console.error("Failed to fetch scholarships:", error);
      setScholarships([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, limit, offset]);

  useEffect(() => { fetchScholarships(); }, [fetchScholarships]);
  useEffect(() => { reset(); }, [reset]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await scholarshipService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchScholarships();
    } catch (error) {
      console.error("Failed to delete scholarship:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getValueColor = (type) => {
    switch (type) {
      case "FULL": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "PERCENT": return "bg-blue-50 text-blue-700 border border-blue-200";
      case "AMOUNT": return "bg-purple-50 text-purple-700 border border-purple-200";
      default: return "bg-[var(--color-surface-tertiary)] text-[var(--color-text-muted)] border border-[var(--color-border)]";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{t('policies.scholarships.title')}</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{t('policies.scholarships.subtitle')}</p>
        </div>
        <Button onClick={() => { setEditingScholarship(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> {t('policies.scholarships.addScholarship')}
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input type="text" placeholder={t('policies.scholarships.searchScholarships')} value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/15 focus:border-[var(--color-primary-500)] transition-all" />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
        ) : !Array.isArray(scholarships) || scholarships.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-tertiary)] flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-[var(--color-text-muted)]" />
            </div>
            <p className="text-[var(--color-text-muted)]">{t('policies.scholarships.noScholarshipPoliciesFound')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('policies.scholarships.name')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('policies.scholarships.type')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('policies.scholarships.value')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('policies.scholarships.scope')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('policies.scholarships.year')}</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {scholarships.map((scholarship) => (
                  <tr key={scholarship.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-secondary)] transition-colors">
                    <td className="px-6 py-4"><p className="font-medium text-[var(--color-text-primary)]">{scholarship.name || "N/A"}</p></td>
                    <td className="px-6 py-4"><Badge className="bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">{scholarship.type || "N/A"}</Badge></td>
                    <td className="px-6 py-4">
                      <Badge className={getValueColor(scholarship.value_type)}>
                        {scholarship.value_type === "FULL" ? "Full" : scholarship.value_type === "PERCENT" ? `${scholarship.value || 0}%` : `$${scholarship.value || 0}`}
                      </Badge>
                    </td>
                    <td className="px-6 py-4"><Badge className="bg-amber-50 text-amber-700 border border-amber-200">{(scholarship.scope || "N/A").replace(/_/g, " ")}</Badge></td>
                    <td className="px-6 py-4 text-[var(--color-text-secondary)]">{scholarship.year || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingScholarship(scholarship); setFormOpen(true); }}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-[var(--color-accent-500)] hover:text-[var(--color-accent-600)] hover:bg-[var(--color-accent-50)]" onClick={() => setDeleteTarget(scholarship)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.total > limit && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">{t('common.showing')} {offset + 1} {t('common.to')} {Math.min(offset + limit, pagination.total)} {t('common.of')} {pagination.total}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!hasPrev} onClick={prev}>{t('common.previous')}</Button>
              <Button variant="outline" size="sm" disabled={!hasNext} onClick={next}>{t('common.next')}</Button>
            </div>
          </div>
        )}
      </Card>

      <ScholarshipFormDialog open={formOpen} onOpenChange={setFormOpen} scholarship={editingScholarship} onSuccess={fetchScholarships} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('policies.scholarships.delete.title')} description={t('policies.scholarships.delete.description', { name: deleteTarget?.name })}
        confirmLabel={t('common.delete')} onConfirm={handleDelete} isLoading={isDeleting} variant="danger" />
    </div>
  );
}