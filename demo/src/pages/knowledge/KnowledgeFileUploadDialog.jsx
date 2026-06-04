import { useState, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { FormField } from "../../components/ui/form-field";
import { knowledgeService } from "../../lib/knowledge.service";
import { majorService } from "../../lib/major.service";
import { Upload, File, X, Loader2 } from 'lucide-react';

const CATEGORIES = [
  "TUITION", "SCHOLARSHIP", "REQUIREMENT", "DEADLINE", "PROCESS", "MAJOR_INFO", "FAQ"
];

export function KnowledgeFileUploadDialog({ open, onOpenChange, onSuccess }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [majors, setMajors] = useState([]);
  const [isFetchingMajors, setIsFetchingMajors] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    major_id: "",
    year: new Date().getFullYear(),
    chunk_size: 500,
    chunk_overlap: 200,
  });

  const [errors, setErrors] = useState({});

  const fetchMajors = async () => {
    setIsFetchingMajors(true);
    try {
      const res = await majorService.list({ limit: 100 });
      setMajors(res.data.items || []);
    } catch (error) {
      console.error("Failed to fetch majors:", error);
    } finally {
      setIsFetchingMajors(false);
    }
  };

  const handleOpenChange = (open) => {
    if (open) {
      fetchMajors();
      setFormData({
        title: "",
        category: "",
        major_id: "",
        year: new Date().getFullYear(),
        chunk_size: 500,
        chunk_overlap: 200,
      });
      setFile(null);
      setErrors({});
    }
    onOpenChange(open);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!file) newErrors.file = t('knowledge.upload.fileRequired');
    if (!formData.category) newErrors.category = t('knowledge.upload.categoryRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("file", file);
      if (formData.title) formDataToSend.append("title", formData.title);
      formDataToSend.append("category", formData.category);
      if (formData.major_id) formDataToSend.append("major_id", formData.major_id);
      if (formData.year) formDataToSend.append("year", formData.year.toString());
      formDataToSend.append("chunk_size", formData.chunk_size.toString());
      formDataToSend.append("chunk_overlap", formData.chunk_overlap.toString());

      await knowledgeService.uploadFile(formDataToSend);
      onSuccess();
      handleOpenChange(false);
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('knowledge.upload.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
              dragActive ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)]" : "border-[var(--color-border)]"
            } ${errors.file ? "border-[var(--color-accent-400)]" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="w-8 h-8 text-[var(--color-primary-500)]" />
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">{file.name}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={removeFile}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                  {t('knowledge.upload.dragDropFile')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('knowledge.upload.browseFiles')}
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".txt,.pdf,.doc,.docx,.md"
            />
          </div>
          {errors.file && <p className="text-sm text-[var(--color-accent-500)]">{errors.file}</p>}

          <FormField label={t('knowledge.upload.titleOptional')}>
            <Input
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Title for this knowledge chunk"
            />
          </FormField>

          <FormField label={t('knowledge.upload.category')} error={errors.category} required>
            <Select
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
              className={errors.category ? "border-[var(--color-accent-400)]" : ""}
            >
              <option value="">Select category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat.replace(/_/g, " ")}</option>
              ))}
            </Select>
          </FormField>

          <FormField label={t('knowledge.upload.majorOptional')}>
            <Select
              value={formData.major_id}
              onChange={(e) => handleChange("major_id", e.target.value)}
              disabled={isFetchingMajors}
            >
              <option value="">{t('knowledge.upload.allMajors')}</option>
              {majors.map((major) => (
                <option key={major.id} value={major.id}>
                  {major.name} ({major.code})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label={t('knowledge.upload.yearOptional')}>
            <Input
              type="number"
              value={formData.year}
              onChange={(e) => handleChange("year", parseInt(e.target.value))}
              min={2000}
              max={2100}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('knowledge.upload.chunkSize')}>
              <Input
                type="number"
                value={formData.chunk_size}
                onChange={(e) => handleChange("chunk_size", parseInt(e.target.value))}
                min={100}
                max={2000}
              />
            </FormField>
            <FormField label={t('knowledge.upload.chunkOverlap')}>
              <Input
                type="number"
                value={formData.chunk_overlap}
                onChange={(e) => handleChange("chunk_overlap", parseInt(e.target.value))}
                min={0}
                max={500}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('knowledge.upload.upload')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
