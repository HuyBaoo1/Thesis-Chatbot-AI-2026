# Test Cases cốt lõi - A20 App

Tài liệu này liệt kê test case ưu tiên cao để triển khai theo `docs/TEST_PLAN.md`.

## 1. Auth và phân quyền
- TC-AUTH-01: Đăng nhập thành công trả về access/refresh token.
- TC-AUTH-02: Sai mật khẩu trả về lỗi xác thực đúng chuẩn.
- TC-AUTH-03: Endpoint bảo vệ từ chối request thiếu token.
- TC-AUTH-04: Staff role không truy cập endpoint chỉ dành cho admin.

## 2. Chat/RAG
- TC-CHAT-01: Tạo hội thoại mới với lead hợp lệ.
- TC-CHAT-02: Chat query trả về câu trả lời có nội dung hợp lệ.
- TC-CHAT-03: Query ngoài phạm vi tri thức trả về fallback an toàn.
- TC-CHAT-04: Ghi nhận message user/assistant vào DB.
- TC-CHAT-05: Realtime event được phát cho conversation tương ứng.

## 3. Lead management
- TC-LEAD-01: Tạo lead mới với dữ liệu tối thiểu.
- TC-LEAD-02: Cập nhật trạng thái lead theo workflow hợp lệ.
- TC-LEAD-03: Không cho phép dữ liệu email/phone sai định dạng.
- TC-LEAD-04: Lọc danh sách leads theo trạng thái và thời gian.

## 4. Knowledge chunk và embeddings
- TC-KB-01: Tạo knowledge chunk thành công.
- TC-KB-02: Trigger tạo embedding và lưu vector id.
- TC-KB-03: Rebuild embeddings cho chunk thiếu vector.
- TC-KB-04: Xóa chunk đồng thời xóa dữ liệu liên quan trong vector store (theo policy).

## 5. OCR/Crawl pipeline
- TC-OCR-01: Upload tài liệu hợp lệ tạo OCR job thành công.
- TC-OCR-02: Job OCR hoàn tất, trả structured output.
- TC-OCR-03: File lỗi/không hỗ trợ định dạng trả lỗi rõ ràng.
- TC-CRAWL-01: Tạo crawl session và lưu page jobs.
- TC-CRAWL-02: Nội dung crawl được chunk hóa và lưu tri thức.

## 6. Dashboard analytics
- TC-ANL-01: API dashboard summary trả đủ trường bắt buộc.
- TC-ANL-02: Conversion funnel tính đúng theo date range.
- TC-ANL-03: Hot questions hiển thị đúng top N.

## 7. Frontend E2E critical path
- TC-E2E-01: Public user mở widget, gửi câu hỏi, nhận phản hồi.
- TC-E2E-02: Admin đăng nhập, xem dashboard, mở trang leads.
- TC-E2E-03: Admin upload tài liệu OCR và thấy job xuất hiện.
- TC-E2E-04: Admin theo dõi hội thoại realtime trên trang chat.

## 8. Phi chức năng (ưu tiên sau)
- TC-NFR-01: Endpoint chat đáp ứng trong ngưỡng latency mục tiêu (p95).
- TC-NFR-02: Queue backlog không vượt ngưỡng cảnh báo trong tải chuẩn.
- TC-NFR-03: Retry job không tạo dữ liệu trùng (idempotency).
