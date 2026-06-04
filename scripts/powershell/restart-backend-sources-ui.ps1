. ("$PSScriptRoot\common.ps1")
# Restart backend with Sources UI improvements
Write-Host "=== RESTARTING BACKEND WITH SOURCES UI IMPROVEMENTS ===" -ForegroundColor Cyan

# Get container name
$containerName = "web-crawler-rag_backend-api_1"

# Stop backend
Write-Host "`nStopping backend container..." -ForegroundColor Yellow
$ContainerRuntime stop $containerName

# Start backend with DEBUG mode
Write-Host "Starting backend with DEBUG=true..." -ForegroundColor Yellow
$ContainerRuntime start $containerName

# Wait for backend to start
Write-Host "`nWaiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check backend health
Write-Host "`nChecking backend health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET
    Write-Host "Backend is healthy!" -ForegroundColor Green
    Write-Host "Status: $($health.status)" -ForegroundColor Gray
} catch {
    Write-Host "Backend health check failed: $_" -ForegroundColor Red
}

Write-Host "`n=== BACKEND RESTARTED ===" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Gray
Write-Host "Dashboard: http://localhost:3000" -ForegroundColor Gray
Write-Host "`nTest the improved Sources UI in the chat!" -ForegroundColor Green
