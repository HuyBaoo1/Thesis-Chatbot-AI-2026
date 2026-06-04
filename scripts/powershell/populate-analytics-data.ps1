#!/usr/bin/env pwsh
# Populate analytics tables from existing conversation data

Write-Host "=== Populate Analytics Data ===" -ForegroundColor Cyan
Write-Host ""

# Check if backend container is running
$backendRunning = docker ps --filter "name=backend-api" --format "{{.Names}}" 2>$null
if (-not $backendRunning) {
    Write-Host "ERROR: Backend container is not running!" -ForegroundColor Red
    Write-Host "Please start the backend first:" -ForegroundColor Yellow
    Write-Host "  .\start-web-crawler-rag.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Running analytics data population script..." -ForegroundColor Green
docker exec backend-api python scripts/populate_analytics_data.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS: Analytics data populated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now view the analytics dashboard at:" -ForegroundColor Cyan
    Write-Host "  http://localhost:5173/analytics" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "API endpoints available:" -ForegroundColor Cyan
    Write-Host "  - Hot Questions: http://localhost:8000/api/v1/dashboard/hot-questions?from=2024-01-01&to=2024-12-31" -ForegroundColor Yellow
    Write-Host "  - Conversion Funnel: http://localhost:8000/api/v1/dashboard/conversion-funnel?from=2024-01-01&to=2024-12-31" -ForegroundColor Yellow
    Write-Host "  - Leads: http://localhost:8000/api/v1/dashboard/leads?from=2024-01-01&to=2024-12-31" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "ERROR: Failed to populate analytics data!" -ForegroundColor Red
    Write-Host "Check the logs above for details." -ForegroundColor Yellow
    exit 1
}
