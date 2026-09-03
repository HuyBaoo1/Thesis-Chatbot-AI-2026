# Production Runbook

This runbook covers the VGU Admissions Intelligence Platform deployment using the repository's existing Docker, FastAPI, PostgreSQL, Redis, Qdrant, RQ worker, crawl, OCR, and knowledge-base architecture.

Do not put secrets in this file. Use `.env.staging` or `.env.production`, both of which are ignored by Git.

## Selected Production Target

The selected managed production path is:

```text
Vercel public/admin frontend
-> Railway FastAPI API
-> Railway RQ worker
-> Railway PostgreSQL
-> Railway Redis
-> Qdrant Cloud
-> Cloudflare R2
```

Use [docs/managed-railway-qdrant-cloud-deployment.md](managed-railway-qdrant-cloud-deployment.md)
as the primary production deployment guide.

The VPS Docker Compose + Caddy path below is retained as a validated fallback
and must not be deleted until the managed Railway path passes API, worker,
PG/Qdrant parity, chat smoke, redeploy persistence, and backup/recovery gates.

## Railway Managed Deployment

Create separate Railway services for `api` and `worker` from the same GitHub
repository. The API uses the root `Dockerfile`; the worker uses
`Dockerfile.worker` and must build from the repo root so `src.*` imports are
available.

API start command is provided by the root Dockerfile:

```text
uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${UVICORN_WORKERS:-1}
```

Worker start command is provided by `Dockerfile.worker`:

```text
python /app/worker/start.py
```

Railway production variables must be set in the Railway service variable UI or
CLI. Do not commit production secrets.

Required API/worker variables include:

```env
DATABASE_URL=postgresql+psycopg://<railway-postgres-internal-credentials>
REDIS_URL=<railway-redis-internal-url>
QDRANT_HOST=<qdrant-cloud-host-without-https-scheme>
QDRANT_PORT=443
QDRANT_HTTPS=true
QDRANT_API_KEY=<qdrant-cloud-api-key>
QDRANT_KNOWLEDGE_COLLECTION=knowledge_chunks
OPENAI_API_KEY=<openai-api-key>
SECRET_KEY=<jwt-secret>
CORS_ALLOW_ORIGINS=https://<public-vercel-domain>,https://<admin-vercel-domain>
TRUSTED_HOSTS=<railway-api-domain>,healthcheck.railway.app
COOKIE_SECURE=true
API_DOCS_ENABLED=false
UVICORN_WORKERS=1
TELEGRAM_POLLING_ENABLED=false
ZALO_POLLING_ENABLED=false
```

For the worker service, set:

```env
RAILWAY_DOCKERFILE_PATH=Dockerfile.worker
```

Do not configure a Railway Qdrant container for the selected target. Qdrant is
hosted by Qdrant Cloud.

## VPS/Caddy Fallback Deployment

Production-like staging should be created as a separate Compose project while the old stack remains available for rollback.

```powershell
$env:COMPOSE_PROJECT_NAME="vgu-admissions-platform-staging"; docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.staging up -d --build
```

Production should use the same override after staging has passed all gates.

```powershell
$env:COMPOSE_PROJECT_NAME="vgu-admissions-platform-prod"; docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build
```

The production override removes fixed legacy container names, keeps PostgreSQL/Redis/Qdrant/API private to the Docker network, starts Caddy as the only public backend entrypoint, starts the API without an embedded worker, starts a dedicated worker with `python /app/worker/start.py`, and mounts crawl/OCR artifacts at `/app/data/runtime/admissions-ocr`.

## Caddy Reverse Proxy (Fallback Path Only)

Caddy runs as a Docker Compose service only for the superseded VPS/Compose fallback path. The selected Railway path uses Railway HTTPS ingress instead of Caddy.

Version-controlled config:

```text
deploy/caddy/Caddyfile
```

Production public ports:

```text
80 -> caddy:80
443 -> caddy:443
```

Internal upstream:

```text
caddy -> api:8000
```

Production `.env.production` must set the real API domain only after DNS points to the VPS:

```env
CADDY_SITE_ADDRESS=api.your-domain.example.com
CADDY_API_UPSTREAM=api:8000
CADDY_HTTP_PORT=80
CADDY_HTTPS_PORT=443
TRUSTED_HOSTS=api.your-domain.example.com
CORS_ALLOW_ORIGINS=https://www.your-domain.example.com,https://admin.your-domain.example.com
COOKIE_SECURE=true
TELEGRAM_POLLING_ENABLED=false
ZALO_POLLING_ENABLED=false
```

Local/staging validation without a real domain can keep:

```env
CADDY_SITE_ADDRESS=:80
TRUSTED_HOSTS=localhost,127.0.0.1
```

In production, `/docs`, `/redoc`, and `/openapi.json` are blocked by Caddy. Keep admin routes protected by the existing application authentication/authorization flow.

## Health Check

For selected Railway production after the API domain is available:

```powershell
curl.exe https://<railway-api-domain>/health
```

Railway health checks require `healthcheck.railway.app` in `TRUSTED_HOSTS`.

For local/staging Caddy fallback validation where `TRUSTED_HOSTS` includes `localhost`:

```powershell
curl.exe http://localhost/health
```

For a VPS fallback host after DNS/TLS cutover:

```powershell
curl.exe https://api.your-domain.example.com/health
```

In the VPS/Caddy fallback stack, the API container itself remains internal. To check API health inside the stack:

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production exec -T api python -c "import urllib.request; r=urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5); print(r.status)"
```

## Migration Strategy

For selected Railway production, run Alembic as a separate deploy step before
normal traffic. Do not put `alembic upgrade head && uvicorn ...` in the Railway
API web start command.

On Railway, use a migration-capable PostgreSQL role and set:

```env
DATABASE_URL=postgresql+psycopg://<railway-postgres-internal-credentials>
```

Then run:

```powershell
alembic upgrade head
```

Only after migration succeeds should the API and worker services be started or
redeployed. Normal API/worker runtime should use the application DB role where
the selected Railway setup supports separate roles.

For the VPS/Caddy fallback path, PostgreSQL is initialized by the official `postgres:16-alpine` entrypoint. The production override mounts:

```text
deploy/postgres/init-app-role.sh
```

That init script creates or updates the application runtime role from `APP_DATABASE_USER` and `APP_DATABASE_PASSWORD`, then grants application privileges without printing secrets.

The VPS/Caddy fallback API production command runs Alembic before starting Uvicorn:

```text
DATABASE_URL="postgresql+psycopg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" alembic upgrade head
```

`POSTGRES_USER` is the migration/init role. `APP_DATABASE_USER` is the normal runtime role used by the app and worker. Do not elevate the runtime role to run migrations.

Alembic migrations are idempotent when the database is already at head. The worker depends on API health, so it starts after the API migration/startup path is healthy.

## Backup

Before staging, production, or destructive KB changes, create a restore-friendly PostgreSQL custom archive outside the container:

```powershell
$ts=Get-Date -Format "yyyyMMdd_HHmmss"; New-Item -ItemType Directory -Force -Path "backups/pre-production/$ts"; docker exec -t <postgres-container> pg_dump -U <migration-role> -d <database-name> -Fc -f /tmp/postgres_$ts.dump; docker cp "<postgres-container>:/tmp/postgres_$ts.dump" "backups/pre-production/$ts/postgres_$ts.dump"; docker exec <postgres-container> rm -f /tmp/postgres_$ts.dump
```

Validate the archive before relying on it:

```powershell
docker run --rm -v "${PWD}/backups/pre-production/$ts/postgres_$ts.dump:/backup/source.dump:ro" postgres:16-alpine pg_restore --list /backup/source.dump
```

Create a Qdrant snapshot for the `knowledge_chunks` collection and save the snapshot artifact outside the container. Do not delete collections during backup.

Copy review/import artifacts into the same timestamped backup folder:

```powershell
$ts=Get-Date -Format "yyyyMMdd_HHmmss"; New-Item -ItemType Directory -Force -Path "backups/pre-production/$ts/crawl-import"; Copy-Item data/vgu_crawl_status.md,data/vgu_crawl_review_inventory.md,data/vgu_field_review_report.md -Destination "backups/pre-production/$ts/crawl-import" -ErrorAction SilentlyContinue; Copy-Item vgu_admissions_import -Destination "backups/pre-production/$ts/crawl-import/vgu_admissions_import" -Recurse -ErrorAction SilentlyContinue
```

The `backups/` directory is ignored by Git. Do not commit backup dumps or Qdrant snapshots.

## Restore Rehearsal

Before managed deployment or fallback VPS deployment, rehearse restore into isolated disposable resources:

- PostgreSQL: restore the custom archive into a temporary `postgres:16-alpine` container with production-compatible role names.
- Qdrant: restore the `knowledge_chunks` snapshot into a temporary `qdrant/qdrant:v1.18.3` container.
- Verify restored PostgreSQL active chunks and Qdrant point counts match.
- Remove only the disposable restore containers. Never restore over staging or production volumes during a rehearsal.

For Qdrant Cloud production, restore the validated snapshot by uploaded file or
the Qdrant Cloud console into `knowledge_chunks`, then verify `122` points. Do
not rebuild embeddings unless a human owner explicitly approves a new data
migration method.

## Rollback

If a critical error appears after new stack validation:

1. Stop routing traffic to the new stack.
2. Route traffic back to the old stack.
3. Stop the new API and worker containers.
4. Restore the previous Caddyfile or Compose config if the reverse proxy caused the failure.
5. Preserve new logs and volumes for investigation.
6. Restore PostgreSQL or Qdrant only if corruption is confirmed.

Do not delete old volumes during the rollback window.

## Secret Rotation

Provider rotation is a manual platform action:

- revoke old OpenAI keys in the OpenAI dashboard;
- revoke old Firecrawl keys in the Firecrawl dashboard;
- revoke old Telegram bot tokens through BotFather;
- regenerate provider-managed Redis credentials if an old password was exposed.

After rotation, update platform variables and redeploy. Validate new credentials without printing values.

## Crawl Workflow

Use only the repository's existing admin crawl flow. Do not add a crawler dependency or alternative pipeline.

Important route detail: content read/update routes include the trailing slash:

```text
GET /api/crawl/page-jobs/{page_job_id}/content/
PUT /api/crawl/page-jobs/{page_job_id}/content/
```

Run only a single-URL Firecrawl validation before broader crawling, and only after old provider credentials are confirmed revoked.

## KB Disable And Re-Index

Before active KB changes, confirm:

- PostgreSQL chunk count matches Qdrant point count;
- active VinUni records equal 0;
- active records are verified;
- artifacts are stored under `/app/data/runtime/admissions-ocr`, not `/tmp`.

Use the existing knowledge-base API/service flow to disable, delete, send-to-KB, or re-index. Do not edit PostgreSQL or Qdrant manually for production data unless doing a documented recovery.

## Worker Restart

The worker must start through:

```text
python /app/worker/start.py
```

The Redis URL must come from environment variables and must not be passed as a process argument.

## Artifact Recovery

Production crawl/OCR artifacts live under:

```text
/app/data/runtime/admissions-ocr
```

In production Compose, this path is backed by the named volume:

```text
crawl_artifacts
```

If an artifact cannot be read, the API should return a clear missing-artifact error instead of silently falling back to stale content.
