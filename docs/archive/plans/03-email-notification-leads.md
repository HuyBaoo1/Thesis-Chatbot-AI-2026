# Plan: Email Notification cho Lead (Auto Follow-up)

## Mục tiêu
Tự động gửi email follow-up cho lead HOT/WARM sau khi họ chat với bot, nhằm tăng conversion và giữ liên lạc. Hiện tại notification system chỉ gửi realtime WebSocket, chưa có email.

## Hiện trạng
- **Notification model** (`src/models/notification.py`): Đã có `NotificationStatus` enum (`PENDING`, `SENT`, `FAILED`) và field `sent_at` nhưng chưa được dùng
- **Notification service** (`src/services/notification_service.py`): Tạo notification với `PENDING`, broadcast qua Redis Pub/Sub
- **Lead model** (`src/models/lead.py`): Có `email`, `full_name`, `temperature`, `status`
- **Chưa có**: SMTP config, email template, email queue worker, email sending service
- **Background jobs**: Đã có RQ worker (`rq_tasks.py`, `worker/start.py`)

## Thiết kế

### Flow
```
Lead đạt HOT → create_hot_lead_notification() 
    → notification.status = PENDING
    → RQ worker pick up PENDING notifications  
    → gửi email qua SMTP (Resend hoặc Gmail SMTP)
    → update status = SENT (hoặc FAILED)
    → ghi sent_at
```

### Email provider
**Khuyến nghị**: [Resend](https://resend.com) — 100 emails/day free, API đơn giản, React email template support. Fallback: Gmail SMTP.

### Email templates
1. **Welcome follow-up** — Gửi 1h sau khi lead chat lần đầu, cảm ơn + link tài liệu
2. **Hot lead alert to staff** — Thông báo cho counselor khi có lead HOT
3. **Re-engagement** — Gửi sau 3 ngày nếu lead chưa quay lại
4. **Application deadline reminder** — Nhắc deadline nộp hồ sơ

## Các bước thực hiện

### Phase 1: Cài đặt email provider

**File**: `.env.example` (thêm)
```bash
EMAIL_PROVIDER=resend|smtp
RESEND_API_KEY=re_xxx
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@vinuni.edu.vn
SMTP_PASSWORD=xxx
FROM_EMAIL=VinUni Admissions <admissions@vinuni.edu.vn>
FROM_NAME=VinUni Admissions
```

**File mới**: `src/services/email_service.py`
- `send_email(to_email, subject, html_body)` — wrapper qua Resend API hoặc SMTP
- `send_lead_follow_up(lead)` — gửi email follow-up cho lead
- `send_hot_lead_alert(lead)` — gửi alert cho staff assigned
- Retry logic: 3 lần, exponential backoff

**File**: `src/core/config.py`
- Thêm `EmailSettings` class với các field trên

### Phase 2: Email templates

**File mới**: `src/services/email_templates.py`
- `welcome_email(lead_name, conversation_summary)` → HTML string
- `hot_lead_alert(lead_name, lead_score, conversation_link)` → HTML string
- `reengagement_email(lead_name, program_highlights)` → HTML string
- `deadline_reminder(lead_name, major, deadline_date)` → HTML string

Template style: đơn giản, responsive, VinUni brand colors (#d6ae4e gold, #0f172a slate).

### Phase 3: Background email worker

**File mới**: `src/services/email_worker.py`
- RQ job: `send_pending_email_notifications()`
- Query notifications với `status == PENDING` và `target == USER`
- Loop qua, gọi `email_service.send_lead_follow_up()`, update status
- Chạy định kỳ mỗi 5 phút

**File**: `src/services/scheduler.py` (edit)
- Thêm scheduler job cho email worker (dùng APScheduler hoặc RQ scheduler)

### Phase 4: Trigger email từ chat pipeline

**File**: `src/services/chat_pipeline/jobs.py` (edit)
- Khi lead đạt temperature HOT → enqueue email notification job
- Khi conversation kết thúc với lead mới → enqueue welcome email sau 1h

**File**: `src/services/notification_service.py` (edit)
- `create_notification()` → tự động enqueue RQ job nếu `target == USER`

### Phase 5: Admin UI để quản lý email

**File**: `vite-app/src/features/notification/` (có thể thêm tab)
- Xem danh sách email đã gửi / failed
- Retry failed emails
- Cấu hình template (subject, body)

## Files cần tạo/sửa

| File | Action | Mô tả |
|------|--------|-------|
| `src/services/email_service.py` | New | Gửi email qua Resend/SMTP |
| `src/services/email_templates.py` | New | HTML email templates |
| `src/services/email_worker.py` | New | RQ worker xử lý email queue |
| `src/core/config.py` | Edit | Thêm EmailSettings |
| `.env.example` | Edit | Thêm email config vars |
| `src/services/notification_service.py` | Edit | Enqueue email job |
| `src/services/chat_pipeline/jobs.py` | Edit | Trigger email khi lead HOT |
| `src/services/scheduler.py` | Edit | Schedule email worker |
| `requirements.txt` | Edit | Thêm `resend` hoặc `aiosmtplib` |

## Timeline ước tính: 3-4 ngày
