. ("$PSScriptRoot\common.ps1")
# Force restart backend with new CORS config
Write-Host "=== Force Restart Backend ===" -ForegroundColor Cyan

Write-Host "`n1. Stopping backend..." -ForegroundColor Yellow
$ContainerRuntime stop web-crawler-rag_backend-api_1 2>$null

Write-Host "2. Removing container..." -ForegroundColor Yellow
$ContainerRuntime rm web-crawler-rag_backend-api_1 2>$null

Write-Host "3. Rebuilding image..." -ForegroundColor Yellow
$ContainerRuntime build -t web-crawler-rag-backend -f services/web-crawler-rag-backend/Dockerfile services/web-crawler-rag-backend

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "4. Starting backend..." -ForegroundColor Yellow
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
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1

Write-Host "5. Waiting for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "6. Testing health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5
    Write-Host "   Backend is healthy!" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Cyan
} catch {
    Write-Host "   Health check failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n   Showing logs:" -ForegroundColor Yellow
    $ContainerRuntime logs --tail 50 web-crawler-rag_backend-api_1
    exit 1
}

Write-Host "7. Testing CORS..." -ForegroundColor Yellow
try {
    $headers = @{
        "Origin" = "http://localhost:3000"
        "X-API-Key" = "test-api-key-12345"
    }
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Headers $headers -Method OPTIONS
    $corsHeader = $response.Headers["Access-Control-Allow-Origin"]
    Write-Host "   CORS Header: $corsHeader" -ForegroundColor Cyan
    
    if ($corsHeader -eq "http://localhost:3000") {
        Write-Host "   CORS is configured correctly!" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: CORS header is '$corsHeader', expected 'http://localhost:3000'" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   CORS test failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n=== Backend is ready! ===" -ForegroundColor Green
Write-Host "API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "`nPlease refresh the dashboard (Ctrl+F5) to clear cache" -ForegroundColor Yellow
