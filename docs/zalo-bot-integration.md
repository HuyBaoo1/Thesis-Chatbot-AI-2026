# Tích hợp Zalo Bot (API chính thức) — Tài liệu bàn giao

> **Mục đích:** Hướng dẫn tích hợp kênh **Zalo Bot chính thức** (https://bot.zapps.me/docs) vào hệ thống, để bàn giao sang **project-1**. Đây là bản thay thế cho hướng cũ dùng `zca-js`/OpenClaw (reverse-engineer, dễ bị khóa tài khoản).
>
> **Đã kiểm chứng chạy thật** trên A20-App-165 (Railway, bot `VinUniTS`): webhook → RAG → reply hoạt động.
>
> **Trạng thái:** Production-ready. Nguồn tham chiếu code: repo `A20-App-165` (commit `100acc8`).

---

## 1. TL;DR

- Zalo Bot API **gần như là bản sao của Telegram Bot API** → tích hợp mô phỏng đúng kênh Telegram đã có.
- Khác biệt cốt lõi: **chỉ gửi text thuần ≤ 2000 ký tự**, không HTML/nút bấm; `getUpdates` **không có `offset`**; Update có cấu trúc riêng (`result.message` + `event_name`); webhook xác thực bằng header `X-Bot-Api-Secret-Token`.
- **Production dùng WEBHOOK** (không dùng long-polling khi chạy nhiều worker/replica — xem §8).
- **Phải áp migration cho prod** (cột `zalo_user_id`) — nhưng áp ở **bước RIÊNG**, **KHÔNG** nhét `alembic upgrade head &&` vào start command (alembic treo lúc boot sẽ chặn uvicorn → **sập cả API**; xem §7).

---

## 2. So sánh phương án (vì sao bỏ zca-js)

| Tiêu chí | `zca-js` / OpenClaw (cũ) | **Zalo Bot API (chính thức)** |
|---|---|---|
| Hợp pháp | Reverse-engineer, vi phạm ToS — *"could get your account locked or banned"* | ✅ Chính thức |
| Đăng nhập | QR phiên cá nhân, dễ hết hạn | ✅ Bot token cố định |
| Kiến trúc | Cần worker thường trực ngoài API | ✅ Webhook HTTP thuần, hoặc long-poll |
| Production | ❌ chỉ demo | ✅ dùng được production |

---

## 3. Hợp đồng API Zalo Bot (tham chiếu)

**Base URL:** `https://bot-api.zaloplatforms.com/bot<BOT_TOKEN>/<method>` — tất cả **POST**, JSON, UTF-8.

**Envelope phản hồi:** `{ "ok": bool, "result": ..., "description": str?, "error_code": int }`

| Method | Ghi chú |
|---|---|
| `getMe` | Kiểm tra token. Trả `{id, account_name, account_type, can_join_groups, display_name}` |
| `getUpdates` | Long-polling. **Chỉ có param `timeout`** (mặc định 30s), **không có `offset`**. Ngưng hoạt động nếu đã set webhook |
| `setWebhook` | Params `url` (HTTPS), `secret_token` (8–256 ký tự) |
| `deleteWebhook`, `getWebhookInfo` | Quản lý webhook |
| `sendMessage` | Params `chat_id` (string), `text` (string **1–2000 ký tự**). **Không** `parse_mode`/HTML, **không** `reply_markup`/nút bấm. Trả `{message_id, date}` |
| `sendPhoto`, `sendSticker`, `sendChatAction` | Media (ngoài phạm vi bản này) |

**Cấu trúc Update (webhook body & item trong getUpdates):**

```json
{
  "ok": true,
  "result": {
    "message": {
      "from":  { "id": "6ede9afa66b88fe6d6a9", "display_name": "Ted", "is_bot": false },
      "chat":  { "id": "6ede9afa66b88fe6d6a9", "chat_type": "PRIVATE" },
      "text": "Xin chào",
      "message_id": "2d758cb5e222177a4e35",
      "date": 1750316131602
    },
    "event_name": "message.text.received"
  }
}
```

- **Không có `update_id`** (khác Telegram) → chống trùng bằng `message_id`.
- `event_name` ∈ `message.text.received` | `message.image.received` | `message.sticker.received` | `message.unsupported.received`.
- `chat.id` dùng để gửi trả; `from.id` là định danh người dùng (bằng nhau trong chat PRIVATE).

---

## 4. Lấy Bot Token

1. Mở app **Zalo** (điện thoại) → tìm Official Account **"Zalo Bot Manager"**.
2. Trong khung chat → menu → **Create bot** (mở mini-app *Zalo Bot Creator*: https://zalo.me/s/botcreator/).
3. Nhập tên bot — **bắt buộc bắt đầu bằng tiền tố `Bot`** (vd `Bot VinUniTS`).
4. Token được **gửi về qua tin nhắn Zalo** (không có portal lấy lại → lưu ngay).
5. Kiểm tra: `curl -X POST "https://bot-api.zaloplatforms.com/bot<TOKEN>/getMe"`.

> Link chat với bot cho người dùng cuối: lấy QR/link trong app Zalo Bot Manager, hoặc `https://zalo.me/<bot_id>` (mở trên Zalo đã đăng nhập), hoặc tìm tên bot trong app.

---

## 5. Các thành phần cần port (tham chiếu A20-App-165)

| File | Vai trò |
|---|---|
| `src/services/zalo_service.py` | Lõi: getUpdates polling (dedup theo `message_id`) + xử lý webhook; `send_message` cắt ≤2000 ký tự; lọc `event_name`; onboarding email/SĐT; nối RAG pipeline |
| `src/api/routers/zalo.py` | `POST /api/zalo/webhook` (verify `X-Bot-Api-Secret-Token`) + `POST /api/zalo/send` (staff gửi tay) |
| `src/api/router.py` | Đăng ký `zalo.router` |
| `src/main.py` | Start/stop polling trong lifespan; thêm `/api/zalo/webhook` vào allowlist CSRF (`WEBHOOK_PATHS`) |
| `src/core/config.py` | `ZALO_BOT_TOKEN`, `ZALO_POLLING_ENABLED`, `ZALO_WEBHOOK_SECRET` |
| `src/models/lead.py` + migration | Cột `zalo_user_id` (map user Zalo ↔ lead) |
| `scripts/zalo_webhook.py` | CLI set/delete/info webhook + getMe |
| `test_zalo.py` | Harness test getMe + polling local |

### Điểm khác Telegram phải xử lý khi port

1. **`sendMessage` chỉ text thuần, ≤ 2000 ký tự** → tách câu trả lời dài thành nhiều tin; **không** dùng HTML, **không** dùng nút `request_contact` (onboarding phải nhập email/SĐT bằng text).
2. **`getUpdates` không có `offset`** → dedup bằng `message_id` (set in-memory có TTL), không dùng file offset như Telegram.
3. **Update khác cấu trúc** → đọc `result.message.{from.id, display_name, chat.id, text, message_id}` + `result.event_name`. Viết hàm chuẩn hóa nhận cả 3 dạng (getUpdates list / webhook bọc `result` / event trần).
4. **Webhook xác thực** bằng header `X-Bot-Api-Secret-Token` == `ZALO_WEBHOOK_SECRET` (so sánh timing-safe).

### Nối vào omnichannel hub của project-1

Hub project-1 đã có provider `zalo_oa` (production). Adapter Zalo Bot chỉ cần:
- Nhận webhook → chuẩn hóa `result.message` về `Conversation`/`Message` nội bộ (giống cách Discord adapter ingest).
- Verify secret + idempotency theo `message_id`.
- Trả lời bằng `sendMessage(chat_id, text)`.

→ Lõi RAG/inbox/AI **không đổi**; chỉ thêm một adapter mỏng.

---

## 6. Cấu hình & triển khai

### Biến môi trường

```bash
ZALO_BOT_TOKEN=<token-tu-Zalo-Bot-Manager>
# Production (nhiều worker): để false, dùng webhook. Local 1 worker: true để long-poll.
ZALO_POLLING_ENABLED=false
# Secret 8–256 ký tự; truyền vào setWebhook, Zalo echo lại ở header X-Bot-Api-Secret-Token
ZALO_WEBHOOK_SECRET=<random-hex-24-bytes>
```

### Đăng ký webhook (sau khi deploy)

```bash
python scripts/zalo_webhook.py set https://<your-domain>/api/zalo/webhook
python scripts/zalo_webhook.py info     # xác nhận
python scripts/zalo_webhook.py delete   # gỡ (vd muốn quay lại polling local)
```

### Kiểm thử nhanh không cần client Zalo

```bash
curl -X POST "https://<your-domain>/api/zalo/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Bot-Api-Secret-Token: <ZALO_WEBHOOK_SECRET>" \
  -d '{"ok":true,"result":{"message":{"from":{"id":"u1","display_name":"Test"},"chat":{"id":"u1","chat_type":"PRIVATE"},"text":"ping","message_id":"m1","date":1},"event_name":"message.text.received"}}'
# Kỳ vọng: {"ok":true}  (secret đúng). Sai secret -> 403.
```

---

## 7. ⚠️ Lưu ý vận hành #1 — Migration áp ở BƯỚC RIÊNG, ĐỪNG để alembic chặn uvicorn

> **Bài học xương máu từ 2 sự cố go-live thật.** Tóm tắt: schema DB **phải** được migrate, **NHƯNG tuyệt đối không để `alembic upgrade head` chặn tiến trình web** — một lần alembic treo/lỗi sẽ kéo **sập toàn bộ API**, không chỉ kênh Zalo.

**Sự cố 1 — thiếu migration → bot im lặng.** Bot nhận webhook (200 OK) nhưng không trả lời, vì cột `lead.zalo_user_id` chưa được tạo trên prod (migration chưa chạy) → query tra lead crash `UndefinedColumn` (lỗi async bị nuốt, Zalo vẫn nhận 200 nên không retry).

**Sự cố 2 (NẶNG hơn) — nhét alembic vào start command → sập CẢ API.** "Sửa" sự cố 1 bằng cách đổi start command thành `alembic upgrade head && uvicorn …`. Lần deploy kế tiếp, **`alembic upgrade head` treo ngay lúc khởi động** (log dừng ở *"Will assume transactional DDL"*, không bao giờ tới uvicorn). Vì có `&&`, **uvicorn không chạy → cả API trả 502/timeout** (không chỉ Zalo). Nghi vấn nguyên nhân treo: alembic kết nối DB *ngay khi container vừa lên* — lúc mạng nội bộ (`*.railway.internal`) hoặc lock `alembic_version` chưa sẵn sàng → treo vô hạn; uvicorn kết nối muộn hơn thì không sao.

### ✅ Khuyến nghị (an toàn)

1. **Web start command = `uvicorn …` thuần.** KHÔNG nhét `alembic upgrade head &&` vào start command của tiến trình web.
2. **Áp migration ở một bước RIÊNG, không chặn web** — chọn 1:
   - **Trước/độc lập với deploy (khuyến nghị):** chạy `alembic upgrade head` từ ngoài qua **`DATABASE_PUBLIC_URL`** (TCP proxy) — đổi scheme `postgresql://` → `postgresql+psycopg://`, set vào env `DATABASE_URL` rồi `alembic upgrade head`.
   - **Trong container đang chạy:** `railway ssh <service> -- alembic upgrade head` (cần host key OK).
   - **Release/pre-deploy job** của nền tảng (tách hẳn khỏi tiến trình web), CHỈ khi job đó **có timeout** và **không** chặn web khi lỗi.
3. **Đánh đổi:** deploy không tự migrate → phải nhớ áp migration như một bước deploy riêng. Nhưng thiếu migration chỉ làm **tính năng mới lỗi** (app vẫn sống) — nhẹ hơn nhiều so với `&&` kéo sập toàn hệ thống.

> ⚠️ `Dockerfile`/`render.yaml` của repo có sẵn `alembic upgrade head && uvicorn …`. Mẫu này tiện nhưng **mang đúng rủi ro outage ở trên** trên nền tảng có private-network khởi động trễ → nên **bỏ alembic khỏi start command của tiến trình web**.

### Bẫy phụ — `alembic_version` lệch với schema thật

Trên prod, `alembic_version` có thể **kẹt ở revision cũ** trong khi cột của migration sau *đã tồn tại* (do từng áp thủ công). Khi đó `alembic upgrade head` chết ở `DuplicateColumn`. Cách xử lý đã dùng:

```bash
alembic current                                    # vd: 2de363c3aed9 (cũ)
alembic stamp <revision-ngay-truoc-migration-moi>  # chỉ cập nhật version, KHÔNG chạy DDL
alembic upgrade head                               # giờ chỉ chạy migration còn thiếu
```

---

## 8. ⚠️ Lưu ý vận hành #2 — Webhook vs Polling khi nhiều worker

`getUpdates` (long-polling) yêu cầu **chỉ một consumer**. Nếu service chạy **`uvicorn --workers N`** (N>1) hoặc **nhiều replica**, mỗi tiến trình sẽ chạy một vòng `getUpdates` trong `lifespan` → **giành tin nhắn / trùng lặp / xung đột** (giống lỗi 409 của Telegram).

**Quy tắc:**

| Môi trường | Cách nhận tin | Cấu hình |
|---|---|---|
| **Production** (nhiều worker/replica, có domain HTTPS) | **Webhook** | `ZALO_POLLING_ENABLED=false` + `setWebhook` |
| **Local/dev** (1 worker, không có URL public) | Polling | `ZALO_POLLING_ENABLED=true`, **không** set webhook |

- Webhook chạy tốt với nhiều worker (mỗi request do một worker xử lý).
- **Không** vừa bật polling vừa set webhook: khi đã có webhook, `getUpdates` ngừng trả dữ liệu.
- Chuyển chế độ: bật webhook thì `deleteWebhook` trước khi quay lại polling.

---

## 9. Kiểm tra sức khỏe / debug

```bash
# Token còn sống?
python scripts/zalo_webhook.py getme

# Webhook đang trỏ đâu?
python scripts/zalo_webhook.py info

# Xem log xử lý (Railway): tìm các dòng
#   "POST /api/zalo/webhook HTTP/1.1" 200 OK         <- Zalo có gửi tới
#   [ERROR] src.api.routers.zalo Zalo webhook ...    <- lỗi xử lý (vd UndefinedColumn)
```

**Triệu chứng → nguyên nhân thường gặp:**

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Webhook 200 nhưng bot không trả lời | Lỗi async bị nuốt (DB/RAG/send) | Soi log `[ERROR] src.api.routers.zalo` |
| `UndefinedColumn ... zalo_user_id` | Migration chưa áp lên prod | §7 — áp migration ở bước riêng (+ `stamp` nếu version lệch) |
| **Cả API trả 502 / timeout** (không chỉ Zalo) | `alembic` trong start command treo, chặn uvicorn | **Gỡ alembic khỏi start command** (để `uvicorn` thuần) rồi redeploy — §7 |
| Webhook trả 403 | Sai/thiếu `X-Bot-Api-Secret-Token` | Kiểm tra `ZALO_WEBHOOK_SECRET` khớp giá trị truyền vào `setWebhook` |
| Polling không nhận tin | Đã set webhook | `deleteWebhook` hoặc chuyển hẳn sang webhook |
| Tin bị xử lý 2 lần | Nhiều consumer polling | Tắt polling thừa, dùng webhook (§8) |

---

## 10. Phạm vi hiện tại & mở rộng

- **Đã làm:** chat text 1-1, onboarding email/SĐT, auto-reply RAG, lead + hội thoại đồng bộ dashboard, staff gửi tay qua `/api/zalo/send`.
- **Chưa làm (mở rộng được):** ảnh/sticker (`sendPhoto`/`sendSticker`, `event_name` image/sticker hiện chỉ trả lời "chỉ hỗ trợ text"), chat nhóm, luồng operator duyệt trước khi gửi.
