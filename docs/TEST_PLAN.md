# Test Plan tổng thể - A20 App

## 1. Mục tiêu
- Đảm bảo chất lượng cho các năng lực cốt lõi:
  - Chat/RAG
  - Quản lý leads/hội thoại
  - Knowledge ingest (OCR/Crawl/Embedding)
  - Dashboard analytics
  - Auth và phân quyền

## 2. Phạm vi
- In scope:
  - Backend API và services chính.
  - Frontend admin/public workflows chính.
  - Tích hợp tối thiểu với Redis/Qdrant/PostgreSQL ở môi trường test.
- Out of scope (giai đoạn đầu):
  - Hiệu năng tải cực lớn.
  - Chaos testing đa vùng.

## 3. Chiến lược test
- Unit test:
  - Service logic, utility, guardrails.
- Integration test:
  - API + DB + cache/queue behavior.
- E2E test:
  - Hành trình người dùng quan trọng trên web.
- Regression test:
  - Bộ test bắt buộc chạy khi merge `main`.

## 4. Môi trường test
- Backend:
  - `pytest`, `pytest-asyncio`, `pytest-cov`.
- Frontend:
  - `vitest`, `@testing-library/react`.
- E2E:
  - `playwright`.
- Service phụ trợ:
  - PostgreSQL, Redis, Qdrant bằng docker/services CI.

## 5. Quality gates đề xuất
- Pull Request:
  - Lint pass.
  - Unit + integration pass.
  - Không giảm coverage dưới ngưỡng.
- Main branch:
  - Chạy full suite (unit + integration + E2E critical).
- Coverage mục tiêu giai đoạn 1:
  - Backend services: >= 70%.
  - Frontend feature logic: >= 60%.

## 6. Rủi ro và giảm thiểu
- Rủi ro phụ thuộc API ngoài:
  - Dùng mock/stub cho OpenAI/Firecrawl trong phần lớn test.
- Rủi ro flaky E2E:
  - Tối giản assertions, tránh chờ mù, cố định test data.
- Rủi ro dữ liệu test:
  - Factory/fixtures nhất quán, reset trạng thái mỗi test.

## 7. Tiêu chí hoàn thành
- Có bộ test chạy tự động trong CI.
- Có danh sách test case theo module cốt lõi.
- Có báo cáo kết quả và lỗi hồi quy theo mỗi lần merge.
