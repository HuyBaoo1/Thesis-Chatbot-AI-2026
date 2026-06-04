import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { FormField } from "../../components/ui/form-field";
import { Avatar } from "../../components/ui/avatar";
import { leadService } from "../../lib/lead.service";
import { staffService } from "../../lib/staff.service";

export function LeadAssignmentDialog({ open, onOpenChange, lead, onSuccess }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [staffs, setStaffs] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState(lead?.assigned_staff_id || "");

  useEffect(() => {
    if (open) {
      fetchStaffs();
      setSelectedStaffId(lead?.assigned_staff_id || "");
    }
  }, [open, lead]);

  const fetchStaffs = async () => {
    try {
      const res = await staffService.list({ limit: 100 });
      setStaffs(res.data.items || []);
    } catch (error) {
      console.error("Failed to fetch staffs:", error);
    }
  };

  const handleAssign = async () => {
    setIsLoading(true);
    try {
      await leadService.assign(lead.id, selectedStaffId || null);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to assign lead:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedStaff = staffs.find((s) => s.id === selectedStaffId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('leads.assignment.title')}</DialogTitle>
          <DialogDescription>
            {t('leads.assignment.assignDescription', { name: lead?.full_name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label={t('leads.assignment.assignToCounselor')}>
            <Select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">{t('leads.assignment.unassigned')}</option>
              {staffs.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.role})
                </option>
              ))}
            </Select>
          </FormField>

          {selectedStaff && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
              <Avatar fallback={selectedStaff.name} size="lg" />
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">{selectedStaff.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{selectedStaff.email}</p>
                <p className="text-xs text-[var(--color-text-muted)] capitalize">{selectedStaff.role?.toLowerCase()}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleAssign} disabled={isLoading}>
            {isLoading ? t('leads.assignment.assigning') : t('leads.assignment.assign')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
