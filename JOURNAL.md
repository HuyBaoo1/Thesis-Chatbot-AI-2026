# Weekly Journal — A20 App

Ghi lại hành trình xây dựng sản phẩm mỗi tuần.

> Team: **Vuong Tran**, **Minh Hai**, **Bao Huy**

---

## Tuần 1 — 19/04/2026 → 25/04/2026

**Thành viên:** Vuong Tran, Minh Hai, Bao Huy

### Mục tiêu
- Thiết kế kiến trúc tổng thể hệ thống tư vấn tuyển sinh AI
- Setup project: FastAPI backend + React frontend + Database
- Xây dựng pipeline RAG cơ bản cho chatbot

### Đã làm
- Khởi tạo FastAPI backend với SQLAlchemy + Alembic
- Setup PostgreSQL, Redis, Qdrant qua Docker Compose
- Thiết kế 16 models database (Lead, Conversation, Message, KnowledgeChunk, Staff...)
- Xây dựng API auth (JWT login/refresh/logout)
- Setup React 19 + Vite + Tailwind CSS v4 + shadcn/ui cho frontend
- Implement RAG pipeline cơ bản: retrieval → synthesis với OpenAI GPT-4o
- Tích hợp Qdrant vector store cho tìm kiếm ngữ nghĩa
- Xây dựng module OCR pipeline (PyMuPDF + pytesseract)
- Tạo hệ thống web crawler với Firecrawl

### Khó khăn
- Merge nhiều migration heads từ các nhánh phát triển song song gây conflict
- Docker build context trên Windows khác với Linux
- Qdrant collection schema thay đổi nhiều lần trong quá trình thử nghiệm

### Cách giải quyết
- Phân tích merge conflicts và tạo migration merge heads tổng hợp
- Chuẩn hóa Dockerfile với đường dẫn tương đối cho cross-platform
- Fix Qdrant schema và re-index toàn bộ knowledge chunks

### AI tools đã dùng
| Tool | Dùng để làm gì | Kết quả |
|------|---------------|---------|
| Claude Code | Sinh code FastAPI models, routers; debug Docker config | Tiết kiệm ~60% thời gian boilerplate |
| Gemini CLI | Phân tích merge conflicts migration | Gợi ý giải pháp merge đúng |

### Học được
- Luôn kiểm tra Docker build trên cả Linux và Windows trước khi merge
- Qdrant cần API key ngay từ đầu — cấu hình bảo mật sớm hơn
- Nên thống nhất migration process giữa các thành viên

---

## Tuần 2 — 26/04/2026 → 02/05/2026

**Thành viên:** Vuong Tran, Minh Hai, Bao Huy

### Mục tiêu
- Hoàn thiện pipeline RAG với intent routing và hybrid search
- Xây dựng giao diện admin dashboard
- Thêm Telegram bot channel

### Đã làm
- Implement keyword-based intent router (7 intents) trước khi gọi LLM
- Tích hợp BM25 sparse search + Qdrant dense search → hybrid retrieval
- Xây dựng UI: Dashboard, Leads, Knowledge Chunks, Hot Questions, Majors
- Tích hợp Telegram bot (polling + webhook)
- Thêm SSE real-time notifications
- WebSocket cho real-time chat giữa staff và lead
- Cloudflare R2 storage cho file uploads và OCR artifacts
- Lead scoring system (HOT/WARM/COLD) với activity tracking

### Khó khăn
- Intent classification sai với câu hỏi tiếng Việt phức tạp
- Pipeline performance chậm khi gọi LLM nhiều lần
- Telegram webhook không ổn định trên Railway
- WebSocket connection bị ngắt khi deploy

### Cách giải quyết
- Thêm keyword matching tiếng Việt trước LLM router để giảm latency
- Tối ưu số lần gọi LLM trong pipeline (combine steps)
- Chuyển Telegram từ webhook sang polling mode cho ổn định hơn
- Fix WebSocket reconnect logic và CORS configuration

### AI tools đã dùng
| Tool | Dùng để làm gì | Kết quả |
|------|---------------|---------|
| Claude Code | Viết keyword router logic, fix Telegram integration | Giải quyết bug Telegram trong 20 phút |
| Cursor | Autocomplete TypeScript types cho frontend | Tiết kiệm ~30% thời gian typing |

### Học được
- Keyword routing đơn giản nhưng hiệu quả — giảm LLM gọi tới 60%
- Telegram polling ổn định hơn webhook cho Railway deployment
- Cần connection pool cho WebSocket khi scale nhiều replicas

---

## Tuần 3 — 03/05/2026 → 09/05/2026

**Thành viên:** loversky02, Minh Hai

### Mục tiêu
- Tối ưu hiệu năng pipeline
- Hoàn thiện UI toàn bộ trang admin
- Thêm tính năng human handoff

### Đã làm
- Tối ưu pipeline: combine pre-LLM DB commits, thread pool cho chat
- Thêm timeout + retry cho OpenAI API calls
- UI polish toàn bộ: Home, Login, Dashboard, Leads, Staff, Majors, Tuition, Hot Questions, Knowledge Chunks
- Human handoff: tự động chuyển hội thoại từ AI → staff sau timeout 3 phút không phản hồi
- Notification system: đa kênh (in-app + Telegram)
- Thêm permission-based routing cho frontend (admin vs counselor)
- FAQ Analytics: nhận diện câu hỏi phổ biến và lỗ hổng thông tin
- Rerank candidates trước khi synthesis để tăng độ chính xác

### Khó khăn
- Pipeline chạy chậm khi nhiều user đồng thời
- UI notification realtime không đồng bộ giữa các tab
- Telegram bot gửi tin nhắn không đúng format markdown
- OCR pipeline xử lý PDF tiếng Việt bị lỗi encoding

### Cách giải quyết
- Offload chat pipeline vào thread pool qua async handler
- Triển khai SSE broadcast cho realtime sync
- Escape markdown characters trong Telegram message
- Thêm smart extraction mode cho OCR + OpenAI Vision fallback

### AI tools đã dùng
| Tool | Dùng để làm gì | Kết quả |
|------|---------------|---------|
| Claude Code | Tối ưu performance pipeline, debug SSE | Phát hiện 3 memory leak trong SSE handler |
| ChatGPT | Dịch UI strings sang tiếng Việt | Đảm bảo tính tự nhiên |

### Học được
- Thread pool + async handler là pattern tốt cho I/O-bound pipeline
- SSE đơn giản hơn WebSocket cho one-way realtime updates
- Nên thêm exponential backoff cho tất cả external API calls

---

## Tuần 4 — 10/05/2026 → 13/05/2026

**Thành viên:** loversky02, Minh Hai

### Mục tiêu
- Scale hệ thống cho production
- Tối ưu tốc độ và độ ổn định
- Hoàn thiện documentation

### Đã làm
- Scale Railway lên 3 replicas + 4 uvicorn workers mỗi instance
- Redis-based LLM answer cache (30 phút TTL) — giảm 40% gọi OpenAI
- LLM concurrency guard (semaphore limit 10, exponential backoff)
- FAQ cache warmup script
- Gemini Flash router cho intent classification nhanh
- Keyword router mở rộng: thêm Vietnamese timeline tokens
- Greeting detection tối ưu (case-insensitive, whitelist approach)
- Multi-intent keyword matching → fallback to LLM router
- Fix cache key: query+intent thay vì grounded_prompt
- Hoàn thiện README.md với kiến trúc, setup guide, usage instructions
- Viết nhật ký & minh chứng (JOURNAL.md, WORKLOG.md, EVIDENCE.md)

### Khó khăn
- LLM cache hit rate thấp do cache key chứa grounded_prompt đầy đủ
- Greeting detection bắt nhầm câu hỏi thực (false positive)
- Gemini Flash model name thay đổi (`gemini-3-flash-preview`)
- Multi-intent queries (vừa hỏi học phí vừa hỏi học bổng) không được xử lý

### Cách giải quyết
- Đổi cache key sang sha256(query + intent) — hit rate tăng từ 15% lên 40%
- Chuyển từ blacklist sang whitelist greeting patterns, thêm length check
- Cập nhật model name và thêm JSON mode + robust parsing
- Detect multi-intent qua keyword overlap → fallback to LLM router

### AI tools đã dùng
| Tool | Dùng để làm gì | Kết quả |
|------|---------------|---------|
| Claude Code | Performance tối ưu, cache design, bug fixes | Giải quyết 15+ bugs trong tuần |
| Claude Code | Viết README, JOURNAL, WORKLOG | Hoàn thiện docs trong 2 giờ |

### Học được
- Cache key design quyết định cache hit rate — cần normalize và chọn key đúng
- Whitelist luôn an toàn hơn blacklist cho content filtering
- Multi-model routing (Gemini cheap + OpenAI accurate) tiết kiệm chi phí
- Feature flags và graceful degradation quan trọng khi scale production

### Nếu làm lại, sẽ làm khác
- Thiết kế cache strategy ngay từ đầu pipeline
- Viết integration tests cho toàn bộ pipeline trước khi tối ưu
- Setup monitoring & alerting sớm hơn (Prometheus/Grafana)

---

## Tổng kết hành trình

| Tuần | Giai đoạn | Commits | Thành viên |
|------|-----------|---------|------------|
| 1 (19-25/04) | Architecture & Foundation | ~150 | 3 người |
| 2 (26/04-02/05) | Core Features | ~120 | 3 người |
| 3 (03-09/05) | UI Polish & Pipeline Refinement | ~80 | 2 người |
| 4 (10-13/05) | Performance, Scale & Docs | ~50 | 2 người |
| **Tổng** | | **~400+** | |

### Những con số ấn tượng
- **850+ commits** trong 4 tuần
- **16 database models** thiết kế và triển khai
- **11 bước pipeline** RAG từ input đến output
- **7 intent types** được phân loại tự động
- **40% giảm gọi LLM** nhờ answer cache
- **3 replicas + 4 workers** cho production scale
- **3 kênh giao tiếp**: Web Widget, Telegram, Dashboard
