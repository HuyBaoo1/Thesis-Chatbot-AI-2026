. ("$PSScriptRoot\common.ps1")
# Rebuild backend with Sources UI improvements
Write-Host "=== REBUILDING BACKEND WITH SOURCES UI IMPROVEMENTS ===" -ForegroundColor Cyan

# Stop backend
Write-Host "`nStopping backend..." -ForegroundColor Yellow
$ContainerRuntime stop web-crawler-rag_backend-api_1

# Remove old container
Write-Host "Removing old container..." -ForegroundColor Yellow
$ContainerRuntime rm web-crawler-rag_backend-api_1

# Rebuild image
Write-Host "`nRebuilding backend image..." -ForegroundColor Yellow
$ContainerRuntime build -t web-crawler-rag-backend:latest -f services/web-crawler-rag-backend/Dockerfile services/web-crawler-rag-backend

# Start services
Write-Host "`nStarting services..." -ForegroundColor Yellow
Invoke-Compose -f docker-compose.web-crawler-rag.yml up -d

# Wait for backend to start
Write-Host "`nWaiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check backend health
Write-Host "`nChecking backend health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET
    Write-Host "[OK] Backend is healthy!" -ForegroundColor Green
    Write-Host "Status: $($health.status)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Backend health check failed: $_" -ForegroundColor Red
}

Write-Host "`n=== BACKEND REBUILT ===" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Gray
Write-Host "Dashboard: http://localhost:3000" -ForegroundColor Gray
Write-Host "`nRun .\test-sources-ui.ps1 to verify the changes" -ForegroundColor Green
