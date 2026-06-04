import { useState, useEffect } from "react";
import { X, FileText, Save } from "lucide-react";

const CATEGORIES = [
  { value: "TUITION", label: "Học phí" },
  { value: "SCHOLARSHIP", label: "Học bổng" },
  { value: "REQUIREMENT", label: "Yêu cầu tuyển sinh" },
  { value: "DEADLINE", label: "Hạn tuyển sinh" },
  { value: "PROCESS", label: "Quy trình tuyển sinh" },
  { value: "MAJOR_INFO", label: "Thông tin ngành" },
  { value: "FAQ", label: "FAQ" },
];

export function PreviewModal({ isOpen, job, mdContent, onClose, onSaveContent, onSendToKB }) {
  const [category, setCategory] = useState("");
  const [chunkSize, setChunkSize] = useState(1200);
  const [chunkOverlap, setChunkOverlap] = useState(100);
  const [draftContent, setDraftContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (job?.category) {
      setCategory(job.category);
    }
  }, [job]);

  useEffect(() => {
    setDraftContent(mdContent || "");
  }, [mdContent]);

  if (!isOpen || !job) return null;

  const isDirty = draftContent !== (mdContent || "");

  const handleSend = async () => {
    if (!category || isDirty || job.sent_to_kb) return;
    setIsSending(true);
    try {
      await onSendToKB({
        jobId: job.job_id || job.id,
        category,
        chunkSize,
        chunkOverlap,
      });
      onClose();
    } catch (error) {
      console.error("Failed to send to KB:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSave = async () => {
    if (!draftContent.trim()) return;
    setIsSaving(true);
    try {
      await onSaveContent({
        jobId: job.job_id || job.id,
        content: draftContent,
      });
    } catch (error) {
      console.error("Failed to save markdown:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Preview Document</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Send-to-KB settings */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              >
                <option value="">Chọn category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chunk Size
              </label>
              <input
                type="number"
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value, 10) || 1200)}
                min={100}
                max={5000}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chunk Overlap
              </label>
              <input
                type="number"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(parseInt(e.target.value, 10) || 100)}
                min={0}
                max={500}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />
            </div>
          </div>
        </div>

        {/* Content - Markdown preview */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {mdContent ? (
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className="min-h-[52vh] w-full resize-y rounded-lg border border-gray-300 bg-white p-4 font-mono text-sm text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              spellCheck={false}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Loading markdown content...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || !draftContent.trim() || isSaving || job.sent_to_kb}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-800 rounded-lg hover:bg-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Markdown"}
          </button>
          <button
            onClick={handleSend}
            disabled={!category || isDirty || isSending || job.sent_to_kb}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {job.sent_to_kb ? "Already sent" : isDirty ? "Save before sending" : isSending ? "Sending..." : "Send to Knowledge Base"}
          </button>
        </div>
      </div>
    </div>
  );
}
