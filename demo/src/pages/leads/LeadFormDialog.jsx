import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { FormField } from "../../components/ui/form-field";
import { leadService } from "../../lib/lead.service";
import { LEAD_STATUS, LEAD_TEMPERATURE } from "../../lib/constants";

export function LeadFormDialog({ open, onOpenChange, lead, onSuccess }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isEdit = !!lead?.id;

  const [form, setForm] = useState({
    full_name: lead?.full_name || "",
    email: lead?.email || "",
    phone: lead?.phone || "",
    high_school: lead?.high_school || "",
    province: lead?.province || "",
    status: lead?.status || LEAD_STATUS.NEW,
    temperature: lead?.temperature || LEAD_TEMPERATURE.WARM,
    gpa: lead?.gpa || "",
    ielts: lead?.ielts || "",
    sat: lead?.sat || "",
    act: lead?.act || "",
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.full_name?.trim()) {
      newErrors.full_name = t('leads.form.nameRequired');
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = t('leads.form.invalidEmailFormat');
    }
    if (form.gpa && (isNaN(form.gpa) || form.gpa < 0 || form.gpa > 4)) {
      newErrors.gpa = t('leads.form.gpaMustBeBetween');
    }
    if (form.ielts && (isNaN(form.ielts) || form.ielts < 0 || form.ielts > 9)) {
      newErrors.ielts = t('leads.form.ieltsMustBeBetween');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const data = {
        ...form,
        gpa: form.gpa ? parseFloat(form.gpa) : null,
        ielts: form.ielts ? parseFloat(form.ielts) : null,
        sat: form.sat ? parseInt(form.sat) : null,
        act: form.act ? parseInt(form.act) : null,
      };

      if (isEdit) {
        await leadService.update(lead.id, data);
      } else {
        await leadService.create(data);
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save lead:", error);
      setErrors({ submit: error.response?.data?.detail || t('leads.form.failedToSaveLead') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('leads.form.editLead') : t('leads.form.addNewLead')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('leads.form.updateLeadInfo') : t('leads.form.createNewLead')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {errors.submit && (
            <div className="p-3 rounded-xl bg-[var(--color-error-light)] border border-[var(--color-accent-200)] text-[var(--color-accent-600)] text-sm">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('leads.form.fullName')} required error={errors.full_name}>
              <Input
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                placeholder={t('leads.form.placeholderName')}
              />
            </FormField>

            <FormField label={t('leads.form.email')} error={errors.email}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder={t('leads.form.placeholderEmail')}
              />
            </FormField>

            <FormField label={t('leads.form.phone')} error={errors.phone}>
              <Input
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder={t('leads.form.placeholderPhone')}
              />
            </FormField>

            <FormField label={t('leads.form.province')} error={errors.province}>
              <Input
                value={form.province}
                onChange={(e) => handleChange("province", e.target.value)}
                placeholder={t('leads.form.placeholderProvince')}
              />
            </FormField>

            <FormField label={t('leads.form.highSchool')} error={errors.high_school}>
              <Input
                value={form.high_school}
                onChange={(e) => handleChange("high_school", e.target.value)}
                placeholder={t('leads.form.placeholderHighSchool')}
              />
            </FormField>

            <FormField label={t('leads.form.status')}>
              <Select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
              >
                {Object.values(LEAD_STATUS).map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </Select>
            </FormField>

            <FormField label={t('leads.form.temperature')}>
              <Select
                value={form.temperature}
                onChange={(e) => handleChange("temperature", e.target.value)}
              >
                {Object.values(LEAD_TEMPERATURE).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">{t('leads.form.academicScores')}</p>
            <div className="grid grid-cols-4 gap-4">
              <FormField label={t('leads.form.gpaLabel')} error={errors.gpa}>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="4"
                  value={form.gpa}
                  onChange={(e) => handleChange("gpa", e.target.value)}
                  placeholder={t('leads.form.placeholderGpa')}
                />
              </FormField>

              <FormField label={t('leads.form.ieltsLabel')} error={errors.ielts}>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="9"
                  value={form.ielts}
                  onChange={(e) => handleChange("ielts", e.target.value)}
                  placeholder={t('leads.form.placeholderIelts')}
                />
              </FormField>

              <FormField label={t('leads.form.satLabel')} error={errors.sat}>
                <Input
                  type="number"
                  min="0"
                  max="1600"
                  value={form.sat}
                  onChange={(e) => handleChange("sat", e.target.value)}
                  placeholder={t('leads.form.placeholderSat')}
                />
              </FormField>

              <FormField label={t('leads.form.actLabel')} error={errors.act}>
                <Input
                  type="number"
                  min="0"
                  max="36"
                  value={form.act}
                  onChange={(e) => handleChange("act", e.target.value)}
                  placeholder={t('leads.form.placeholderAct')}
                />
              </FormField>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('common.saving') : isEdit ? t('leads.form.updateLead') : t('leads.form.addNewLead')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
