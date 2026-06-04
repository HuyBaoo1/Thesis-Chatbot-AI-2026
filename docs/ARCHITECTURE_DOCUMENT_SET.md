# Bộ tài liệu kiến trúc đầy đủ - A20 App

Tài liệu này là điểm vào chính cho toàn bộ bộ hồ sơ kiến trúc và kiểm thử.

## 1. Quyết định kiến trúc
- `docs/ARCHITECTURE_DECISIONS.md`

## 2. Tài liệu kiến trúc theo lát cắt
- `docs/ARCHITECTURE_SLICES.md`
- `docs/ARCHITECTURE_DIAGRAMS.md` (sơ đồ trực quan Mermaid)
- `docs/RAG_PIPELINE_ARCHITECTURE.md` (kiến trúc chi tiết RAG pipeline)
- Bổ trợ chi tiết:
  - `docs/SYSTEM_DESIGN_OVERVIEW.md`
  - `docs/SYSTEM_DESIGN_BACKEND.md`
  - `docs/SYSTEM_DESIGN_FRONTEND.md`
  - `docs/SYSTEM_DESIGN_INTEGRATIONS.md`
  - `docs/SYSTEM_DESIGN_DEPLOYMENT.md`

## 3. Tech stack
- `docs/TECHSTACK_STANDARD.md`

## 4. Basic design
- `docs/BASIC_DESIGN.md`

## 5. Kiểm thử
- Test plan: `docs/TEST_PLAN.md`
- Test cases: `docs/TEST_CASES.md`

## 6. Traceability với source code
- `docs/TRACEABILITY_MATRIX.md`

## 7. Tài liệu phụ trợ lưu trữ
- `docs/archive/README.md`

## 8. Khuyến nghị sử dụng
- Khi thay đổi kiến trúc lớn:
  - Cập nhật ADR trước.
  - Cập nhật lát cắt và basic design ngay sau đó.
- Khi thêm tính năng:
  - Bổ sung traceability và test cases tương ứng.
