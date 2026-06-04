. ("$PSScriptRoot\common.ps1")
#!/usr/bin/env pwsh
# Clear Python cache and rebuild backend (Podman)

Write-Host "Clearing Python cache..." -ForegroundColor Cyan

# Stop backend container
Write-Host "Stopping backend container..." -ForegroundColor Yellow
Invoke-Compose -f docker-compose.web-crawler-rag.yml stop backend-api

# Remove Python cache files from host
Write-Host "Removing __pycache__ directories..." -ForegroundColor Yellow
Get-ChildItem -Path "services/web-crawler-rag-backend" -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
Get-ChildItem -Path "services/web-crawler-rag-backend" -Recurse -File -Filter "*.pyc" | Remove-Item -Force

# Remove container to force fresh start
Write-Host "Removing backend container..." -ForegroundColor Yellow
Invoke-Compose -f docker-compose.web-crawler-rag.yml rm -f backend-api

# Rebuild and start
Write-Host "Rebuilding backend..." -ForegroundColor Green
Invoke-Compose -f docker-compose.web-crawler-rag.yml build --no-cache backend-api

Write-Host "Starting backend..." -ForegroundColor Green
Invoke-Compose -f docker-compose.web-crawler-rag.yml up -d backend-api

# Wait for backend to be ready
Write-Host "Waiting for backend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check logs
Write-Host ""
Write-Host "Backend logs:" -ForegroundColor Cyan
Invoke-Compose -f docker-compose.web-crawler-rag.yml logs --tail=50 backend-api

Write-Host ""
Write-Host "Done! Python cache cleared and backend restarted." -ForegroundColor Green
Write-Host "Now run: .\get-dashboard-data.ps1" -ForegroundColor Cyan
