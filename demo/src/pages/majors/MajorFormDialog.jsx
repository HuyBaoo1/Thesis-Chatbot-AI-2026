import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { FormField } from "../../components/ui/form-field";
import { majorService } from "../../lib/major.service";
import { MAJOR_TYPE } from "../../lib/constants";

export function MajorFormDialog({ open, onOpenChange, major, onSuccess }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isEdit = !!major?.id;

  const [form, setForm] = useState({
    code: major?.code || "",
    name: major?.name || "",
    description: major?.description || "",
    credits: major?.credits || "",
    duration: major?.duration || "",
    degree_type: major?.degree_type || "",
    major_type: major?.major_type || MAJOR_TYPE.UNDERGRAD_MAJOR,
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.code?.trim()) {
      newErrors.code = t('majors.form.codeRequired');
    }
    if (!form.name?.trim()) {
      newErrors.name = t('majors.form.nameRequired');
    }
    if (form.credits && (isNaN(form.credits) || form.credits < 0)) {
      newErrors.credits = t('majors.form.creditsMustBePositive');
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
        credits: form.credits ? parseInt(form.credits) : null,
        duration: form.duration ? parseInt(form.duration) : null,
      };

      if (isEdit) {
        await majorService.update(major.id, data);
      } else {
        await majorService.create(data);
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save major:", error);
      setErrors({ submit: error.response?.data?.detail || t('majors.form.failedToSave') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('majors.form.editMajor') : t('majors.form.addNewMajor')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('majors.form.updateMajorInfo') : t('majors.form.createNewMajor')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <div className="p-3 rounded-xl bg-[var(--color-error-light)] border border-[var(--color-accent-200)] text-[var(--color-accent-600)] text-sm">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('majors.form.code')} required error={errors.code}>
              <Input
                value={form.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder={t('majors.form.placeholderCode')}
              />
            </FormField>

            <FormField label={t('majors.form.majorType')}>
              <Select
                value={form.major_type}
                onChange={(e) => handleChange("major_type", e.target.value)}
              >
                {Object.values(MAJOR_TYPE).map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label={t('majors.form.name')} required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder={t('majors.form.placeholderName')}
            />
          </FormField>

          <FormField label={t('majors.form.description')} error={errors.description}>
            <Input
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder={t('majors.form.placeholderDescription')}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('majors.form.credits')} error={errors.credits}>
              <Input
                type="number"
                min="0"
                value={form.credits}
                onChange={(e) => handleChange("credits", e.target.value)}
                placeholder={t('majors.form.placeholderCredits')}
              />
            </FormField>

            <FormField label={t('majors.form.durationYears')} error={errors.duration}>
              <Input
                type="number"
                min="0"
                value={form.duration}
                onChange={(e) => handleChange("duration", e.target.value)}
                placeholder={t('majors.form.placeholderDuration')}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('common.saving') : isEdit ? t('majors.form.editMajor') : t('majors.form.addNewMajor')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
