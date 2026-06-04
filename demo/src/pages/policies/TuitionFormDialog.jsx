import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { FormField } from "../../components/ui/form-field";
import { tuitionService } from "../../lib/tuition.service";

const FEE_TYPES = ["CREDIT", "SEMESTER", "YEAR", "HYBRID"];

export function TuitionFormDialog({ open, onOpenChange, policy, onSuccess }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isEdit = !!policy?.id;

  const [form, setForm] = useState({
    major_id: policy?.major_id || "",
    fee_type: policy?.fee_type || FEE_TYPES[0],
    base_fee: policy?.base_fee || "",
    year: policy?.year || new Date().getFullYear(),
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.major_id) {
      newErrors.major_id = t('policies.tuition.form.majorIdRequired');
    }
    if (!form.base_fee || isNaN(form.base_fee) || parseFloat(form.base_fee) <= 0) {
      newErrors.base_fee = t('policies.tuition.form.baseFeeRequired');
    }
    if (!form.year) {
      newErrors.year = t('policies.tuition.form.yearRequired');
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
        base_fee: parseFloat(form.base_fee),
        year: parseInt(form.year),
      };

      if (isEdit) {
        await tuitionService.update(policy.id, data);
      } else {
        await tuitionService.create(data);
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save tuition policy:", error);
      setErrors({ submit: error.response?.data?.detail || t('policies.tuition.form.failedToSave') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('policies.tuition.form.editPolicy') : t('policies.tuition.form.addPolicy')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('policies.tuition.form.updateTuitionFee') : t('policies.tuition.form.createTuitionStructure')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <div className="p-3 rounded-xl bg-[var(--color-error-light)] border border-[var(--color-accent-200)] text-[var(--color-accent-600)] text-sm">
              {errors.submit}
            </div>
          )}

          <FormField label={t('policies.tuition.form.majorId')} required error={errors.major_id}>
            <Input
              value={form.major_id}
              onChange={(e) => handleChange("major_id", e.target.value)}
              placeholder={t('policies.tuition.form.placeholderMajorId')}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('policies.tuition.form.feeType')}>
              <Select
                value={form.fee_type}
                onChange={(e) => handleChange("fee_type", e.target.value)}
              >
                {FEE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </FormField>

            <FormField label={t('policies.tuition.form.year')} required error={errors.year}>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={form.year}
                onChange={(e) => handleChange("year", e.target.value)}
              />
            </FormField>
          </div>

          <FormField label={t('policies.tuition.form.baseFee')} required error={errors.base_fee}>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.base_fee}
              onChange={(e) => handleChange("base_fee", e.target.value)}
              placeholder={t('policies.tuition.form.placeholderBaseFee')}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('common.saving') : isEdit ? t('policies.tuition.form.editPolicy') : t('policies.tuition.form.addPolicy')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
