# Managed Platform Migration - Railway + Qdrant Cloud

Date: 2026-09-02

## Decision

```text
MANAGED_PRODUCTION_TARGET = RAILWAY
QDRANT_TARGET = QDRANT_CLOUD
PRODUCTION_DEPLOYED = NO
```

The human owner selected Railway for the managed backend platform and Qdrant
Cloud for vector storage.

## Baseline

| Component | Baseline |
|---|---|
| AI/RAG behavior | Frozen; no retrieval, prompt, model, KB, Stage A/B, or Golden QA changes in this migration step |
| PostgreSQL active chunks | 122 |
| Qdrant points | 122 |
| VinUni active refs | 0 |
| Current validated fallback | VPS Docker Compose + Caddy, not removed |

## Initial Qdrant target audit

Initial code was environment-driven, not tied to a Railway-hosted Qdrant
service. The local Docker Compose path used a self-hosted `qdrant` container via
`QDRANT_HOST=qdrant`, while the original managed blueprint evidence pointed to
Qdrant Cloud through `render.yaml` environment configuration. The selected
production target for this migration is therefore Qdrant Cloud, not a Railway
Qdrant container.

## Selected topology

```text
Vercel public frontend
Vercel admin frontend
        |
        v
Railway FastAPI service
Railway RQ worker service
Railway PostgreSQL
Railway Redis
Qdrant Cloud
Cloudflare R2
```

## Required technical preparation

| Area | Action | Status |
|---|---|---|
| API container | Default command starts Uvicorn only; migrations run separately | PREPARED |
| API worker count | Initial production validation uses `UVICORN_WORKERS=1` | PREPARED |
| API docs exposure | `API_DOCS_ENABLED=false` disables FastAPI docs/OpenAPI without Caddy | PREPARED |
| Worker container | Default command starts `python /app/worker/start.py` | PREPARED |
| Optional crawl credential | `FIRECRAWL_API_KEY` is no longer required for core app settings startup | PREPARED |
| Railway service setup | Manual Railway project/service creation required | HUMAN_ACTION_REQUIRED |
| PostgreSQL | Restore validated dump, then run Alembic head separately | HUMAN_ACTION_REQUIRED |
| Redis | Create Railway Redis and set `REDIS_URL` for API/worker | HUMAN_ACTION_REQUIRED |
| Qdrant Cloud | Restore existing snapshot into `knowledge_chunks` | HUMAN_ACTION_REQUIRED |
| Vercel | Set `VITE_API_URL` to Railway API domain for both projects | HUMAN_ACTION_REQUIRED |

## Caddy/VPS status

```text
CADDY_CODE_REMOVED = NO
VPS_SPECIFIC_CODE_REMOVED = NO
HISTORICAL_REPORTS_PRESERVED = YES
```

Caddy/VPS remains a fallback/reference path until the managed deployment passes
API, worker, data parity, chat smoke, redeploy persistence, and backup/recovery
validation.

## Validation status

This task changed deployment/configuration documentation, container defaults,
and one small FastAPI configuration switch for production docs exposure. It did
not deploy production resources.

Pending managed runtime validation:

```text
Railway API health
Railway worker Redis connection
Railway PostgreSQL restore
Qdrant Cloud snapshot restore
PG/Qdrant parity 122/122
Vercel public/admin integration
Production-like chat smoke
Controlled redeploy persistence
```

## Runtime execution readiness update

Date: 2026-09-03

```text
RAILWAY_RUNTIME_DEPLOYMENT_READINESS = PASS_WITH_HUMAN_ACTION_REQUIRED
READY_FOR_RAILWAY_RESOURCE_CREATION = YES
READY_FOR_PRODUCTION_DEPLOYMENT = NO
PRODUCTION_DEPLOYED = NO
```

Local disposable validation confirmed the Railway-target API image starts with
the Dockerfile default command, uses one Uvicorn worker by default, honors a
custom `PORT`, returns `/health`, and disables API docs when
`API_DOCS_ENABLED=false`. The worker image starts the dedicated RQ worker and
connects to Redis.

Railway cloud execution is blocked on human account login and project/resource
creation. The local Railway CLI reports an expired OAuth session and no linked
project.
