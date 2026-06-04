import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { FormField } from "../../components/ui/form-field";
import { staffService } from "../../lib/staff.service";
import { STAFF_ROLE } from "../../lib/constants";

export function StaffFormDialog({ open, onOpenChange, staff, onSuccess }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isEdit = !!staff?.id;

  const [form, setForm] = useState({
    name: staff?.name || "",
    email: staff?.email || "",
    password: "",
    role: staff?.role || STAFF_ROLE.COUNSELOR,
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
      newErrors.name = t('staff.form.nameRequired');
    }
    if (!form.email?.trim()) {
      newErrors.email = t('staff.form.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = t('staff.form.invalidEmailFormat');
    }
    if (!isEdit && !form.password) {
      newErrors.password = t('staff.form.passwordRequired');
    }
    if (form.password && form.password.length < 6) {
      newErrors.password = t('staff.form.passwordMinLength');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const data = { ...form };
      if (!data.password) delete data.password;

      if (isEdit) {
        await staffService.update(staff.id, data);
      } else {
        await staffService.create(data);
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save staff:", error);
      setErrors({ submit: error.response?.data?.detail || t('staff.form.failedToSave') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('staff.form.editStaff') : t('staff.form.addNewStaff')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('staff.form.updateStaffInfo') : t('staff.form.createStaffAccount')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <div className="p-3 rounded-xl bg-[var(--color-error-light)] border border-[var(--color-accent-200)] text-[var(--color-accent-600)] text-sm">
              {errors.submit}
            </div>
          )}

          <FormField label={t('staff.form.name')} required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder={t('staff.form.placeholderName')}
            />
          </FormField>

          <FormField label={t('staff.form.email')} required error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder={t('staff.form.placeholderEmail')}
            />
          </FormField>

          <FormField label={isEdit ? t('staff.form.newPassword') : t('staff.form.password')} required={!isEdit} error={errors.password}>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder={t('staff.form.placeholderPassword')}
            />
          </FormField>

          <FormField label={t('staff.form.role')} required>
            <Select
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
            >
              {Object.values(STAFF_ROLE).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('common.saving') : isEdit ? t('staff.form.editStaff') : t('staff.form.addNewStaff')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
