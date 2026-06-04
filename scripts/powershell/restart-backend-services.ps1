# Restart backend services with new image
. "$PSScriptRoot\common.ps1"

Write-Host "Starting backend-api..." -ForegroundColor Green
& $ContainerRuntime run -d `
    --name web-crawler-rag_backend-api_1 `
    --network web-crawler-rag_rag-net `
    -p 8000:8000 `
    -v "${PWD}/services/web-crawler-rag-backend:/app" `
    --env-file .env.docker `
    -e "DATABASE_URL=postgresql+psycopg://app:app_password@web-crawler-rag_app-postgres_1:5432/app_db" `
    -e "CELERY_BROKER_URL=redis://web-crawler-rag_redis_1:6379/0" `
    -e "CELERY_RESULT_BACKEND=redis://web-crawler-rag_redis_1:6379/1" `
    -e "QDRANT_URL=http://web-crawler-rag_qdrant_1:6333" `
    --add-host="host.docker.internal:host-gateway" `
    localhost/web-crawler-rag_backend-api:latest `
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1

Write-Host "Starting celery-worker..." -ForegroundColor Green
& $ContainerRuntime run -d `
    --name web-crawler-rag_celery-worker_1 `
    --network web-crawler-rag_rag-net `
    -v "${PWD}/services/web-crawler-rag-backend:/app" `
    --env-file .env.docker `
    -e "DATABASE_URL=postgresql+psycopg://app:app_password@web-crawler-rag_app-postgres_1:5432/app_db" `
    -e "CELERY_BROKER_URL=redis://web-crawler-rag_redis_1:6379/0" `
    -e "CELERY_RESULT_BACKEND=redis://web-crawler-rag_redis_1:6379/1" `
    -e "QDRANT_URL=http://web-crawler-rag_qdrant_1:6333" `
    --add-host="host.docker.internal:host-gateway" `
    localhost/web-crawler-rag_celery-worker:latest `
    celery -A app.celery_app worker --loglevel=info --pool=solo --without-heartbeat --without-gossip --without-mingle

Write-Host "`nServices started!" -ForegroundColor Green
Write-Host "Check logs with:" -ForegroundColor Yellow
Write-Host "  $ContainerRuntime logs web-crawler-rag_backend-api_1" -ForegroundColor Cyan
Write-Host "  $ContainerRuntime logs web-crawler-rag_celery-worker_1" -ForegroundColor Cyan
