. ("$PSScriptRoot\common.ps1")
# Full restart of backend with proper setup
Write-Host "=== Stopping all backend services ===" -ForegroundColor Yellow
$ContainerRuntime stop web-crawler-rag_backend-api_1 2>$null
$ContainerRuntime stop web-crawler-rag_celery-worker_1 2>$null

Write-Host "=== Removing old containers ===" -ForegroundColor Yellow
$ContainerRuntime rm web-crawler-rag_backend-api_1 2>$null
$ContainerRuntime rm web-crawler-rag_celery-worker_1 2>$null

Write-Host "=== Rebuilding backend image ===" -ForegroundColor Yellow
$ContainerRuntime build -t web-crawler-rag-backend -f services/web-crawler-rag-backend/Dockerfile services/web-crawler-rag-backend

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "=== Starting backend API ===" -ForegroundColor Yellow
$ContainerRuntime run -d --name web-crawler-rag_backend-api_1 `
  --network web-crawler-rag_rag-net `
  -p 8000:8000 `
  --env-file .env.docker `
  -e "DATABASE_URL=postgresql+psycopg://app:app_password@web-crawler-rag_app-postgres_1:5432/app_db" `
  -e "CELERY_BROKER_URL=redis://web-crawler-rag_redis_1:6379/0" `
  -e "CELERY_RESULT_BACKEND=redis://web-crawler-rag_redis_1:6379/1" `
  -e "QDRANT_URL=http://web-crawler-rag_qdrant_1:6333" `
  -v "${PWD}/services/web-crawler-rag-backend:/app" `
  localhost/web-crawler-rag-backend `
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --reload

Write-Host "=== Waiting for backend to start ===" -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "=== Checking backend health ===" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5
    Write-Host "Backend is healthy!" -ForegroundColor Green
    Write-Host "Status: $($health.status)" -ForegroundColor Cyan
} catch {
    Write-Host "Backend health check failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nShowing logs:" -ForegroundColor Yellow
    $ContainerRuntime logs --tail 50 web-crawler-rag_backend-api_1
    exit 1
}

Write-Host "`n=== Checking recent logs ===" -ForegroundColor Yellow
$ContainerRuntime logs --tail 20 web-crawler-rag_backend-api_1

Write-Host "`nBackend is ready!" -ForegroundColor Green
Write-Host "API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Docs: http://localhost:8000/docs" -ForegroundColor Cyan
