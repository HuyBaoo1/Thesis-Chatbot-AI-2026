# Quyết định kiến trúc (ADR rút gọn) - A20 App

Tài liệu này ghi lại các quyết định kiến trúc quan trọng, lý do chọn, đánh đổi và tác động triển khai.

## ADR-001: Tách Public App và Admin App bằng 2 router/build mode
- Trạng thái: Đã áp dụng
- Quyết định:
  - Dùng `VITE_APP_MODE=public|admin` để tách luồng truy cập công khai và nội bộ.
  - Public domain chỉ phục vụ trải nghiệm tư vấn; Admin domain phục vụ vận hành.
- Lý do:
  - Giảm bề mặt lộ route quản trị.
  - Tách UX theo vai trò, dễ tối ưu bảo mật và nội dung.
- Đánh đổi:
  - Tăng chi phí build/release do có 2 chế độ.
- Tác động mã nguồn:
  - `vite-app/src/app/router.public.tsx`
  - `vite-app/src/app/router.admin.tsx`
  - `vite-app/src/app/router.tsx`

## ADR-002: Backend FastAPI theo kiến trúc Router -> Service -> Integration
- Trạng thái: Đã áp dụng
- Quyết định:
  - Router xử lý giao diện API, Service chứa nghiệp vụ, Integration xử lý kết nối dịch vụ ngoài.
- Lý do:
  - Dễ test, dễ thay thế provider, giảm phụ thuộc chéo.
- Đánh đổi:
  - Số lượng file nhiều hơn, cần quy ước tổ chức rõ.
- Tác động mã nguồn:
  - `src/api/routers/*`
  - `src/services/*`
  - `src/integrations/*`

## ADR-003: Dùng RAG Hybrid Retrieval cho chatbot tư vấn
- Trạng thái: Đã áp dụng
- Quyết định:
  - Kết hợp semantic retrieval (Qdrant embeddings) với keyword/BM25.
- Lý do:
  - Cân bằng độ phủ ngữ nghĩa và độ chính xác từ khóa.
- Đánh đổi:
  - Pipeline phức tạp hơn, tăng nhu cầu quan sát chất lượng truy hồi.
- Tác động mã nguồn:
  - `src/services/chat_pipeline/*`
  - `src/services/qdrant_service.py`
  - `src/services/knowledge_chunk_service.py`

## ADR-004: Tác vụ nặng chạy bất đồng bộ qua Redis + RQ Worker
- Trạng thái: Đã áp dụng
- Quyết định:
  - OCR, tạo embedding, một số xử lý nền được đưa vào queue.
- Lý do:
  - Tránh block request đồng bộ, cải thiện thời gian phản hồi API.
- Đánh đổi:
  - Tăng độ phức tạp vận hành (retry, theo dõi job, idempotency).
- Tác động mã nguồn:
  - `src/services/queue_service.py`
  - `src/services/ocr_service.py`
  - `src/services/embedding_service.py`
  - `rq_tasks.py`

## ADR-005: Tách lớp lưu trữ dữ liệu theo mục đích
- Trạng thái: Đã áp dụng
- Quyết định:
  - PostgreSQL cho dữ liệu nghiệp vụ.
  - Redis cho cache/queue/pub-sub.
  - Qdrant cho vector search.
  - Cloudflare R2 cho file/object.
- Lý do:
  - Mỗi thành phần tối ưu cho một loại workload.
- Đánh đổi:
  - Cần đồng bộ metadata giữa nhiều hệ lưu trữ.
- Tác động mã nguồn:
  - `src/models/*`, `src/db/*`
  - `src/integrations/redis_client.py`
  - `src/integrations/qdrant_client.py`
  - `src/integrations/r2_client.py`

## ADR-006: Realtime ưu tiên SSE, có WebSocket cho nhu cầu mở rộng
- Trạng thái: Đã áp dụng
- Quyết định:
  - Dashboard realtime qua SSE; một số luồng dùng WebSocket.
- Lý do:
  - SSE đơn giản, phù hợp luồng server -> client.
- Đánh đổi:
  - Hai cơ chế realtime cần quy ước rõ phạm vi.
- Tác động mã nguồn:
  - `src/api/routers/realtime.py`
  - `src/services/realtime.py`
  - `vite-app/src/lib/realtime.ts`
  - `vite-app/src/hooks/use-realtime.tsx`

## ADR-007: Triển khai tách vai trò nền tảng
- Trạng thái: Đã áp dụng
- Quyết định:
  - Frontend trên Vercel.
  - Backend và Worker container hóa trên Railway.
- Lý do:
  - Tối ưu tốc độ release frontend và vận hành backend riêng.
- Đánh đổi:
  - Cần chuẩn hóa biến môi trường đa nền tảng.
- Tác động mã nguồn:
  - `Dockerfile`, `Dockerfile.worker`, `docker-compose.yml`
  - `docs/SYSTEM_DESIGN_DEPLOYMENT.md`
