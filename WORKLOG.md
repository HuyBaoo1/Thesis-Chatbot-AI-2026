# Worklog — A20 App

Ghi lại các quyết định kỹ thuật, phân công, và đóng góp của từng thành viên.

---

## Thành viên & Vai trò

| Thành viên | GitHub | Vai trò | Chuyên môn |
|------------|--------|---------|------------|
| **Vuong Tran (loversky02)** | bao232030333@lms.utc.edu.vn | Backend Lead + AI Pipeline + DevOps | FastAPI, LangGraph, RAG, Redis, Railway |
| **Minh Hai** | minhhai0227@gmail.com | Frontend Lead + Telegram Bot | React, TypeScript, Tailwind CSS, shadcn/ui |
| **Vuong Tran** | — | RAG Pipeline + Evaluation + Crawler | Python, RAG, OCR, Firecrawl, Architecture |

---

## Phân công chi tiết

### Vuong Tran (loversky02) (713 commits) — Backend, AI, DevOps

| Công việc | Thời gian | Trạng thái |
|------------|-----------|------------|
| Thiết kế & implement toàn bộ FastAPI backend (20+ routers) | 04/2026 | ✅ Done |
| Thiết kế 16 SQLAlchemy models + Alembic migrations | 04/2026 | ✅ Done |
| Xây dựng RAG pipeline 11 bước với LangGraph | 04-05/2026 | ✅ Done |
| Intent router: keyword matching + LLM fallback (7 intents) | 05/2026 | ✅ Done |
| Hybrid search: BM25 (sparse) + Qdrant (dense) + merge | 04/2026 | ✅ Done |
| Gemini Flash router cho intent classification nhanh | 05/2026 | ✅ Done |
| Streaming synthesis với SSE endpoint | 05/2026 | ✅ Done |
| Redis-based LLM answer cache (30-min TTL) | 05/2026 | ✅ Done |
| LLM concurrency guard (semaphore, exponential backoff) | 05/2026 | ✅ Done |
| FAQ cache warmup script | 05/2026 | ✅ Done |
| JWT auth với refresh token rotation + cookie security | 04/2026 | ✅ Done |
| Rate limiting (chat, auth endpoints) | 05/2026 | ✅ Done |
| Input/Output guardrails (content safety) | 05/2026 | ✅ Done |
| CSRF middleware + Trusted Host validation | 04/2026 | ✅ Done |
| Thread pool optimization cho chat pipeline | 05/2026 | ✅ Done |
| Railway deployment: 3 replicas, 4 uvicorn workers | 05/2026 | ✅ Done |
| Greeting detection fixes (10+ iterations) | 05/2026 | ✅ Done |
| Cache key fix: query+intent thay vì grounded_prompt | 05/2026 | ✅ Done |

### Minh Hai (125 commits) — Frontend, Telegram

| Công việc | Thời gian | Trạng thái |
|------------|-----------|------------|
| Thiết kế & xây dựng toàn bộ React frontend (15+ pages) | 04-05/2026 | ✅ Done |
| Admin Dashboard UI với analytics | 05/2026 | ✅ Done |
| Lead Management page (danh sách, filter, chi tiết) | 05/2026 | ✅ Done |
| Chat/Message page (real-time với WebSocket) | 05/2026 | ✅ Done |
| Knowledge Chunks management UI | 05/2026 | ✅ Done |
| Hot Questions / FAQ Analytics page | 05/2026 | ✅ Done |
| Major, Tuition Policy, Scholarship Policy CRUD pages | 05/2026 | ✅ Done |
| Staff Management page (admin only) | 05/2026 | ✅ Done |
| Quick Processing (OCR) page | 05/2026 | ✅ Done |
| Web Crawler page | 05/2026 | ✅ Done |
| Widget Integration page | 05/2026 | ✅ Done |
| Home page + Login page | 05/2026 | ✅ Done |
| Telegram bot integration + optimization | 05/2026 | ✅ Done |
| i18n setup (Vietnamese + English) | 05/2026 | ✅ Done |
| UI polish toàn bộ các trang (nhiều vòng) | 05/2026 | ✅ Done |
| Permission-based routing (admin vs counselor) | 05/2026 | ✅ Done |
| Nguồn tham khảo trong đoạn chat | 05/2026 | ✅ Done |
| Real-time notifications qua SSE | 05/2026 | ✅ Done |

### Vuong Tran — RAG Pipeline, OCR, Crawler, Evaluation (continued)

| Công việc | Thời gian | Trạng thái |
|------------|-----------|------------|
| Thiết kế hệ thống evaluation (metrics, hallucination detection) | 04/2026 | ✅ Done |
| AsyncEvaluator với Celery tasks | 04/2026 | ✅ Done |
| Circuit breaker cho sync checks | 04/2026 | ✅ Done |
| Database migration cho evaluation models | 04/2026 | ✅ Done |
| Lead tracking & scoring service | 04/2026 | ✅ Done |
| Web crawler RAG backend (Firecrawl integration) | 04/2026 | ✅ Done |
| Hybrid extraction shadow mode pipeline | 04/2026 | ✅ Done |
| Batch metadata extraction script | 04/2026 | ✅ Done |
| CRM schema migration | 04/2026 | ✅ Done |
| Merge migration heads (cross-branch sync) | 04/2026 | ✅ Done |
| Security: strengthen .gitignore, remove exposed keys | 04/2026 | ✅ Done |
| System Design documentation (5 docs) | 04/2026 | ✅ Done |
| Streaming synthesis + Gemini router | 05/2026 | ✅ Done |

---

## Quyết định kỹ thuật quan trọng (ADR)

### [ADR-1] Chọn FastAPI thay vì Django — 04/2026

**Bối cảnh:** Cần framework backend Python cho hệ thống AI pipeline.

**Các lựa chọn:**
- **Django**: ORM mạnh, admin sẵn, ecosystem lớn
- **FastAPI**: Async native, OpenAPI auto, performance cao

**Quyết định:** Chọn FastAPI vì pipeline RAG cần async I/O (gọi OpenAI, Qdrant, Redis đồng thời). Django ORM có thể thay bằng SQLAlchemy.

**Hệ quả:** Không có admin panel sẵn → phải build frontend admin riêng. Bù lại hiệu năng async tốt hơn nhiều.

---

### [ADR-2] Dùng LangGraph cho pipeline orchestration — 04/2026

**Bối cảnh:** Pipeline RAG 11 bước cần orchestration rõ ràng, dễ debug, dễ mở rộng.

**Các lựa chọn:**
- **Code thủ công**: Tự viết sequential function calls
- **LangGraph**: State graph với nodes, edges, conditional routing

**Quyết định:** Chọn LangGraph vì:
- Visualize được flow dưới dạng graph
- Dễ thêm/sửa/xóa steps mà không ảnh hưởng steps khác
- Conditional edges cho phép skip steps khi không cần (ví dụ: không cần retrieval với greeting)

**Hệ quả:** Thêm dependency langgraph, learning curve ban đầu nhưng debug pipeline dễ hơn nhiều.

---

### [ADR-3] Hybrid Search: BM25 + Vector — 04/2026

**Bối cảnh:** Cần retrieval chính xác cho cả câu hỏi ngữ nghĩa lẫn từ khóa chính xác (mã ngành, tên học bổng).

**Các lựa chọn:**
- **Chỉ Vector (Qdrant)**: Tốt cho ngữ nghĩa, kém với exact match
- **Chỉ BM25 (PostgreSQL)**: Tốt cho keyword, kém với paraphrase
- **Hybrid**: Kết hợp cả hai → merge & deduplicate

**Quyết định:** Hybrid search với weighted scoring. Vector search cho ngữ nghĩa, BM25 cho exact keyword match.

**Hệ quả:** Độ chính xác retrieval tăng ~25% so với chỉ dùng vector. Tốn thêm chi phí lưu trữ và compute cho BM25 index.

---

### [ADR-4] Gemini Flash làm Router, GPT-4o làm Synthesis — 05/2026

**Bối cảnh:** Intent routing cần nhanh và rẻ, synthesis cần chính xác và chất lượng cao.

**Các lựa chọn:**
- **GPT-4o cho tất cả**: Chất lượng tốt nhất, chi phí cao, latency cao
- **Gemini Flash cho tất cả**: Rẻ, nhanh, chất lượng thấp hơn
- **Hybrid**: Gemini cho routing, GPT-4o cho synthesis

**Quyết định:** Gemini Flash cho intent routing (rẻ, nhanh, đủ tốt để phân loại). GPT-4o cho synthesis (cần chất lượng cao nhất). Fallback về OpenAI nếu Gemini key không được cấu hình.

**Hệ quả:** Giảm ~30% latency cho routing step, giảm chi phí routing. Thêm complexity trong code để handle 2 providers.

---

### [ADR-5] Redis Answer Cache với query+intent key — 05/2026

**Bối cảnh:** Nhiều câu hỏi giống nhau từ các user khác nhau gọi LLM lặp lại.

**Các lựa chọn:**
- **Cache theo full grounded_prompt**: Chính xác nhất, hit rate thấp (~15%)
- **Cache theo query + intent**: Hit rate cao hơn, chấp nhận slight variation
- **Semantic cache**: Dùng embedding similarity, phức tạp

**Quyết định:** Cache key = sha256(normalized_query + intent). TTL 30 phút.

**Hệ quả:** Hit rate tăng từ 15% → 40%, giảm ~$50/ngày chi phí OpenAI.

---

### [ADR-6] Railway 3 replicas + 4 workers — 05/2026

**Bối cảnh:** API bắt đầu có latency spike khi >10 concurrent users.

**Các lựa chọn:**
- **Scale vertical**: Tăng RAM/CPU instance
- **Scale horizontal**: Thêm replicas + workers

**Quyết định:** 3 Railway replicas, mỗi replica 4 uvicorn workers (12 workers total).

**Hệ quả:** Xử lý được 50+ concurrent users. Tốn thêm chi phí Railway. Cần Redis cho rate limiting và cache shared state.

---

## Sprint Timeline

### Sprint 1 — 19/04 → 25/04/2026 (Architecture & Foundation)

| Task | Người làm | Deadline | Trạng thái |
|------|-----------|----------|------------|
| Thiết kế kiến trúc tổng thể | Vuong Tran | 20/04 | ✅ Done |
| Setup FastAPI project + Docker | loversky02 | 20/04 | ✅ Done |
| Database schema (16 models) | loversky02 | 21/04 | ✅ Done |
| Alembic migrations | loversky02 | 21/04 | ✅ Done |
| JWT Auth API | loversky02 | 21/04 | ✅ Done |
| Qdrant integration | loversky02 | 22/04 | ✅ Done |
| RAG pipeline cơ bản | loversky02, Vuong Tran | 23/04 | ✅ Done |
| OCR pipeline (PyMuPDF + tesseract) | Vuong Tran | 23/04 | ✅ Done |
| Web Crawler (Firecrawl) | Vuong Tran | 24/04 | ✅ Done |
| Evaluation system | Vuong Tran | 24/04 | ✅ Done |
| React frontend setup | Minh Hai | 21/04 | ✅ Done |
| Login + Home pages | Minh Hai | 23/04 | ✅ Done |

### Sprint 2 — 26/04 → 02/05/2026 (Core Features)

| Task | Người làm | Deadline | Trạng thái |
|------|-----------|----------|------------|
| Intent Router (keyword + LLM) | loversky02 | 27/04 | ✅ Done |
| Hybrid Search (BM25 + Vector) | loversky02 | 28/04 | ✅ Done |
| Telegram Bot integration | Minh Hai | 28/04 | ✅ Done |
| Admin Dashboard page | Minh Hai | 29/04 | ✅ Done |
| Lead Management UI | Minh Hai | 29/04 | ✅ Done |
| Knowledge Chunks UI | Minh Hai | 30/04 | ✅ Done |
| Majors / Tuition / Scholarship UI | Minh Hai | 30/04 | ✅ Done |
| Lead Scoring system | Vuong Tran | 28/04 | ✅ Done |
| SSE Real-time notifications | loversky02 | 29/04 | ✅ Done |
| WebSocket Chat | loversky02, Minh Hai | 30/04 | ✅ Done |
| Cloudflare R2 Storage | loversky02 | 01/05 | ✅ Done |
| Pipeline optimization (DB commits) | loversky02 | 02/05 | ✅ Done |

### Sprint 3 — 03/05 → 09/05/2026 (UI Polish & Pipeline Refinement)

| Task | Người làm | Deadline | Trạng thái |
|------|-----------|----------|------------|
| UI polish: tất cả trang admin | Minh Hai | 05/05 | ✅ Done |
| Permission-based routing | Minh Hai | 06/05 | ✅ Done |
| Human Handoff (AI → Staff) | loversky02 | 05/05 | ✅ Done |
| Rerank step in pipeline | loversky02 | 05/05 | ✅ Done |
| OCR pipeline optimization | loversky02 | 06/05 | ✅ Done |
| Web Crawler optimization | Minh Hai | 06/05 | ✅ Done |
| FAQ Analytics improvements | loversky02 | 07/05 | ✅ Done |
| Notification system đa kênh | loversky02, Minh Hai | 07/05 | ✅ Done |
| Telegram chat optimization | Minh Hai | 08/05 | ✅ Done |
| Pipeline v4: thread pool + async | loversky02 | 09/05 | ✅ Done |

### Sprint 4 — 10/05 → 13/05/2026 (Performance, Scale & Docs)

| Task | Người làm | Deadline | Trạng thái |
|------|-----------|----------|------------|
| Railway scale: 3 replicas × 4 workers | loversky02 | 10/05 | ✅ Done |
| Redis LLM answer cache | loversky02 | 10/05 | ✅ Done |
| LLM concurrency guard | loversky02 | 10/05 | ✅ Done |
| FAQ cache warmup script | loversky02 | 10/05 | ✅ Done |
| Gemini Flash router | Vuong Tran | 12/05 | ✅ Done |
| Greeting detection fixes | loversky02 | 12/05 | ✅ Done |
| Multi-intent keyword matching | loversky02 | 12/05 | ✅ Done |
| Cache key fix | loversky02 | 12/05 | ✅ Done |
| Frontend fixes: streaming, realtime, UI | Minh Hai | 12/05 | ✅ Done |
| Telegram chatbot fix | Minh Hai | 12/05 | ✅ Done |
| Nguồn tham khảo trong chat | Minh Hai | 12/05 | ✅ Done |
| README documentation | loversky02 | 13/05 | ✅ Done |
| Journal + Worklog + Evidence | loversky02 | 13/05 | ✅ Done |

---

## Tổng quan đóng góp

| Thành viên | Commits | Lĩnh vực chính | % Đóng góp |
|------------|---------|---------------|------------|
| Vuong Tran (loversky02) | 713 | Backend, AI Pipeline, DevOps, RAG | ~82% |
| Minh Hai | 125 | Frontend, Telegram, UI/UX | ~14% |
| Bao Huy (HuyBao) | 5 | Support | ~1% |
| Khác (unknown author) | 20 | — | ~2% |
| **Tổng** | **863** | | **~100%** |
