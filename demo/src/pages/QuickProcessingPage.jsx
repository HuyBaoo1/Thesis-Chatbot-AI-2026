import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, CheckCircle, Clock, AlertCircle, X, Check, RefreshCw } from "lucide-react";
import { UploadDialog } from "@/components/ocr/UploadDialog";
import { PreviewModal } from "@/components/ocr/PreviewModal";
import { createOcrJob, fetchMdContent, getOcrJobStatus, listOcrJobs, deleteOcrJob, sendOcrToKb, updateMdContent } from "@/services/ocrApi";

export default function QuickProcessingPage() {
  const [jobs, setJobs] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewJob, setPreviewJob] = useState(null);
  const [previewContent, setPreviewContent] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchJobs = useCallback(async () => {
    try {
      const data = await listOcrJobs({ page: 1, page_size: 50 });
      if (data.jobs) {
        setJobs(
          data.jobs.map((j) => ({
            id: j.job_id,
            name: j.original_filename || "document",
            status: j.status,
            title: j.title,
            category: j.category,
            year: j.year,
            version_start: j.version_start,
            progress: j.progress,
            stage: j.stage,
            sent_to_kb: j.sent_to_kb,
          })),
        );
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const mapStatus = (rqStatus) => {
    if (rqStatus === "started" || rqStatus === "deferred") return "processing";
    return rqStatus;
  };

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const pendingJobs = jobs.filter((j) => ["pending", "queued", "processing", "started", "deferred"].includes(j.status));
      if (pendingJobs.length === 0) return;

      try {
        const updated = await Promise.all(
          pendingJobs.map(async (job) => {
            const status = await getOcrJobStatus(job.id);
            return {
              id: job.id,
              name: status.original_filename || job.name,
              status: mapStatus(status.status),
              title: status.title,
              category: status.category,
              year: status.year,
              version_start: status.version_start,
              progress: status.progress,
              stage: status.stage,
              sent_to_kb: status.sent_to_kb,
            };
          }),
        );

        setJobs((prev) =>
          prev.map((job) => {
            const updatedJob = updated.find((u) => u.id === job.id);
            return updatedJob ? { ...job, ...updatedJob } : job;
          }),
        );
      } catch (err) {
        console.error("Polling OCR jobs failed:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [jobs]);

  const handleUpload = async ({ file, title, category, year, versionStart }) => {
    const result = await createOcrJob({ file, title, category, year, versionStart });
    if (result.reused) {
      showToast(`Reused existing result for "${result.original_filename || file.name}"`, "success");
    }
    const newJob = {
      id: result.job_id,
      name: result.original_filename || file.name,
      status: mapStatus(result.status || "queued"),
      title: result.title || title,
      category: result.category || category,
      year: result.year || year,
      version_start: result.version_start || versionStart,
      uploadedAt: "Just now",
      sent_to_kb: false,
      reused: result.reused || false,
    };
    setJobs((prev) => [newJob, ...prev.filter((job) => job.id !== newJob.id)]);
  };

  const handlePreview = async (job) => {
    setPreviewLoading(true);
    setPreviewJob(job);
    try {
      const content = await fetchMdContent(job.id);
      setPreviewContent(content);
    } catch (err) {
      setPreviewContent("# Error\n\nFailed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!confirm("Delete this job?")) return;
    try {
      await deleteOcrJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err) {
      console.error("Failed to delete job:", err);
      alert("Failed to delete job");
    }
  };

  const handleSendToKb = async ({ jobId, category, chunkSize, chunkOverlap }) => {
    try {
      await sendOcrToKb(jobId, { category, chunkSize, chunkOverlap });
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, sent_to_kb: true } : j)));
      showToast("Sent to Knowledge Base successfully!", "success");
    } catch (err) {
      console.error("Failed to send to KB:", err);
      showToast(`Failed to send to KB: ${err.message || "Unknown error"}`, "error");
    }
  };

  const handleSaveContent = async ({ jobId, content }) => {
    try {
      await updateMdContent(jobId, content);
      setPreviewContent(content);
      showToast("Markdown saved successfully!", "success");
    } catch (err) {
      console.error("Failed to save markdown:", err);
      showToast(`Failed to save markdown: ${err.message || "Unknown error"}`, "error");
      throw err;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
      case "sent_to_kb":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "processing":
      case "started":
      case "queued":
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const CATEGORY_LABELS = {
    TUITION: "Học phí",
    SCHOLARSHIP: "Học bổng",
    REQUIREMENT: "Yêu cầu TS",
    DEADLINE: "Hạn TS",
    PROCESS: "Quy trình TS",
    MAJOR_INFO: "Ngành",
    FAQ: "FAQ",
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quick Processing</h1>
          <p className="text-muted-foreground mt-1">Upload documents for OCR and knowledge base integration</p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${
          toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-blue-600"
        }`}>
          {toast.type === "success" ? <Check className="w-5 h-5" /> : null}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Jobs</h2>
          <button onClick={fetchJobs} className="text-sm text-blue-600 hover:text-blue-800">
            Refresh
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
            <p className="text-sm text-gray-500 mt-1">Upload a PDF or image to start OCR processing</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <div key={job.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50">
                {getStatusIcon(job.status)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{job.title || job.name}</p>
                    {job.reused && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <RefreshCw className="w-3 h-3" />
                        Reused
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {job.name}
                    {job.year && <span className="ml-2">• {job.year}</span>}
                    {job.version_start && job.version_start > 1 && <span className="ml-2">• v{job.version_start}</span>}
                  </p>
                </div>

                {(job.progress != null || ["started", "queued", "processing"].includes(job.status)) &&
                !["completed", "failed"].includes(job.status) ? (
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{job.stage || job.status}</span>
                      <span className="text-xs font-medium text-blue-600">{job.progress != null ? `${job.progress}%` : "..."}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${job.progress || 0}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-1 bg-gray-100 rounded-full">
                    <span className="text-sm text-gray-700">{CATEGORY_LABELS[job.category] || job.category || job.status}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(job)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={job.status !== "completed"}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handlePreview(job)}
                    className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    disabled={job.status !== "completed" || job.sent_to_kb}
                  >
                    {job.sent_to_kb ? "Sent to KB" : "Send to KB"}
                  </button>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
          {jobs.filter((j) => j.status === "completed").length} completed,{" "}
          {jobs.filter((j) => ["processing", "queued", "started"].includes(j.status)).length} processing,{" "}
          {jobs.filter((j) => j.status === "failed").length} failed
        </div>
      </div>

      <UploadDialog isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onUpload={handleUpload} />

      <PreviewModal
        isOpen={!!previewJob}
        job={previewJob}
        mdContent={previewContent}
        onClose={() => { setPreviewJob(null); setPreviewContent(""); }}
        onSaveContent={handleSaveContent}
        onSendToKB={handleSendToKb}
      />
    </div>
  );
}
