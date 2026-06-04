import { useEffect, useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { tuitionService } from "../../lib/tuition.service";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Spinner } from "../../components/ui/spinner";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { TuitionFormDialog } from "./TuitionFormDialog";
import { Plus, Edit, Trash2, DollarSign, Search } from 'lucide-react';

// Custom hook for debounced search
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// Custom hook for pagination
function usePagination(initialOffset = 0, initialLimit = 20) {
  const [offset, setOffset] = useState(initialOffset);
  const [limit] = useState(initialLimit);

  const reset = useCallback(() => setOffset(0), []);
  const next = useCallback(() => setOffset(prev => prev + limit), [limit]);
  const prev = useCallback(() => setOffset(prev => Math.max(0, prev - limit)), [limit]);

  return { offset, limit, reset, next, prev };
}

export default function TuitionListPage() {
  const { t } = useTranslation();
  const [policies, setPolicies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });

  const debouncedSearch = useDebounce(search, 300);
  const { offset, limit, reset, next, prev } = usePagination();
  const hasNext = offset + limit < pagination.total;
  const hasPrev = offset > 0;

  const fetchPolicies = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit, offset };
      if (debouncedSearch) params.q = debouncedSearch;

      const res = await tuitionService.list(params);
      const items = res.data?.items || res.data || [];
      setPolicies(Array.isArray(items) ? items : []);
      setPagination({
        total: res.data?.total || 0,
        limit: res.data?.limit || limit,
        offset: res.data?.offset || offset,
      });
    } catch (error) {
      console.error("Failed to fetch tuition policies:", error);
      setPolicies([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, limit, offset]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Reset offset when filters change
  useEffect(() => {
    reset();
  }, [reset]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await tuitionService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchPolicies();
    } catch (error) {
      console.error("Failed to delete policy:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getFeeTypeColor = (type) => {
    switch (type) {
      case "CREDIT": return "bg-blue-50 text-blue-700 border border-blue-200";
      case "SEMESTER": return "bg-purple-50 text-purple-700 border border-purple-200";
      case "YEAR": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "HYBRID": return "bg-amber-50 text-amber-700 border border-amber-200";
      default: return "bg-[var(--color-surface-tertiary)] text-[var(--color-text-muted)] border border-[var(--color-border)]";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{t('policies.tuition.title')}</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{t('policies.tuition.subtitle')}</p>
        </div>
        <Button onClick={() => { setEditingPolicy(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> {t('policies.tuition.addPolicy')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder={t('policies.tuition.searchPolicies')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/15 focus:border-[var(--color-primary-500)] transition-all"
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        ) : !Array.isArray(policies) || policies.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-tertiary)] flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-[var(--color-text-muted)]" />
            </div>
            <p className="text-[var(--color-text-muted)]">{t('policies.tuition.noTuitionPoliciesFound')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('policies.tuition.majorId')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('policies.tuition.feeType')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('policies.tuition.baseFee')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('policies.tuition.year')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('common.status')}</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-secondary)] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-[var(--color-text-muted)]">
                        {policy.major_id ? policy.major_id.slice(0, 8) + "..." : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getFeeTypeColor(policy.fee_type)}>
                        {policy.fee_type || "N/A"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {policy.base_fee ? `$${policy.base_fee.toLocaleString()}` : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                      {policy.year || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={policy.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-[var(--color-surface-tertiary)] text-[var(--color-text-muted)] border border-[var(--color-border)]"}>
                        {policy.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingPolicy(policy); setFormOpen(true); }}
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteTarget(policy)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > limit && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              {t('common.showing')} {offset + 1} {t('common.to')} {Math.min(offset + limit, pagination.total)} {t('common.of')} {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!hasPrev} onClick={prev}>{t('common.previous')}</Button>
              <Button variant="outline" size="sm" disabled={!hasNext} onClick={next}>{t('common.next')}</Button>
            </div>
          </div>
        )}
      </Card>

      <TuitionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        policy={editingPolicy}
        onSuccess={fetchPolicies}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('policies.tuition.delete.title')}
        description={t('policies.tuition.delete.description')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}