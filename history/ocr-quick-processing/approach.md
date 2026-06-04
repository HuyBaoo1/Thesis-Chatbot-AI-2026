# Approach: OCR Quick Processing

**Date**: 2026-04-27
**Feature**: ocr-quick-processing
**Based on**:
- `history/ocr-quick-processing/discovery.md`
- `history/ocr-quick-processing/CONTEXT.md`

---

## 1. Gap Analysis

> What exists vs. what the feature requires.

| Component | Have | Need | Gap Size |
|-----------|------|------|----------|
| Gemini API | None | `google-genai` SDK + GEMINI_API_KEY | New — external dep |
| OCR Service | None | `ocr_service.py` with Gemini Vision calls | New — novel service |
| PDF→Image conversion | None | Library to convert PDF pages to images | New — external dep |
| OCR API router | None | `/api/ocr-quick/` endpoints | New — follows existing pattern |
| Quick Processing UI (demo) | None | React page + upload dialog + MD preview | New — follow upload pattern |
| Quick Processing UI (vite-app) | None | TypeScript page + components | New — follow vite-app pattern |
| RQ job handler | `queue_service.py` pattern | OCR job handler in RQ | New — follow existing job pattern |
| MD preview component | None | Markdown render in React | New — low risk |

---

## 2. Recommended Approach

The OCR Quick Processing feature will be implemented in 3 phases:

**Phase 1 (Foundation):** Backend OCR pipeline — accepts file uploads, converts to images if PDF, calls Gemini Vision API, outputs Markdown to R2 storage.

**Phase 2 (Preview Mode):** MD preview and edit UI — user can review/edit the extracted Markdown before sending to embedding pipeline.

**Phase 3 (Auto Mode + Integration):** Full auto-embedding flow for when user selects "Auto process", plus batch job status tracking.

### Why This Approach

- **Backend-first**: The OCR logic is independent of UI. Building it first means the API is ready for manual testing before frontend work begins.
- **Follows existing patterns**: Upload endpoint follows `knowledge_chunk.py` router pattern. RQ job follows `jobs.py` pattern. Service structure follows `knowledge_chunk_service.py`.
- **Honors locked decisions**: D1 (batch queuing), D2 (user choice per upload), D3 (multi-page output), D6 (Gemini API), D7 (R2 storage), D10 (reuses embedding pipeline).

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| OCR SDK | `google-genai` | Most direct Gemini API access, no LangChain overhead for simple OCR |
| PDF conversion | `pymupdf` (PyMuPDF) | Single library for PDF reading + page-to-image conversion |
| Job queue | RQ (Redis Queue) | Already in requirements.txt, pattern exists in chat_pipeline/jobs.py |
| File storage | R2 (same as existing) | Consistent with D7, reuses `r2_service.py` |
| OCR output storage | R2 as MD files | Reuses `upload_file_bytes()` with folder `ocr-output/` |
| Embedding pipeline | `knowledge_chunk_service.py` | Reuses D10, creates KnowledgeChunk records |
| Category detection | AI detect + User confirm | D12: Gemini analyze MD → suggest category, user confirm in preview |
| UI Framework | React (both demo & vite-app) | Existing pattern, just new pages/components |

---

## 3. Alternatives Considered

### Option A: LangChain + Gemini via `langchain-google-genai`

- Description: Use LangChain document loaders and Gemini integration
- Why considered: Might reuse existing LangChain infrastructure
- Why rejected: Overkill for simple OCR. `google-genai` SDK is more straightforward for image→text with markdown output. LangChain adds unnecessary complexity.

### Option B: Tesseract OCR (local, free)

- Description: Use Tesseract via `pytesseract` for local OCR
- Why considered: No API costs, runs offline
- Why rejected: Gemini API was explicitly required by user (D6). Tesseract accuracy is lower, especially for complex documents.

### Option C: Single endpoint with sync processing

- Description: Process files synchronously in the API endpoint, return result directly
- Why considered: Simpler code path, no job queue complexity
- Why rejected: Violates D1 (batch queuing, background processing). Large PDFs could timeout or block the API server. User wants to close app and return later.

---

## 4. Risk Map

| Component | Risk Level | Reason | Verification Needed |
|-----------|------------|--------|---------------------|
| Gemini API integration | **MEDIUM** | New external API, no existing pattern in codebase | Spike: test Gemini Vision call with sample PDF |
| PDF→image conversion | **MEDIUM** | New dependency, may have edge cases with scanned PDFs | Spike: test multi-page PDF with mixed content |
| RQ background job setup | **LOW** | Pattern exists in `chat_pipeline/jobs.py` | Proceed |
| MD storage in R2 | **LOW** | Same pattern as `r2_service.py` | Proceed |
| Frontend upload dialog | **LOW** | Pattern exists in `KnowledgeFileUploadDialog.jsx` | Proceed |
| MD preview component | **LOW** | Standard markdown rendering | Proceed |

### HIGH-Risk Summary (for khuym:validating skill)

No HIGH-risk components identified. All medium-risk items have existing patterns to follow.

---

## 5. Proposed File Structure

```
src/
  services/
    ocr_service.py              # NEW: Core OCR logic with Gemini Vision
    ocr_job_service.py         # NEW: RQ job handler for background OCR
  api/
    routers/
      ocr_quick.py             # NEW: API router for OCR endpoints
  schemas/
    ocr.py                     # NEW: Request/response schemas

demo/src/
  pages/
    ocr-quick/
      QuickProcessingPage.jsx  # NEW: Main page component
  components/
    ocr/
      OcrUploadDialog.jsx      # NEW: Upload dialog with drag-drop
      OcrFileCard.jsx          # NEW: File card with status/size/type
      OcrPreviewModal.jsx      # NEW: MD preview/edit modal
      OcrStatusBadge.jsx       # NEW: Processing status badge
  lib/
    ocr.service.js             # NEW: API service for OCR endpoints
  features/ (or pages/)
    quick-processing/          # NEW: Quick Processing feature folder

vite-app/src/
  features/
    quick-processing/
      QuickProcessingPage.tsx # NEW: Main page (TypeScript)
      components/              # NEW: OcrUploadDialog, OcrFileCard, OcrPreviewModal, OcrStatusBadge (all .tsx)
      lib/
        ocr.service.ts        # NEW: API service

.env                          # ADD: GEMINI_API_KEY
requirements.txt              # ADD: google-genai, pymupdf
```

---

## 6. Dependency Order

```
Layer 1 (parallel): Config (add GEMINI_API_KEY), Schema (define OCR schemas)
Layer 2 (sequential): OCR Service (uses schemas, config, R2)
Layer 3 (sequential): OCR Job Service (uses OCR service, queue_service)
Layer 4 (sequential): API Router (uses OCR service, schemas)
Layer 5 (parallel): Frontend (demo + vite-app) — after API is working
```

### Parallelizable Groups

- Group A: `src/core/config.py` update (add GEMINI_API_KEY) + `src/schemas/ocr.py` creation — no dependencies
- Group B: `src/services/ocr_service.py` — depends on Group A completing
- Group C: `src/services/ocr_job_service.py` + `src/api/routers/ocr_quick.py` — depends on Group B
- Group D (parallel): Demo frontend + Vite-app frontend — depends on Group C completing

---

## 7. Institutional Learnings Applied

No prior institutional learnings relevant to this feature (no existing OCR or document processing learnings in history/learnings/).

---

## 8. Open Questions for Validating

- [x] **Gemini model name**: `gemini-1.5-flash` — balance speed and accuracy for OCR
- [x] **Preview mode flow**: User edits MD in preview modal → save back to R2 → trigger embedding on "Send to KB" click
- [x] **PDF page limit**: 50 pages max per job (Gemini context window limit)
- [x] **Job state machine**: `queued → processing → completed | failed`
- [x] **Idempotency**: Support `X-Idempotency-Key` header
- [x] **Download MD**: Endpoint `/jobs/{job_id}/download` returns R2 public URL
- [x] **Suggested category shape**: Always in status response — `{category_id, confidence, reason, needs_review}`
- [x] **Edge cases**: scanned PDF → timeout tracked; invalid file → `failed`; empty OCR → `completed` with notice