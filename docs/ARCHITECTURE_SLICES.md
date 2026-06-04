# Tài liệu kiến trúc theo lát cắt - A20 App

Mục tiêu của tài liệu này là mô tả hệ thống theo các lát cắt để dễ vẽ sơ đồ tổng quát, review và handover.

## 1. Lát cắt chức năng
- Kênh tư vấn:
  - Web chat widget (public).
  - Telegram bot.
- Kênh vận hành:
  - Admin dashboard: leads, chat, knowledge, OCR, crawler, analytics.
- Năng lực nền:
  - Xác thực/ủy quyền.
  - Truy hồi tri thức (RAG).
  - Xử lý nền (queue + worker).
  - Realtime event.

## 2. Lát cắt logic ứng dụng
- Presentation/API:
  - FastAPI routers tại `src/api/routers/*`.
- Domain services:
  - Nghiệp vụ tại `src/services/*`.
  - Pipeline chat tại `src/services/chat_pipeline/*`.
- Data access:
  - ORM model `src/models/*`, session `src/db/session.py`.
- External integrations:
  - OpenAI, Qdrant, Redis, R2, Firecrawl, Telegram tại `src/integrations/*` và service liên quan.

## 3. Lát cắt dữ liệu
- Dữ liệu giao dịch:
  - Lead, Conversation, Message, Staff, Major, Tuition, Scholarship...
  - Lưu tại PostgreSQL.
- Dữ liệu tri thức:
  - Knowledge chunks + embedding metadata.
  - Vector lưu ở Qdrant.
- Dữ liệu tệp:
  - Tệp OCR/crawl artifacts lưu ở R2.
- Dữ liệu tức thời:
  - Cache, queue, pub-sub ở Redis.

## 4. Lát cắt tích hợp
- AI/LLM:
  - OpenAI chat completions + embeddings.
- Crawl:
  - Firecrawl API.
- Messaging:
  - Telegram Bot API.
- Vector DB:
  - Qdrant.
- Object storage:
  - Cloudflare R2 (S3-compatible).

## 5. Lát cắt triển khai
- Frontend:
  - Vercel, tách mode `public` và `admin`.
- Backend:
  - Railway container (FastAPI API server).
- Worker:
  - Railway/Container chạy RQ workers.
- Phụ trợ:
  - PostgreSQL, Redis, Qdrant, R2.

## 6. Lát cắt bảo mật
- AuthN/AuthZ:
  - JWT access/refresh + role-based access.
- Boundary:
  - Tách public/admin domain và route.
- Hardening:
  - CORS allowlist, kiểm soát upload, rate limiting endpoint nhạy cảm.
- Vận hành:
  - Biến môi trường bí mật tách theo môi trường triển khai.

## 7. Lát cắt quan sát và vận hành
- Monitoring cơ bản:
  - Theo dõi log API, log worker, trạng thái queue.
- Vùng cần tăng cường:
  - SLO cho response chat.
  - Dashboard queue depth/retry/failure.
  - Tracing cho pipeline RAG và OCR.
