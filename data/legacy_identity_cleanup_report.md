# Legacy Identity Cleanup Report

| Resource/file | Old identity | Classification | New identity/action | Result |
|---|---|---|---|---|
| Docker Compose project | `thesis-chatbot-ai-2026` | ACTIVE_RUNTIME | `vgu-admissions-platform-staging` | Migrated; old containers stopped/removed. |
| API image | `thesis-chatbot-ai-2026-api:latest` | ACTIVE_RUNTIME | `vgu-admissions-platform-api:staging` | Migrated; old image removed. |
| API container | `admissions-api`, `thesis-chatbot-ai-2026-api-1` | ACTIVE_RUNTIME | `vgu-admissions-platform-staging-api-1` | Migrated. |
| PostgreSQL container | `admissions-postgres`, `thesis-chatbot-ai-2026-postgres-1` | ACTIVE_RUNTIME | `vgu-admissions-platform-staging-postgres-1` | Migrated. |
| Redis container | `admissions-redis`, `thesis-chatbot-ai-2026-redis-1` | ACTIVE_RUNTIME | `vgu-admissions-platform-staging-redis-1` | Migrated. |
| Qdrant container | `admissions-qdrant`, `thesis-chatbot-ai-2026-qdrant-1` | ACTIVE_RUNTIME | `vgu-admissions-platform-staging-qdrant-1` | Migrated. |
| Docker network | `thesis-chatbot-ai-2026_app-network` | ACTIVE_RUNTIME | `vgu-admissions-platform-staging_app-network` | Migrated; old network removed. |
| PostgreSQL volume | `thesis-chatbot-ai-2026_postgres_data` | ROLLBACK_ARTIFACT | `vgu-admissions-platform-staging_postgres_data` | New active volume created; legacy retained for rollback. |
| Redis volume | `thesis-chatbot-ai-2026_redis_data` | ROLLBACK_ARTIFACT | `vgu-admissions-platform-staging_redis_data` | New active volume created; legacy retained for rollback. |
| Qdrant volume | `thesis-chatbot-ai-2026_qdrant_storage` | ROLLBACK_ARTIFACT | `vgu-admissions-platform-staging_qdrant_data` | New active volume created; legacy retained for rollback. |
| PostgreSQL role/database | `admin` / `admin` | ACTIVE_RUNTIME | `vgu_app` / `vgu_admissions`; maintenance role `vgu_migration` | Migrated; runtime role is not superuser. |
| Redis queue | `default` | ACTIVE_RUNTIME | `vgu-admissions` | Migrated in `.env` and runtime config. |
| `docker-compose.yml` | fixed `container_name`, `rq-worker` | DEPLOYMENT_CONFIG | project-scoped names, service `worker` | Updated. |
| `docker-compose.prod.yml` | `baohuy_vgu_*` volumes | DEPLOYMENT_CONFIG | Compose-namespaced generic volumes | Updated. |
| `render.yaml` | `a20-*`, `a20_admin`, `a20_app` | DEPLOYMENT_CONFIG | `vgu-admissions-platform-*`, `vgu_app`, `vgu_admissions` | Updated. |
| `src/main.py` | no explicit platform title | ACTIVE_RUNTIME | `VGU Admissions Intelligence Platform` | Updated FastAPI metadata. |
| `src/agents/*` | `VinUni Admissions Portal` | ACTIVE_RUNTIME | `VGU Admissions Intelligence Platform` | Updated internal agent prompts/comments. |
| `src/evaluation/*` | VinUni evaluation datasets/results | TEST_FIXTURE / HISTORICAL_DATA | Retained as historical evaluation artifacts | Not used for active runtime; production package exclusion still recommended. |
| `docs/archive/*`, `history/*`, `demo/*` | A20/VinUni references | ARCHIVE / ATTRIBUTION | Retained as non-runtime archive/demo material | Must not be shipped in production image/package. |
| Active KB chunks | legacy `/tmp` artifact source | ACTIVE_DATA | Needs controlled disable/re-import from persistent artifact | BLOCKED: data gate not clean. |
