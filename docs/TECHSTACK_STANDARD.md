# Tech Stack chuẩn hóa - A20 App

## 1. Frontend
- React 19
- TypeScript
- Vite 7
- Tailwind CSS v4
- shadcn/ui
- TanStack Query
- Zustand
- React Router v7
- i18next

## 2. Backend
- Python 3.12
- FastAPI
- SQLAlchemy 2.x
- Alembic
- Pydantic schemas

## 3. Dữ liệu và hạ tầng dữ liệu
- PostgreSQL 16 (OLTP)
- Redis 7 (cache, queue, pub-sub)
- RQ (Redis Queue worker)
- Qdrant (vector database)
- Cloudflare R2 (object storage)

## 4. AI và tích hợp ngoài
- OpenAI (chat completions, embeddings)
- Firecrawl (web crawling)
- Telegram Bot API (kênh chat ngoài web)

## 5. Triển khai
- Frontend deploy: Vercel
- Backend deploy: Railway
- Worker deploy: Railway/container
- Local orchestration: Docker Compose

## 6. Runtime modes
- Public mode:
  - Domain công khai, không lộ route admin.
- Admin mode:
  - Domain nội bộ, có login và dashboard vận hành.

## 7. Gợi ý chuẩn hóa version policy
- Nhóm core (khuyến nghị pin chặt): FastAPI, SQLAlchemy, React, Vite, Redis client, OpenAI SDK.
- Nhóm integration (pin theo compatibility): Qdrant client, Telegram SDK, Firecrawl SDK.
- Nhóm build/dev:
  - Định kỳ rà soát mỗi sprint hoặc mỗi tháng.
