. ("$PSScriptRoot\common.ps1")
# Rebuild and restart backend with code changes
Write-Host "Stopping backend services..." -ForegroundColor Yellow
$ContainerRuntime stop web-crawler-rag_backend-api_1 2>$null
$ContainerRuntime stop web-crawler-rag_celery-worker_1 2>$null

Write-Host "Removing old containers..." -ForegroundColor Yellow
$ContainerRuntime rm web-crawler-rag_backend-api_1 2>$null
$ContainerRuntime rm web-crawler-rag_celery-worker_1 2>$null

Write-Host "Rebuilding backend image..." -ForegroundColor Yellow
$ContainerRuntime build -t web-crawler-rag-backend -f services/web-crawler-rag-backend/Dockerfile services/web-crawler-rag-backend

Write-Host "Starting services..." -ForegroundColor Yellow
Invoke-Compose -f docker-compose.web-crawler-rag.yml up -d backend-api celery-worker

Write-Host "Done! Waiting for services to be ready..." -ForegroundColor Green
Start-Sleep -Seconds 5

Write-Host "Testing health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health"
    Write-Host "Backend is ready!" -ForegroundColor Green
    Write-Host "Status: $($health.status)" -ForegroundColor Cyan
} catch {
    Write-Host "Backend not ready yet, please wait a moment..." -ForegroundColor Yellow
}
