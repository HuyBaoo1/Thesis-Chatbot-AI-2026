. ("$PSScriptRoot\common.ps1")
#!/usr/bin/env pwsh
# Fix network issue and start services (Podman)

Write-Host "Fixing network issue..." -ForegroundColor Cyan

# Stop all services
Write-Host "Stopping services..." -ForegroundColor Yellow
Invoke-Compose -f docker-compose.web-crawler-rag.yml down 2>$null

# Remove the problematic network
Write-Host "Removing old network..." -ForegroundColor Yellow
$ContainerRuntime network rm web-crawler-rag_rag-net 2>$null

# Start services (will recreate network)
Write-Host "Starting services..." -ForegroundColor Green
Invoke-Compose -f docker-compose.web-crawler-rag.yml up -d

Write-Host ""
Write-Host "Done! Services started." -ForegroundColor Green
Write-Host "Now run: .\get-dashboard-data.ps1" -ForegroundColor Cyan
