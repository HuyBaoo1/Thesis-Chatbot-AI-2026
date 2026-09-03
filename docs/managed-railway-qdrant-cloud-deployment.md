# Managed Railway + Qdrant Cloud Deployment

Status: selected target, not yet deployed.

This document is the production deployment guide for the selected managed path:

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

The VPS Docker Compose + Caddy path remains a validated fallback until this
managed path passes deployment, data parity, chat smoke, redeploy persistence,
and backup/recovery validation.

## Source-of-truth evidence

- Frontend is Vite and is already split by `VITE_APP_MODE=public|admin`.
- Backend is FastAPI and builds from the root `Dockerfile`.
- Worker is an RQ process launched by `python /app/worker/start.py`.
- PostgreSQL is accessed through `DATABASE_URL`.
- Redis/RQ is accessed through `REDIS_URL`.
- Qdrant is accessed through `QDRANT_HOST`, `QDRANT_PORT`,
  `QDRANT_HTTPS`, and `QDRANT_API_KEY`.
- Qdrant collection expected after restore: `knowledge_chunks`.
- Validated data baseline before managed deployment:

```text
PostgreSQL active chunks = 122
Qdrant points = 122
VinUni active refs = 0
```

## Railway services

Create one Railway project/environment with these services:

| Service | Source | Public | Start command |
|---|---|---:|---|
| `api` | GitHub repo root, root `Dockerfile` | yes | Dockerfile default command |
| `worker` | GitHub repo root, `Dockerfile.worker` | no | Dockerfile default command or `python /app/worker/start.py` |
| `postgres` | Railway PostgreSQL template | no | platform managed |
| `redis` | Railway Redis template | no | platform managed |

Do not create a Railway Qdrant container for the selected target. Qdrant runs in
Qdrant Cloud.

## API service variables

Set these in the Railway `api` service variables. Do not paste secret values
into documentation or chat.

```env
DATABASE_URL=postgresql+psycopg://<railway-postgres-internal-credentials>
REDIS_URL=<railway-redis-internal-url>
QDRANT_HOST=<qdrant-cloud-host-without-https-scheme>
QDRANT_PORT=443
QDRANT_HTTPS=true
QDRANT_API_KEY=<qdrant-cloud-api-key>
QDRANT_KNOWLEDGE_COLLECTION=knowledge_chunks
QDRANT_FAQ_COLLECTION=faq_analytics
QDRANT_SEMANTIC_ANSWER_CACHE_COLLECTION=semantic_answer_cache
OPENAI_API_KEY=<openai-api-key>
SECRET_KEY=<jwt-secret>
CORS_ALLOW_ORIGINS=https://<public-vercel-domain>,https://<admin-vercel-domain>
TRUSTED_HOSTS=<railway-api-domain>,healthcheck.railway.app
COOKIE_SECURE=true
API_DOCS_ENABLED=false
UVICORN_WORKERS=1
START_EMBEDDED_WORKER=false
TELEGRAM_POLLING_ENABLED=false
ZALO_POLLING_ENABLED=false
```

`UVICORN_WORKERS=1` is the initial production validation value. Scale it only
after Railway memory/CPU metrics justify more API processes.

Optional feature credentials:

```env
FIRECRAWL_API_KEY=<firecrawl-api-key>
R2_ACCOUNT_ID=<r2-account-id>
R2_ACCESS_KEY_ID=<r2-access-key-id>
R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
R2_BUCKET_NAME=<r2-bucket-name>
R2_PUBLIC_BASE_URL=<r2-public-base-url>
```

Firecrawl is required only for the admin crawl feature. R2 is required for
durable OCR, crawl, and manual-upload artifacts, but not for core chat against
an already-restored PostgreSQL and Qdrant knowledge base.

If Railway gives `DATABASE_URL` with a `postgresql://` prefix, create the app
runtime `DATABASE_URL` with the `postgresql+psycopg://` prefix. The repository
uses `psycopg` in `requirements.txt`, and existing Compose production also uses
that explicit driver.

## Worker service variables

The worker must use the same data and provider variables as the API:

```env
DATABASE_URL=postgresql+psycopg://<railway-postgres-internal-credentials>
REDIS_URL=<railway-redis-internal-url>
QDRANT_HOST=<qdrant-cloud-host-without-https-scheme>
QDRANT_PORT=443
QDRANT_HTTPS=true
QDRANT_API_KEY=<qdrant-cloud-api-key>
QDRANT_KNOWLEDGE_COLLECTION=knowledge_chunks
OPENAI_API_KEY=<openai-api-key>
OCR_TEMP_DIR=/app/data/runtime/admissions-ocr
TELEGRAM_POLLING_ENABLED=false
ZALO_POLLING_ENABLED=false
```

Set `FIRECRAWL_API_KEY` and `R2_*` in the worker only if queued OCR/crawl/upload
jobs are part of the production launch scope.

For Railway, configure the worker service to build from repo root with:

```env
RAILWAY_DOCKERFILE_PATH=Dockerfile.worker
```

Do not build the worker from the `worker/` directory alone. `worker/start.py`
imports `src.*`, so the build context must include the backend source tree.

## Migration strategy

Do not run `alembic upgrade head && uvicorn ...` as the API web start command on
Railway. The web container default command now starts Uvicorn only, so health
checks can come up even if a migration step needs investigation.

For a fresh Railway PostgreSQL database:

1. Restore the PostgreSQL dump or initialize an empty database.
2. Run `alembic upgrade head` as a separate one-off Railway command or inside a
   temporary Railway shell/container with `DATABASE_URL` pointing to the
   migration-capable PostgreSQL role.
3. Start or redeploy the API service.
4. Start or redeploy the worker service.
5. Verify Alembic head and data parity before routing Vercel traffic.

The normal API and worker runtime should use the application DB role where the
selected Railway setup supports separate roles. Do not grant superuser or broad
migration privileges to the normal runtime role unless a human owner explicitly
accepts that tradeoff.

## Data migration

Use the already validated backup artifacts. Do not crawl, re-import, or rebuild
embeddings merely because infrastructure moved.

PostgreSQL:

```text
Restore the custom PostgreSQL dump into Railway PostgreSQL.
Run Alembic to head after restore.
Validate active chunk count is 122.
Validate active VinUni references are 0.
```

Qdrant Cloud:

```text
Upload the existing Qdrant snapshot to the Qdrant Cloud collection snapshot
restore endpoint or Qdrant Cloud console.
Use priority=snapshot for a new target collection.
Validate collection knowledge_chunks has 122 points.
```

If snapshot upload cannot be used for the selected Qdrant Cloud cluster, stop:

```text
HUMAN ACTION REQUIRED - QDRANT DATA MIGRATION METHOD
```

Do not silently rebuild vectors.

## Vercel frontend variables

Public project:

```text
Project: vgu-admissions-public
Root: vite-app
Build: npm run build
Output: dist
VITE_APP_MODE=public
VITE_API_URL=https://<railway-api-domain>/api/
```

Admin project:

```text
Project: vgu-admissions-admin
Root: vite-app
Build: npm run build
Output: dist
VITE_APP_MODE=admin
VITE_API_URL=https://<railway-api-domain>/api/
```

## Required validation before production traffic

```text
API /health returns 200 over Railway HTTPS
Worker connects to Redis and starts the default RQ queue
PostgreSQL Alembic revision is head
PostgreSQL active chunks = 122
Qdrant knowledge_chunks points = 122
VinUni active refs = 0
Real chat smoke passes with citations
Vercel public app can call Railway API
Vercel admin app can login and call protected API
CORS only allows final public/admin Vercel origins
Telegram/Zalo polling disabled unless explicitly using a single-consumer mode
```

## Cleanup gate

Do not remove Caddy, `docker-compose.prod.yml`, or VPS-specific historical
reports until all managed production gates pass:

```text
MANAGED_API = PASS
MANAGED_WORKER = PASS
MANAGED_POSTGRES = PASS
MANAGED_REDIS = PASS
MANAGED_QDRANT = PASS
PG_QDRANT_PARITY = 122/122
PRODUCTION_CHAT_SMOKE = PASS
PERSISTENCE_REDEPLOY = PASS
BACKUP_RECOVERY_PATH = PASS
VERCEL_INTEGRATION = PASS
```

After that, classify active VPS/Caddy files as removable, fallback, shared, or
historical before deleting anything.

## External references checked

- Railway Dockerfile builds: https://docs.railway.com/builds/dockerfiles
- Railway service variables: https://docs.railway.com/variables
- Railway private networking: https://docs.railway.com/networking/private-networking
- Railway PostgreSQL: https://docs.railway.com/databases/postgresql
- Qdrant Cloud setup: https://qdrant.tech/course/essentials/day-0/qdrant-cloud/
- Qdrant snapshots: https://qdrant.tech/documentation/snapshots/
