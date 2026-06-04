# Phase Plan: OCR Quick Processing

**Date**: 2026-04-27
**Feature**: ocr-quick-processing
**Based on**:
- `history/ocr-quick-processing/CONTEXT.md`
- `history/ocr-quick-processing/discovery.md`
- `history/ocr-quick-processing/approach.md`

---

## 1. Feature Summary

OCR Quick Processing là một service trong hệ thống chatbot tuyển sinh, cho phép user upload tài liệu (PDF, ảnh), OCR bằng Google Gemini Vision API, xuất ra file Markdown, và tích hợp vào knowledge base thông qua embedding pipeline.

User có 2 lựa chọn: **(1) Preview** — xem và kiểm duyệt MD trước khi đưa vào embedding pipeline, hoặc **(2) Auto** — tự động xử lý ngay. Các file được xử lý background, user có thể đóng app và quay lại sau.

Category assignment: **AI detect + User confirmation** (D12). User có thể chọn "Auto detect" để AI suggest category từ MD content, hoặc chọn manual.

---

## 2. Why This Breakdown

- **Phase 1 phải đầu tiên**: Backend OCR pipeline là nền tảng — không có API thì frontend không có gì để call. Backend có thể test độc lập qua Postman/curl.
- **Phase 2 tiếp theo**: Preview UI là phần quan trọng nhất cho user — họ muốn kiểm duyệt MD và category trước khi đưa vào knowledge base. Không nên skip.
- **Phase 3 cuối cùng**: Auto mode và batch status hoàn thiện trải nghiệm — sau khi preview mode đã works.

---

## 3. Phase Overview Table

| Phase | What Changes In Real Life | Why This Phase Exists Now | Demo Walkthrough | Unlocks Next |
|-------|----------------------------|---------------------------|------------------|--------------|
| Phase 1: Backend OCR Pipeline | API endpoint nhận file, gọi Gemini OCR, trả về job ID + suggested category, file MD lưu ở R2 | Backend phải có trước — API là contract giữa FE và BE | Upload 1 PDF → nhận `{job_id, suggested_category}` → check status → completed → get MD | Phase 2: Preview UI |
| Phase 2: Preview Mode UI | User thấy danh sách file, preview MD + verify/correct category, send to KB | Preview mode (D2) + category verification (D12) | Upload file → thấy AI-suggested category → confirm → preview MD → send to KB | Phase 3: Auto mode |
| Phase 3: Auto Mode + Batch Status | Auto process: OCR → AI detect category → auto embed (không confirm) + batch status | Hoàn thiện: batch queuing (D1) + auto (D2) + auto category (D12) | Upload 3 file Auto → 3 jobs pending → complete → tự động có chunks trong KB | Done |

---

## 4. Phase Details

### Phase 1: Backend OCR Pipeline

- **What Changes In Real Life**: Backend có API endpoint `/api/ocr-quick/process` nhận file upload, trả về job ID + suggested category. OCR chạy background qua RQ. Khi xong, MD file lưu ở R2.
- **Why This Phase Exists Now**: Backend phải có trước vì API là contract cho frontend. Backend có thể test độc lập.
- **Stories Inside This Phase**:
  - Story 1: API upload endpoint — nhận file, validate type, upload source lên R2, enqueue RQ job, trả về job ID + category (manual hoặc AI-suggested)
  - Story 2: OCR service — gọi Gemini Vision API, trả về markdown text + suggested category (từ MD content analysis)
  - Story 3: RQ job handler — worker xử lý OCR job, lưu MD output lên R2, update job status
- **Demo Walkthrough**: Upload 1 file PDF → nhận `{job_id, suggested_category}` → call status endpoint → thấy `completed` → get MD URL từ R2
- **Unlocks Next**: Phase 2: Preview UI

### Phase 2: Preview Mode UI

- **What Changes In Real Life**: User thấy Quick Processing page với danh sách file đã upload, có thể preview MD content + verify/correct category, và click để đưa vào knowledge base.
- **Why This Phase Exists Now**: Preview mode (D2) là option quan trọng — user muốn kiểm duyệt trước khi embed. Category confirmation (D12) cũng cần trong preview.
- **Stories Inside This Phase**:
  - Story 1: Quick Processing page — page layout với sidebar nav, file list, upload button, category selector
  - Story 2: Upload dialog — drag-drop, file picker, processing options (preview vs auto, single vs multi MD, auto-detect vs manual category)
  - Story 3: MD preview modal — hiển thị markdown, category suggestion (có thể edit), send to knowledge base button
- **Demo Walkthrough**: User vào Quick Processing → upload file với "Auto detect category" → thấy AI-suggested category → confirm → click preview → thấy MD content → click "Send to Knowledge Base" → thành công
- **Unlocks Next**: Phase 3: Auto mode + batch status

### Phase 3: Auto Mode + Batch Status

- **What Changes In Real Life**: User chọn "Auto" + "Auto detect category" → OCR xong → tự động đưa vào embedding pipeline với AI-suggested category (không cần confirm). Status tracking cho batch jobs.
- **Why This Phase Exists Now**: Hoàn thiện feature — batch queuing (D1) + auto option (D2) + auto category detection (D12)
- **Stories Inside This Phase**:
  - Story 1: Auto processing flow — OCR xong → AI detect category → tự động call embedding pipeline → tạo knowledge chunks (không user confirm)
  - Story 2: Batch status tracking — list jobs, status per job (pending/processing/completed/failed), retry failed jobs
- **Demo Walkthrough**: Upload 3 file với "Auto" + "Auto detect category" → thấy 3 jobs trong danh sách với status → đợi all complete → tự động có chunks trong knowledge base
- **Unlocks Next**: Done

---

## 5. Phase Order Check

- [x] Phase 1 is obviously first — backend phải có trước, API là contract
- [x] Phase 2 builds on Phase 1 — preview UI gọi API để lấy job status, MD content, và category suggestion
- [x] Phase 3 builds on Phase 1 + 2 — auto mode cần API + UI đã hoạt động
- [x] No phase is just a technical bucket — mỗi phase có observable outcome

---

## 6. Approval Summary

- **Current phase to prepare next**: `Phase 1 - Backend OCR Pipeline`
- **What the user should picture after that phase**: Upload 1 PDF via API → receive job ID + suggested_category → poll status → when complete, download MD file from R2
- **What will not happen until later phases**: Preview UI (Phase 2), Auto embedding (Phase 3)

---

## Phase 1 Stories Summary

| Story | What | Why First |
|-------|------|-----------|
| Story 1: API upload endpoint | POST /api/ocr-quick/process with file upload, returns job_id + suggested_category | Contract between FE and BE — must exist first |
| Story 2: OCR service | Gemini Vision → markdown + category suggestion | Core OCR logic — needs to work before anything else |
| Story 3: RQ job handler | Background worker for OCR jobs | Enables D1 batch queuing — user can close app and return later |