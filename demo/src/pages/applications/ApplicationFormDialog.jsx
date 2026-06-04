import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { FormField } from "../../components/ui/form-field";
import { Spinner } from "../../components/ui/spinner";
import { applicationService } from "../../lib/application.service";
import { leadService } from "../../lib/lead.service";
import { majorService } from "../../lib/major.service";
import { ADMISSION_STAGE } from "../../lib/constants";

export function ApplicationFormDialog({ open, onOpenChange, application, onSuccess }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [majors, setMajors] = useState([]);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    lead_id: "",
    major_id: "",
    admission_year: new Date().getFullYear(),
    stage: ADMISSION_STAGE.NEW,
    note: "",
    round_name: "",
    source_channel: "",
  });

  useEffect(() => {
    if (open) {
      fetchDropdownData();
      if (application) {
        setFormData({
          lead_id: application.lead_id || "",
          major_id: application.major_id || "",
          admission_year: application.admission_year || new Date().getFullYear(),
          stage: application.stage || ADMISSION_STAGE.NEW,
          note: application.note || "",
          round_name: application.round_name || "",
          source_channel: application.source_channel || "",
        });
      } else {
        setFormData({
          lead_id: "",
          major_id: "",
          admission_year: new Date().getFullYear(),
          stage: ADMISSION_STAGE.NEW,
          note: "",
          round_name: "",
          source_channel: "",
        });
      }
      setErrors({});
    }
  }, [open, application]);

  const fetchDropdownData = async () => {
    setIsFetchingData(true);
    try {
      const [leadsRes, majorsRes] = await Promise.all([
        leadService.list({ limit: 100 }),
        majorService.list({ limit: 100 }),
      ]);
      setLeads(leadsRes.data.items || []);
      setMajors(majorsRes.data.items || []);
    } catch (error) {
      console.error("Failed to fetch dropdown data:", error);
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.lead_id) newErrors.lead_id = t('applications.form.leadRequired');
    if (!formData.major_id) newErrors.major_id = t('applications.form.majorRequired');
    if (!formData.admission_year) newErrors.admission_year = t('applications.form.yearRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      if (application) {
        await applicationService.update(application.id, formData);
      } else {
        await applicationService.create(formData);
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save application:", error);
      // No error state update - keep silent
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {application ? t('applications.form.editApplication') : t('applications.form.newApplication')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label={t('applications.form.lead')} error={errors.lead_id} required>
            <Select
              value={formData.lead_id}
              onChange={(e) => handleChange("lead_id", e.target.value)}
              className={errors.lead_id ? "border-[var(--color-accent-400)]" : ""}
            >
              <option value="">{t('applications.form.selectLead')}</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.full_name} ({lead.email || "No email"})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label={t('applications.form.major')} error={errors.major_id} required>
            <Select
              value={formData.major_id}
              onChange={(e) => handleChange("major_id", e.target.value)}
              className={errors.major_id ? "border-[var(--color-accent-400)]" : ""}
            >
              <option value="">{t('applications.form.selectMajor')}</option>
              {majors.map((major) => (
                <option key={major.id} value={major.id}>
                  {major.name} ({major.code})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label={t('applications.form.admissionYear')} error={errors.admission_year} required>
            <Input
              type="number"
              value={formData.admission_year}
              onChange={(e) => handleChange("admission_year", parseInt(e.target.value))}
              min={2000}
              max={2100}
              className={errors.admission_year ? "border-[var(--color-accent-400)]" : ""}
            />
          </FormField>

          <FormField label={t('applications.form.stage')}>
            <Select
              value={formData.stage}
              onChange={(e) => handleChange("stage", e.target.value)}
            >
              {Object.values(ADMISSION_STAGE).map((stage) => (
                <option key={stage} value={stage}>
                  {stage.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label={t('applications.form.roundName')}>
            <Input
              value={formData.round_name}
              onChange={(e) => handleChange("round_name", e.target.value)}
              placeholder={t('applications.form.placeholderRound')}
            />
          </FormField>

          <FormField label={t('applications.form.sourceChannel')}>
            <Input
              value={formData.source_channel}
              onChange={(e) => handleChange("source_channel", e.target.value)}
              placeholder={t('applications.form.placeholderSource')}
            />
          </FormField>

          <FormField label={t('applications.form.note')}>
            <Textarea
              value={formData.note}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder={t('applications.form.placeholderNote')}
              rows={3}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" /> : (application ? t('common.update') : t('common.create'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
