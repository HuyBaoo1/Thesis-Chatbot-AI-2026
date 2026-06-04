. ("$PSScriptRoot\common.ps1")
#!/usr/bin/env pwsh
# Quick restart backend API (uses volume mount, no rebuild needed)

Write-Host "=== Restart Backend API ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Restarting backend-api container..." -ForegroundColor Green
$ContainerRuntime restart web-crawler-rag_backend-api_1

Write-Host ""
Write-Host "Waiting for backend to be ready..." -ForegroundColor Green
Start-Sleep -Seconds 5

# Check if backend is running
$backendRunning = $ContainerRuntime ps --filter "name=backend-api" --format "{{.Names}}" 2>$null
if ($backendRunning) {
    Write-Host ""
    Write-Host "SUCCESS: Backend API restarted!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Backend API: http://localhost:8000" -ForegroundColor Yellow
    Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Test dashboard APIs:" -ForegroundColor Cyan
    Write-Host "  .\get-dashboard-data.ps1" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "ERROR: Backend failed to start!" -ForegroundColor Red
    Write-Host "Check logs:" -ForegroundColor Yellow
    Write-Host "  $ContainerRuntime logs web-crawler-rag_backend-api_1" -ForegroundColor Gray
    exit 1
}
