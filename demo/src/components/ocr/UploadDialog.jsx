import { useState, useCallback } from "react";
import { X, Upload, FileText } from "lucide-react";

const CATEGORIES = [
  { value: "TUITION", label: "Học phí" },
  { value: "SCHOLARSHIP", label: "Học bổng" },
  { value: "REQUIREMENT", label: "Yêu cầu tuyển sinh" },
  { value: "DEADLINE", label: "Hạn tuyển sinh" },
  { value: "PROCESS", label: "Quy trình tuyển sinh" },
  { value: "MAJOR_INFO", label: "Thông tin ngành" },
  { value: "FAQ", label: "FAQ" },
];

export function UploadDialog({ isOpen, onClose, onUpload }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");
  const [versionStart, setVersionStart] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !category) return;

    setIsUploading(true);
    try {
      await onUpload({
        file,
        title,
        category,
        year: year ? parseInt(year, 10) : null,
        versionStart: versionStart || 1,
      });
      setTitle("");
      setCategory("");
      setYear("");
      setVersionStart(1);
      setFile(null);
      onClose();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  const acceptedTypes = ".pdf,.png,.jpg,.jpeg,.webp,.tiff";
  const canSubmit = file && title.trim() && category;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
              transition-colors
              ${isDragging
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-primary hover:bg-gray-50"}
              ${file ? "border-green-500 bg-green-50" : ""}
            `}
          >
            <input
              type="file"
              accept={acceptedTypes}
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {file ? (
                <div className="flex flex-col items-center">
                  <FileText className="w-10 h-10 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-primary mt-2">Click to change</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-900">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, PNG, JPG, WEBP, TIFF
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Học bổng năm 2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            >
              <option value="">Chọn category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year + Version */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2025"
                min={2000}
                max={2100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version
              </label>
              <input
                type="number"
                value={versionStart}
                onChange={(e) => setVersionStart(parseInt(e.target.value, 10) || 1)}
                min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!canSubmit || isUploading}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading..." : "Upload & Process"}
          </button>
        </div>
      </div>
    </div>
  );
}