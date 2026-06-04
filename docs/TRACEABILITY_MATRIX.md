# Traceability Matrix: Kiến trúc -> Thiết kế -> Source code -> Test

## 1. Chatbot RAG
- Kiến trúc:
  - `docs/ARCHITECTURE_DECISIONS.md` (ADR-003)
  - `docs/ARCHITECTURE_SLICES.md` (lát cắt chức năng, logic)
  - `docs/RAG_PIPELINE_ARCHITECTURE.md` (kiến trúc chi tiết pipeline)
- Thiết kế:
  - `docs/BASIC_DESIGN.md` (luồng chat)
- Source code:
  - `src/api/routers/chat.py`
  - `src/services/chat_pipeline/pipeline.py`
  - `src/services/chat_pipeline/retrieval_orchestrator.py`
  - `src/services/chat_pipeline/synthesis.py`
- Test:
  - `docs/TEST_CASES.md`: TC-CHAT-01..05

## 2. Leads và hội thoại
- Kiến trúc:
  - `docs/ARCHITECTURE_SLICES.md` (chức năng vận hành)
- Thiết kế:
  - `docs/BASIC_DESIGN.md` (module backend)
- Source code:
  - `src/api/routers/lead.py`
  - `src/services/lead_service.py`
  - `src/services/conversation_service.py`
  - `src/services/message_service.py`
- Test:
  - `docs/TEST_CASES.md`: TC-LEAD-01..04

## 3. Knowledge base và embeddings
- Kiến trúc:
  - `docs/ARCHITECTURE_DECISIONS.md` (ADR-003, ADR-005)
- Thiết kế:
  - `docs/BASIC_DESIGN.md` (knowledge ingest)
- Source code:
  - `src/api/routers/knowledge_chunk.py`
  - `src/services/knowledge_chunk_service.py`
  - `src/services/embedding_service.py`
  - `src/services/qdrant_service.py`
- Test:
  - `docs/TEST_CASES.md`: TC-KB-01..04

## 4. OCR và crawl
- Kiến trúc:
  - `docs/ARCHITECTURE_DECISIONS.md` (ADR-004)
  - `docs/ARCHITECTURE_SLICES.md` (tích hợp)
- Thiết kế:
  - `docs/BASIC_DESIGN.md` (luồng OCR/ingest)
- Source code:
  - `src/api/routers/ocr_quick.py`
  - `src/api/routers/crawl.py`
  - `src/services/ocr_service.py`
  - `src/services/ocr_smart_extractor.py`
  - `src/services/crawl_service.py`
  - `src/services/firecrawl_service.py`
- Test:
  - `docs/TEST_CASES.md`: TC-OCR-01..03, TC-CRAWL-01..02

## 5. Realtime và thông báo
- Kiến trúc:
  - `docs/ARCHITECTURE_DECISIONS.md` (ADR-006)
- Thiết kế:
  - `docs/BASIC_DESIGN.md` (luồng realtime)
- Source code:
  - `src/api/routers/realtime.py`
  - `src/services/realtime.py`
  - `src/api/routers/notification.py`
  - `src/services/notification_service.py`
  - `vite-app/src/lib/realtime.ts`
  - `vite-app/src/hooks/use-realtime.tsx`
- Test:
  - `docs/TEST_CASES.md`: TC-CHAT-05, TC-E2E-04

## 6. Frontend public/admin
- Kiến trúc:
  - `docs/ARCHITECTURE_DECISIONS.md` (ADR-001)
- Thiết kế:
  - `docs/BASIC_DESIGN.md` (module frontend)
- Source code:
  - `vite-app/src/app/router.public.tsx`
  - `vite-app/src/app/router.admin.tsx`
  - `vite-app/src/features/home/home-page.tsx`
  - `vite-app/src/features/dashboard/dashboard-page.tsx`
- Test:
  - `docs/TEST_CASES.md`: TC-E2E-01..03

## 7. Triển khai và vận hành
- Kiến trúc:
  - `docs/ARCHITECTURE_DECISIONS.md` (ADR-007)
  - `docs/ARCHITECTURE_SLICES.md` (triển khai)
- Thiết kế:
  - `docs/TECHSTACK_STANDARD.md`
- Source code/cấu hình:
  - `Dockerfile`
  - `Dockerfile.worker`
  - `docker-compose.yml`
- Test:
  - `docs/TEST_PLAN.md` (quality gates CI)
