import apiClient from "@/lib/api";

const API_BASE_URL = "";

export async function createOcrJob({ file, title, category, year, versionStart }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  formData.append("category", category);
  if (year) {
    formData.append("year", String(year));
  }
  formData.append("version_start", String(versionStart || 1));

  const response = await apiClient.post(`${API_BASE_URL}/ocr-quick/jobs`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}

export async function getOcrJobStatus(jobId) {
  const response = await apiClient.get(`${API_BASE_URL}/ocr-quick/jobs/${jobId}`);
  return response.data;
}

export async function fetchMdContent(jobId) {
  const response = await apiClient.get(`${API_BASE_URL}/ocr-quick/jobs/${jobId}/content`, {
    responseType: "text",
    transformResponse: [(data) => data],
  });
  return response.data;
}

export async function downloadMdContent(jobId) {
  const response = await apiClient.get(`${API_BASE_URL}/ocr-quick/jobs/${jobId}/download`);
  return response.data.url;
}

export async function updateMdContent(jobId, content) {
  const response = await apiClient.put(`${API_BASE_URL}/ocr-quick/jobs/${jobId}/content`, {
    content,
  });
  return response.data;
}

export async function listOcrJobs({ page = 1, page_size = 20 }) {
  const response = await apiClient.get(`${API_BASE_URL}/ocr-quick/jobs?page=${page}&page_size=${page_size}`);
  return response.data;
}

export async function deleteOcrJob(jobId) {
  const response = await apiClient.delete(`${API_BASE_URL}/ocr-quick/jobs/${jobId}`);
  return response.data;
}

export async function sendOcrToKb(jobId, { category, chunkSize, chunkOverlap }) {
  const response = await apiClient.post(`${API_BASE_URL}/ocr-quick/jobs/${jobId}/send-to-kb`, {
    category,
    chunk_size: chunkSize,
    chunk_overlap: chunkOverlap,
  });
  return response.data;
}
