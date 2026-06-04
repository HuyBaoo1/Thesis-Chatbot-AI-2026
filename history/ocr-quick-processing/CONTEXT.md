# OCR Quick Processing — Context

**Feature slug:** ocr-quick-processing
**Date:** 2026-04-27
**Exploring session:** complete
**Scope:** Standard

---

## Feature Boundary

OCR service integrated into the chatbot admissions system. Delivers: Quick Processing menu in frontend, OCR API endpoint (Gemini-powered), MD file preview/edit, auto-embedding pipeline integration, R2 storage for uploaded files.

**Domain type(s):** SEE | CALL | RUN

---

## Locked Decisions

These are fixed. Planning must implement them exactly. No creative reinterpretation.

### Multi-file Handling
- **D1** Batch queuing — All uploaded files are queued and processed in background. User can close the app and return later to check results. No parallel processing, no sequential blocking.

### Processing Flow Options
- **D2** User choice per upload — Each upload session, user selects either "Preview before processing" (kiểm duyệt) or "Auto process" before uploading. Not a global setting.
  *Rationale: User wants flexibility depending on trust level of source documents*

### Multi-page PDF Output
- **D3** User choice per upload — Options: "Single combined MD file" or "One MD per page". Not a global default.
  *Rationale: User may want fine-grained chunks for better retrieval*

### Navigation Placement
- **D5** Quick Processing at same level as main nav — Menu item "Quick Processing" placed in sidebar navigation at same hierarchical level as Dashboard, Leads, Analytics. Not in Settings, not at bottom.

### Technology Stack
- **D6** OCR Engine = Google Gemini API — Use existing Gemini API key from config (same key used for chat). Gemini's vision capabilities for document OCR.
  *Rationale: User specified Gemini, existing infrastructure*

### File Storage
- **D7** R2 Storage for source files — Uploaded files (PDF, images) stored in R2 bucket. MD output files also stored in R2.
  *Rationale: Existing R2 infrastructure in project*

### Supported File Types
- **D8** All OCR-ready formats: PDF (single and multi-page), images (PNG, JPG, JPEG, WEBP, TIFF)
  *Rationale: User specified "mọi loại file có thể OCR"*

### Language Support
- **D9** Multilingual OCR — Gemini vision supports multiple languages. No language restriction enforced.
  *Rationale: User specified "đa ngôn ngữ"*

### Embedding Pipeline
- **D10** Leverage existing knowledge_chunk_service — OCR output (MD content) flows into the same embedding pipeline as regular knowledge chunks. Uses `create_knowledge_chunk()` or `upload_file_to_chunks()`.
  *Rationale: BE already has embedding + vector DB integration*

### Category Assignment
- **D12** AI detect + User confirmation — User có 2 lựa chọn khi upload:
  1. **Auto detect** — AI (Gemini) analyze MD content và suggest category → user confirm/correct trong preview
  2. **Manual** — User chọn category trước, không cần AI suggestion
  *Rationale: User muốn AI help nhưng vẫn có control*

### Frontend Targets
- **D11** Build for both vite-app AND demo — Quick Processing UI implemented in both frontend codebases (vite-app/src and demo/src).

---

### Agent's Discretion
- Upload UI layout and component structure — delegated to planning (user didn't specify exact UI layout)
- MD preview/edit UI design — delegated to planning
- API endpoint structure and naming — delegated to planning
- Processing status UI (progress tracking, completion notification) — delegated to planning

---

## Specific Ideas & References

- User mentioned existing BE has: `knowledge_chunk_service.py`, `r2_service.py`, `embedding_service`, `qdrant_service` — these are the integration points
- User mentioned existing `text_processing_service.py` chunks text for embedding — should be reused
- Demo frontend uses React + lucide-react icons, same pattern should be followed for Quick Processing
- vite-app frontend — check existing UI patterns before implementation

---

## Existing Code Context

From the quick codebase scout during exploring.

### Reusable Assets
- `src/services/r2_service.py` — `upload_file_bytes()`, `delete_file()` — use for storing uploaded files and MD outputs
- `src/services/knowledge_chunk_service.py` — `upload_file_to_chunks()`, `create_knowledge_chunk()` — use for embedding pipeline
- `src/services/text_processing_service.py` — `chunk_text()`, `extract_text()` — text processing for MD content
- `demo/src/components/layout/Sidebar.jsx` — navigation structure, add Quick Processing here

### Existing Patterns
- API router pattern in `src/api/routers/` — new OCR router follows same structure
- Feature-based folder organization in `demo/src/features/` and `vite-app/src/features/`
- Protected route pattern in `demo/src/App.jsx`

### Integration Points
- `src/core/config.py` — check GEMINI_API_KEY configuration
- `src/services/embedding_service.py` — check `generate_embedding()` for vector creation
- `src/services/qdrant_service.py` — check vector upsert for Qdrant integration

---

## Outstanding Questions

### Resolve Before Planning
None — all gray areas resolved during exploring.

### Deferred to Planning
- Exact API endpoint structure (single vs multiple endpoints for different operations)
- Frontend component structure and state management approach
- Error handling strategy for failed OCR jobs
- How preview/edit mode works in practice (inline vs modal)

---

## Deferred Ideas

- OCR history/audit log — track what was processed, when, by whom (future work)
- Bulk re-processing of failed OCR jobs (future work)
- OCR quality scoring — flag low-confidence transcriptions (future work)

---

## Handoff Note

CONTEXT.md is the single source of truth for this feature.

- **planning** reads: locked decisions, code context, canonical refs, deferred-to-planning questions
- **validating** reads: locked decisions (to verify plan-checker coverage)
- **reviewing** reads: locked decisions (for UAT verification)

Decision IDs (D1, D2..., D11) are stable. Reference them by ID in all downstream artifacts.