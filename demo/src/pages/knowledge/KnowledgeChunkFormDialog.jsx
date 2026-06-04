import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { FormField } from "../../components/ui/form-field";
import { knowledgeService } from "../../lib/knowledge.service";

const CATEGORIES = ["TUITION", "SCHOLARSHIP", "REQUIREMENT", "DEADLINE", "PROCESS", "MAJOR_INFO", "FAQ"];

export function KnowledgeChunkFormDialog({ open, onOpenChange, chunk, onSuccess }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isEdit = !!chunk?.id;

  const [form, setForm] = useState({
    title: chunk?.title || "",
    content: chunk?.content || "",
    category: chunk?.category || CATEGORIES[0],
    source: chunk?.source || "",
    source_url: chunk?.source_url || "",
    year: chunk?.year || new Date().getFullYear(),
  });

  // Reset form when chunk changes (e.g., when selecting different chunk to edit)
  useEffect(() => {
    setForm({
      title: chunk?.title || "",
      content: chunk?.content || "",
      category: chunk?.category || CATEGORIES[0],
      source: chunk?.source || "",
      source_url: chunk?.source_url || "",
      year: chunk?.year || new Date().getFullYear(),
    });
  }, [chunk]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.title?.trim()) {
      newErrors.title = t('knowledge.form.titleRequired');
    }
    if (!form.content?.trim()) {
      newErrors.content = t('knowledge.form.contentRequired');
    }
    if (!form.category) {
      newErrors.category = t('knowledge.form.categoryRequired');
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
        year: form.year ? parseInt(form.year) : null,
      };

      if (isEdit) {
        await knowledgeService.update(chunk.id, data);
      } else {
        await knowledgeService.create(data);
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save knowledge chunk:", error);
      setErrors({ submit: error.response?.data?.detail || t('knowledge.form.failedToSave') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('knowledge.form.editChunk') : t('knowledge.form.addChunk')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('knowledge.form.updateKnowledgeContent') : t('knowledge.form.addNewContent')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <div className="p-3 rounded-xl bg-[var(--color-error-light)] border border-[var(--color-accent-200)] text-[var(--color-accent-600)] text-sm">
              {errors.submit}
            </div>
          )}

          <FormField label={t('knowledge.form.title')} required error={errors.title}>
            <Input
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder={t('knowledge.form.placeholderTitle')}
            />
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField label={t('knowledge.form.category')} required error={errors.category}>
              <Select
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </Select>
            </FormField>

            <FormField label={t('knowledge.form.source')} error={errors.source}>
              <Input
                value={form.source}
                onChange={(e) => handleChange("source", e.target.value)}
                placeholder="VinUni Website"
              />
            </FormField>

            <FormField label={t('knowledge.form.year')} error={errors.year}>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={form.year}
                onChange={(e) => handleChange("year", e.target.value)}
              />
            </FormField>
          </div>

          <FormField label={t('knowledge.form.content')} required error={errors.content}>
            <Textarea
              value={form.content}
              onChange={(e) => handleChange("content", e.target.value)}
              placeholder={t('knowledge.form.placeholderContent')}
              className="min-h-[200px]"
            />
          </FormField>

          <FormField label={t('knowledge.form.sourceUrl')} error={errors.source_url}>
            <Input
              value={form.source_url}
              onChange={(e) => handleChange("source_url", e.target.value)}
              placeholder={t('knowledge.form.placeholderSourceUrl')}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('common.saving') : isEdit ? t('knowledge.form.editChunk') : t('knowledge.form.addChunk')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
