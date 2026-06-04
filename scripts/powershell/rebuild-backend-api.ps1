. ("$PSScriptRoot\common.ps1")
#!/usr/bin/env pwsh
# Rebuild and restart backend API service

Write-Host "=== Rebuild Backend API ===" -ForegroundColor Cyan
Write-Host ""

$composeFile = "docker-compose.web-crawler-rag.yml"
$envFile = ".env.docker"

# Check if compose file exists
if (-not (Test-Path $composeFile)) {
    Write-Host "ERROR: $composeFile not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Stopping backend-api..." -ForegroundColor Green
Invoke-Compose -f $composeFile --env-file $envFile stop backend-api

Write-Host ""
Write-Host "Step 2: Removing old container..." -ForegroundColor Green
Invoke-Compose -f $composeFile --env-file $envFile rm -f backend-api

Write-Host ""
Write-Host "Step 3: Rebuilding image..." -ForegroundColor Green
Invoke-Compose -f $composeFile --env-file $envFile build --no-cache backend-api

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Starting backend-api..." -ForegroundColor Green
Invoke-Compose -f $composeFile --env-file $envFile up -d backend-api

Write-Host ""
Write-Host "Step 5: Waiting for backend to be ready..." -ForegroundColor Green
Start-Sleep -Seconds 10

# Check if backend is running
$backendRunning = $ContainerRuntime ps --filter "name=backend-api" --format "{{.Names}}" 2>$null
if ($backendRunning) {
    Write-Host ""
    Write-Host "SUCCESS: Backend API rebuilt and running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Backend API: http://localhost:8000" -ForegroundColor Yellow
    Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
    Write-Host "Dashboard: http://localhost:5173" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "View logs:" -ForegroundColor Cyan
    Write-Host "  $ContainerRuntime logs -f web-crawler-rag_backend-api_1" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "ERROR: Backend failed to start!" -ForegroundColor Red
    Write-Host "Check logs:" -ForegroundColor Yellow
    Write-Host "  $ContainerRuntime logs web-crawler-rag_backend-api_1" -ForegroundColor Gray
    exit 1
}
