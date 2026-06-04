import { useEffect, useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { staffService } from "../../lib/staff.service";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Spinner } from "../../components/ui/spinner";
import { Avatar } from "../../components/ui/avatar";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { StaffFormDialog } from "./StaffFormDialog";
import { STAFF_ROLE } from "../../lib/constants";
import { Plus, Edit, Trash2, Shield, Users, Search } from 'lucide-react';

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

export default function StaffManagementPage() {
  const { t } = useTranslation();
  const [staffs, setStaffs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });

  const debouncedSearch = useDebounce(search, 300);
  const { offset, limit, reset, next, prev } = usePagination();
  const hasNext = offset + limit < pagination.total;
  const hasPrev = offset > 0;

  const fetchStaffs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit, offset };
      if (debouncedSearch) params.q = debouncedSearch;
      if (role) params.role = role;
      const res = await staffService.list(params);
      const items = res.data?.items || res.data || [];
      setStaffs(Array.isArray(items) ? items : []);
      setPagination({ total: res.data?.total || 0, limit: res.data?.limit || limit, offset: res.data?.offset || offset });
    } catch (error) {
      console.error("Failed to fetch staffs:", error);
      setStaffs([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, role, limit, offset]);

  useEffect(() => { fetchStaffs(); }, [fetchStaffs]);
  useEffect(() => { reset(); }, [role, reset]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await staffService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchStaffs();
    } catch (error) {
      console.error("Failed to delete staff:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{t('staff.title')}</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{t('staff.subtitle')}</p>
        </div>
        <Button onClick={() => { setEditingStaff(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> {t('staff.addStaff')}
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input type="text" placeholder={t('staff.searchStaff')} value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/15 focus:border-[var(--color-primary-500)] transition-all" />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-secondary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/15">
            <option value="">{t('staff.allRoles')}</option>
            {Object.values(STAFF_ROLE).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
        ) : !Array.isArray(staffs) || staffs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-tertiary)] flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-[var(--color-text-muted)]" />
            </div>
            <p className="text-[var(--color-text-muted)]">{t('staff.noStaffFound')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('staff.staff')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('staff.email')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('staff.role')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('common.status')}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('staff.created')}</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {staffs.map((staff) => (
                  <tr key={staff.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-secondary)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar fallback={staff.name?.[0] || staff.email?.[0] || "U"} size="sm" />
                        <span className="font-medium text-[var(--color-text-primary)]">{staff.name || "N/A"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-secondary)]">{staff.email || "-"}</td>
                    <td className="px-6 py-4">
                      <Badge className={staff.role === STAFF_ROLE.ADMIN ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-blue-50 text-blue-700 border border-blue-200"}>
                        <Shield className="w-3 h-3 mr-1" />{staff.role || "N/A"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={staff.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-[var(--color-surface-tertiary)] text-[var(--color-text-muted)] border border-[var(--color-border)]"}>
                        {staff.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                      {staff.created_at ? new Date(staff.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingStaff(staff); setFormOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-[var(--color-accent-500)] hover:text-[var(--color-accent-600)] hover:bg-[var(--color-accent-50)]"
                          onClick={() => setDeleteTarget(staff)}>
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

      <StaffFormDialog open={formOpen} onOpenChange={setFormOpen} staff={editingStaff} onSuccess={fetchStaffs} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('staff.delete.title')} description={t('staff.delete.description', { name: deleteTarget?.name })}
        confirmLabel={t('common.delete')} onConfirm={handleDelete} isLoading={isDeleting} variant="danger" />
    </div>
  );
}