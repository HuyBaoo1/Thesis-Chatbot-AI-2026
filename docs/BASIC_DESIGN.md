# Basic Design (Thiết kế cơ bản) - A20 App

Tài liệu này mô tả thiết kế ở mức module/contract để nối từ kiến trúc sang code/test.

## 1. Thiết kế module backend
## 1.1 API layer
- Vị trí: `src/api/routers/*`
- Trách nhiệm:
  - Nhận request, validate schema, gọi service, trả response.
- Module chính:
  - `auth.py`, `chat.py`, `lead.py`, `knowledge_chunk.py`, `ocr_quick.py`, `crawl.py`, `telegram.py`, `admin_analytics.py`, `realtime.py`, `staff.py`, `major.py`, `tuition_policy.py`, `scholarship_policy.py`.

## 1.2 Service layer
- Vị trí: `src/services/*`
- Trách nhiệm:
  - Chứa nghiệp vụ domain, tách khỏi router.
  - Điều phối integrations.
- Cụm quan trọng:
  - Chat pipeline: `src/services/chat_pipeline/*`
  - Lead/conversation/message: `lead_service.py`, `conversation_service.py`, `message_service.py`
  - Knowledge/OCR/Crawl: `knowledge_chunk_service.py`, `ocr_service.py`, `crawl_service.py`

## 1.3 Integration layer
- Vị trí: `src/integrations/*`
- Trách nhiệm:
  - Đóng gói kết nối đến OpenAI, Redis, Qdrant, R2, parser ngoài.

## 2. Thiết kế module frontend
## 2.1 Cấu trúc
- API clients: `vite-app/src/api/*`
- Feature pages: `vite-app/src/features/*`
- Shared UI: `vite-app/src/components/*`
- State/hooks: `vite-app/src/hooks/*`, `vite-app/src/stores/*`
- Router:
  - `vite-app/src/app/router.public.tsx`
  - `vite-app/src/app/router.admin.tsx`

## 2.2 Trách nhiệm
- API layer frontend:
  - Đồng nhất gọi backend, xử lý auth token, lỗi chuẩn.
- Feature modules:
  - Giao diện + logic trang theo domain.
- State:
  - Server state: TanStack Query.
  - Global state: Zustand.

## 3. Luồng chính ở mức basic design
## 3.1 Luồng chat
1. Client gửi query đến router chat.
2. Chat service gọi pipeline retrieval + synthesis.
3. Pipeline lấy context từ Qdrant/DB.
4. Gọi OpenAI để sinh câu trả lời.
5. Lưu hội thoại và trả response.

## 3.2 Luồng OCR/ingest
1. Admin upload tệp hoặc yêu cầu crawl.
2. Job đưa vào queue Redis.
3. Worker xử lý OCR/chunk/embed.
4. Lưu metadata DB + vector Qdrant + file R2.

## 3.3 Luồng realtime
1. Backend phát sự kiện qua Redis pub-sub.
2. API realtime stream về client qua SSE/WebSocket.

## 4. Contract mức cơ bản cần thống nhất
- API contract:
  - Quy ước HTTP code, format lỗi, pagination.
- Event contract:
  - Tên channel Redis, payload schema, version hóa sự kiện.
- Queue contract:
  - Tên queue, payload tối thiểu, retry policy, dead-letter strategy.

## 5. Nợ thiết kế cần cải thiện
- Chuẩn hóa tài liệu event schema.
- Chuẩn hóa idempotency cho job OCR/embedding.
- Bổ sung sơ đồ sequence cho 3 luồng chính.
