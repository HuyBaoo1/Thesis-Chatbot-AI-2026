# Discovery Report: OCR Quick Processing

**Date**: 2026-04-27
**Feature**: ocr-quick-processing
**CONTEXT.md reference**: `history/ocr-quick-processing/CONTEXT.md`

---

## Institutional Learnings

### Critical Patterns (Always Applied)

No prior learnings for this domain.

### Domain-Specific Learnings

No prior learnings for this domain.

---

## Agent A: Architecture Snapshot

### Relevant Packages / Modules

| Package/Module | Purpose | Key Files |
|----------------|---------|-----------|
| `src/api/routers/` | API endpoints | `knowledge_chunk.py` (file upload pattern), `chat.py` (streaming) |
| `src/services/` | Business logic | `knowledge_chunk_service.py` (upload→embed pipeline), `r2_service.py`, `embedding_service.py`, `qdrant_service.py` |
| `src/schemas/` | Request/response models | `knowledge_chunk.py` (upload response schema) |
| `src/core/config.py` | Settings/env | `Settings` class for API keys, R2 config |
| `demo/src/components/` | UI components | Layout, dialog, button, spinner |
| `demo/src/pages/` | Page components | `knowledge/KnowledgeFileUploadDialog.jsx` (upload pattern) |
| `demo/src/lib/` | Service layer | `knowledge.service.js` (API calls) |
| `demo/src/stores/` | State management | authStore, uiStore (Zustand) |
| `vite-app/src/features/` | Feature organization | knowledge-chunk folder |

### Entry Points

- **API**: `POST /api/ocr-quick/jobs` (new router) - follow `knowledge_chunk.py` pattern
- **Frontend**: New page route `/ocr-quick` with Sidebar nav entry
- **Worker**: RQ queue for background OCR processing (existing `queue_service.py` pattern)

### Key Files to Model After

- `src/api/routers/knowledge_chunk.py` — file upload endpoint with FormData, R2 storage
- `src/services/knowledge_chunk_service.py` — upload→extract→chunk→embed→qdrant pipeline
- `src/services/r2_service.py` — `upload_file_bytes()` returns `{key, url, content_type, size}`
- `demo/src/pages/knowledge/KnowledgeFileUploadDialog.jsx` — drag-drop upload UI pattern
- `demo/src/components/layout/Sidebar.jsx` — nav item with `{ name, href, icon, roles }`

---

## Agent B: Pattern Search

### Similar Existing Implementations

| Feature/Component | Location | Pattern Used | Reusable? |
|-------------------|----------|--------------|-----------|
| Knowledge chunk file upload | `src/api/routers/knowledge_chunk.py` | `UploadFile` + `Form()` + multipart | Yes - follow exactly |
| R2 file storage | `src/services/r2_service.py` | UUID key, folder prefix, public URL | Yes - follow exactly |
| Async job processing | `src/services/queue_service.py` | RQ `enqueue_call()` with timeout/TTL | Yes - follow for background OCR |
| Knowledge chunk pipeline | `src/services/knowledge_chunk_service.py` | extract→chunk→embed→qdrant | Yes - extend for OCR output |
| Upload dialog | `demo/src/pages/knowledge/KnowledgeFileUploadDialog.jsx` | drag-drop, file validation, FormData | Yes - reuse structure |
| Navigation | `demo/src/components/layout/Sidebar.jsx` | nav array with role filtering | Yes - add Quick Processing |

### Reusable Utilities

- **File upload**: `FormData` + `multipart/form-data` (already in use)
- **API service**: `axios` with auth headers (already in use)
- **UI components**: `Dialog`, `Button`, `Spinner` from `@radix-ui` and custom
- **Drag-drop zone**: `onDragEnter/Leave/Over/Drop` pattern in KnowledgeFileUploadDialog
- **State management**: Zustand stores for loading/error states
- **Redis Queue**: `get_default_queue().enqueue_call()` for background jobs

### Naming Conventions

- API routes: plural nouns, kebab-case (`/knowledge-chunks`)
- Service functions: snake_case, verb-noun (`upload_file_to_chunks`)
- Frontend components: PascalCase
- Nav items: Title Case ("Quick Processing")
- File naming: kebab-case for files, PascalCase for React components

---

## Agent C: Constraints Analysis

### Runtime & Framework

- **Python**: FastAPI 0.135.3 + Uvicorn
- **Frontend (demo)**: React 19.2.5 + Vite 8.0.10 (JSX)
- **Frontend (vite-app)**: React 19.2.4 + Vite 7.3.1 (TypeScript)
- **Redis**: 7.4.0 with RQ 2.8.0 for job queues

### Existing Dependencies (Relevant to This Feature)

| Package | Version | Purpose |
|---------|---------|---------|
| `openai` | 2.31.0 | Embeddings (NOT used for Gemini) |
| `boto3` | 1.35.0 | R2/S3 storage |
| `python-multipart` | 0.0.20 | File upload support |
| `httpx` | 0.28.1 | Async HTTP client |
| `langchain-core` | 0.3.84 | Text processing |
| `langchain-text-splitters` | 0.3.5 | Text chunking |
| `redis` | 7.4.0 | Queue backend |
| `rq` | 2.8.0 | Job queue |
| `@radix-ui/react-dialog` | 1.1.15 | UI dialogs |
| `axios` | 1.15.2 | API calls |
| `@tanstack/react-query` | 5.100.1 | Data fetching (vite-app) |

### New Dependencies Needed

| Package | Reason | Risk Level |
|---------|--------|------------|
| `google-genai` or `langchain-google-genai` | Gemini Vision API for OCR | MEDIUM - new external dependency |
| `pdf2image` or `pypdf` | PDF page extraction for multi-page | MEDIUM - file format handling |
| `react-markdown` | MD preview in frontend | LOW - standard library |
| `pymupdf` or `pdf2image` | Convert PDF pages to images for Gemini | MEDIUM - image conversion |

### Build / Quality Requirements

- Python type-check: not enforced (no mypy config visible)
- Frontend: ESLint + Prettier (demo & vite-app both have configs)
- Test: no existing test infrastructure visible
- Lint: `eslint.config.js` in both frontends

### Database / Storage

- **ORM**: SQLAlchemy 2.0.49 with Alembic migrations
- **KnowledgeChunk model**: ready to receive OCR output (reusable)
- **No new DB model needed** for Phase 1 - reuse KnowledgeChunk

---

## Agent D: External Research

### Library Documentation

| Library | Version | Key Docs |
|---------|---------|----------|
| `google-genai` | Latest | Gemini Vision API for multimodal OCR |
| `langchain-google-genai` | Latest | LangChain integration for Gemini |

### Community Patterns

- **Gemini Vision for Document OCR**: Best approach is to send images/PDF pages directly to Gemini with a prompt requesting markdown output
- **PDF to Image**: Use `pdf2image` or `PyMuPDF` to convert PDF pages to images before sending to Gemini

### Known Gotchas / Anti-Patterns

- **Gotcha**: Gemini API has rate limits and file size limits
  - Why it matters: Large PDFs need chunking/serialization
  - How to avoid: Process pages sequentially, use background queue

- **Gotcha**: `text_processing_service.py` currently only supports `.md` files for `extract_text()`
  - Why it matters: Cannot reuse for image-based OCR
  - How to avoid: New OCR-specific service with Gemini calls

- **Anti-pattern**: Processing files synchronously in API endpoint
  - Common mistake: Long OCR processing blocks API response
  - Correct approach: Background RQ job, return job ID immediately

---

## Open Questions

- [ ] **PDF to image conversion**: Which library to use for converting PDF pages to images? `pdf2image` vs `PyMuPDF` vs `pypdf`?
- [ ] **Gemini API SDK**: Use raw `google-genai` or `langchain-google-genai`? Both support vision.
- [ ] **OCR result storage**: Store MD content in KnowledgeChunk directly or create separate OcrDocument model?

---

## Summary for Synthesis (Phase 2 Input)

**What we have**: FastAPI backend with R2 storage, Redis Queue for background jobs, existing knowledge chunk pipeline (upload→extract→chunk→embed→qdrant), dual React frontends (demo JSX, vite-app TypeScript).

**What we need**: OCR pipeline that accepts image/PDF files, calls Gemini Vision API, outputs Markdown, optionally stores in knowledge base.

**Key constraints from research**:
- No existing Gemini integration - need to add `google-genai` SDK
- `text_processing_service.py` only handles `.md` files - need new OCR service
- RQ queue already available for background job processing
- Upload dialog pattern exists in demo frontend

**Institutional warnings to honor**:
- OCR processing must be async (RQ) to avoid blocking API
- R2 file must be uploaded before DB commit; deleted on failure
- `needs_embedding` flag pattern for embedding failure retry