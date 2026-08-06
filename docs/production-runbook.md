# Production Runbook

This runbook covers the VGU Admissions Intelligence Platform deployment using the repository's existing Docker, FastAPI, PostgreSQL, Redis, Qdrant, RQ worker, crawl, OCR, and knowledge-base architecture.

Do not put secrets in this file. Use `.env.staging` or `.env.production`, both of which are ignored by Git.

## Deployment

Production-like staging should be created as a separate Compose project while the old stack remains available for rollback.

```powershell
$env:COMPOSE_PROJECT_NAME="vgu-admissions-platform-staging"; docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.staging up -d --build
```

Production should use the same override after staging has passed all gates.

```powershell
$env:COMPOSE_PROJECT_NAME="vgu-admissions-platform-prod"; docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build
```

The production override removes fixed legacy container names, keeps PostgreSQL/Redis/Qdrant private to the Docker network, starts the API without an embedded worker, starts a dedicated worker with `python /app/worker/start.py`, and mounts crawl/OCR artifacts at `/app/data/runtime/admissions-ocr`.

## Health Check

```powershell
curl.exe http://localhost:8000/health
```

For a production host, run the same check through the HTTPS public API endpoint after reverse proxy cutover.

## Backup

Before staging, production, or destructive KB changes:

```powershell
$ts=Get-Date -Format "yyyyMMdd_HHmmss"; New-Item -ItemType Directory -Force -Path "backups/pre-production/$ts"; docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "backups/pre-production/$ts/postgres_$ts.sql"
```

Create a Qdrant snapshot for the `knowledge_chunks` collection and save only snapshot metadata in the backup folder. Do not delete collections during backup.

Copy review/import artifacts into the same timestamped backup folder:

```powershell
$ts=Get-Date -Format "yyyyMMdd_HHmmss"; New-Item -ItemType Directory -Force -Path "backups/pre-production/$ts/crawl-import"; Copy-Item data/vgu_crawl_status.md,data/vgu_crawl_review_inventory.md,data/vgu_field_review_report.md -Destination "backups/pre-production/$ts/crawl-import" -ErrorAction SilentlyContinue; Copy-Item vgu_admissions_import -Destination "backups/pre-production/$ts/crawl-import/vgu_admissions_import" -Recurse -ErrorAction SilentlyContinue
```

## Rollback

If a critical error appears after new stack validation:

1. Stop routing traffic to the new stack.
2. Route traffic back to the old stack.
3. Stop the new API and worker containers.
4. Preserve new logs and volumes for investigation.
5. Restore PostgreSQL or Qdrant only if corruption is confirmed.

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
