# Production Readiness Inventory

Generated during production-readiness audit for VGU Admissions Intelligence Platform. This file contains operational state only; it does not contain secret values.

| Component | Current state | Production requirement | Action |
|---|---|---|---|
| Current Compose project | Active local stack now runs as `vgu-admissions-platform-staging`. | Staging: `vgu-admissions-platform-staging`; production: `vgu-admissions-platform-prod`. | Staging identity migrated; production cutover remains gated. |
| Current containers | Active containers use project-scoped names: `vgu-admissions-platform-staging-api-1`, `postgres-1`, `redis-1`, `qdrant-1`. | No fixed legacy `container_name`; service discovery by `api`, `postgres`, `redis`, `qdrant`, `worker`. | Base Compose no longer declares fixed container names. |
| Current volumes | Active staging volumes: `vgu-admissions-platform-staging_postgres_data`, `vgu-admissions-platform-staging_redis_data`, `vgu-admissions-platform-staging_qdrant_data`. Legacy volumes retained for rollback. | Staging and production must not share volumes. | Compose now uses generic volume keys so Compose namespaces by project. |
| API service | Built as `vgu-admissions-platform-api:staging`; local staging exposes port 8000 for validation. | Production should use `vgu-admissions-platform-api:prod`, no reload, healthcheck, restart policy, managed ingress/reverse proxy. | Staging health passes; production cutover blocked by provider/data gates. |
| PostgreSQL | Active staging database is `vgu_admissions`; application role is `vgu_app`; maintenance role is `vgu_migration`; `vgu_app` is not superuser. | Runtime must not use generic `admin` or a superuser. | Dedicated role/database created and validated. |
| Redis | Active queue name is `vgu-admissions`; Redis URL is read from environment and not passed as process arg. | No hard-coded Redis URL, no URL in logs, no production fallback to localhost. | Worker scripts and Compose command updated. |
| Qdrant | Active collection remains generic `knowledge_chunks`; active staging point count is 21. | Keep generic collection name unless project-specific legacy identifier exists. | Restored points into staging Qdrant volume. |
| Worker | Base service is now `worker`; command is `python /app/worker/start.py`. | Dedicated worker service for production-like deployment. | Production override defines dedicated `worker`; local API still embeds worker unless disabled. |
| Crawl artifacts | Production override uses `crawl_artifacts` mounted to `/app/data/runtime/admissions-ocr`. | Artifacts must persist outside `/tmp`. | Compose config prepared; active KB still has legacy `/tmp` references that block production. |
| Frontend | Vite app remains static-build based; no frontend Dockerfile found. | Production build/static host, not Vite dev server. | Build validation required for final cutover. |
| Deployment target | `render.yaml` now uses VGU platform names and `vgu_migration`/`vgu_admissions`; API `DATABASE_URL` is `DATA_REQUIRED` for the `vgu_app` runtime connection string. | No A20/VinUni/personal naming in active deployment config. | Render template normalized; real platform/domain and app-role connection string still DATA_REQUIRED. |
| Provider credential revocation | Old provider credentials not available as `OLD_*`; OpenAI runtime key previously failed validation. | Old keys revoked and new keys valid. | Manual provider confirmation still required. |
| Knowledge Base | PostgreSQL and Qdrant have 21 records/points; active legacy VinUni count is 0. | Only verified VGU documents active, no unknown/unverified active chunks. | Data gate remains blocked by unverified metadata and legacy `/tmp` artifact source. |
| Backup | PostgreSQL dumps, Qdrant export, and legacy volume backup exist under `backups/pre-production/`. | Backup/rollback procedure available before cutover. | Completed for staging migration. |
