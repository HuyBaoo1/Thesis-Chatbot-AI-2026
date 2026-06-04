. ("$PSScriptRoot\common.ps1")
# Simple restart - just restart container
Write-Host "Restarting backend container..." -ForegroundColor Yellow
$ContainerRuntime restart web-crawler-rag_backend-api_1

Write-Host "Waiting 8 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 8

Write-Host "Testing..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health"
    Write-Host "Backend OK: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nNow refresh dashboard with Ctrl+Shift+R (hard refresh)" -ForegroundColor Cyan
