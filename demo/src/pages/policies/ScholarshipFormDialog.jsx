import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { FormField } from "../../components/ui/form-field";
import { scholarshipService } from "../../lib/scholarship.service";

const SCHOLARSHIP_TYPES = ["MERIT", "NEED_BASED", "TALENT", "EARLY_BIRD", "SUPPLEMENTARY"];
const SCHOLARSHIP_SCOPES = ["GLOBAL", "MAJOR_PRIORITY", "PROFILE_BASED"];
const VALUE_TYPES = ["PERCENT", "AMOUNT", "FULL"];

export function ScholarshipFormDialog({ open, onOpenChange, scholarship, onSuccess }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isEdit = !!scholarship?.id;

  const [form, setForm] = useState({
    name: scholarship?.name || "",
    type: scholarship?.type || SCHOLARSHIP_TYPES[0],
    scope: scholarship?.scope || SCHOLARSHIP_SCOPES[0],
    value_type: scholarship?.value_type || VALUE_TYPES[0],
    value: scholarship?.value || "",
    year: scholarship?.year || new Date().getFullYear(),
    major_id: scholarship?.major_id || "",
    criteria: scholarship?.criteria || "",
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name?.trim()) {
      newErrors.name = t('policies.scholarships.form.nameRequired');
    }
    if (!form.year) {
      newErrors.year = t('policies.scholarships.form.yearRequired');
    }
    if (form.value_type !== "FULL" && (!form.value || isNaN(form.value))) {
      newErrors.value = t('policies.scholarships.form.valueRequired');
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
        value: form.value ? parseFloat(form.value) : null,
        year: parseInt(form.year),
        criteria: form.criteria ? JSON.parse(form.criteria) : [],
      };

      if (isEdit) {
        await scholarshipService.update(scholarship.id, data);
      } else {
        await scholarshipService.create(data);
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save scholarship:", error);
      if (error.response?.data?.detail?.includes("JSON")) {
        setErrors({ criteria: t('policies.scholarships.form.invalidJsonFormat') });
      } else {
        setErrors({ submit: error.response?.data?.detail || t('policies.scholarships.form.failedToSave') });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('policies.scholarships.form.editScholarship') : t('policies.scholarships.form.addNewScholarship')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('policies.scholarships.form.updateScholarshipPolicy') : t('policies.scholarships.form.createScholarshipProgram')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <div className="p-3 rounded-xl bg-[var(--color-error-light)] border border-[var(--color-accent-200)] text-[var(--color-accent-600)] text-sm">
              {errors.submit}
            </div>
          )}

          <FormField label={t('policies.scholarships.form.name')} required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder={t('policies.scholarships.form.placeholderName')}
            />
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField label={t('policies.scholarships.form.type')}>
              <Select
                value={form.type}
                onChange={(e) => handleChange("type", e.target.value)}
              >
                {SCHOLARSHIP_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </Select>
            </FormField>

            <FormField label={t('policies.scholarships.form.scope')}>
              <Select
                value={form.scope}
                onChange={(e) => handleChange("scope", e.target.value)}
              >
                {SCHOLARSHIP_SCOPES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </Select>
            </FormField>

            <FormField label={t('policies.scholarships.form.year')} required error={errors.year}>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={form.year}
                onChange={(e) => handleChange("year", e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('policies.scholarships.form.valueType')}>
              <Select
                value={form.value_type}
                onChange={(e) => handleChange("value_type", e.target.value)}
              >
                {VALUE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </FormField>

            <FormField label={form.value_type === "FULL" ? t('policies.scholarships.form.value') : t('policies.scholarships.form.value') + " (%)"} error={errors.value}>
              <Input
                type="number"
                step="any"
                min="0"
                value={form.value}
                onChange={(e) => handleChange("value", e.target.value)}
                placeholder={form.value_type === "FULL" ? "Full" : "50"}
                disabled={form.value_type === "FULL"}
              />
            </FormField>
          </div>

          <FormField label={t('policies.scholarships.form.criteria')} error={errors.criteria}>
            <Input
              value={form.criteria}
              onChange={(e) => handleChange("criteria", e.target.value)}
              placeholder={t('policies.scholarships.form.placeholderCriteria')}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('common.saving') : isEdit ? t('policies.scholarships.form.editScholarship') : t('policies.scholarships.form.addNewScholarship')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
