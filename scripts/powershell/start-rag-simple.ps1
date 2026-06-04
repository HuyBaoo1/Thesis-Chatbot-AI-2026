. ("$PSScriptRoot\common.ps1")
# Start Web Crawler RAG (Simple version)
Write-Host "Starting Web Crawler RAG..." -ForegroundColor Cyan

# Stop old containers
Write-Host "Stopping old containers..." -ForegroundColor Yellow
Invoke-Compose -f docker-compose.web-crawler-rag.yml down 2>$null

# Start new containers
Write-Host "Starting containers..." -ForegroundColor Yellow
Invoke-Compose --env-file .env.docker -f docker-compose.web-crawler-rag.yml up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! Services running:" -ForegroundColor Green
    Write-Host "  Backend API: http://localhost:8000" -ForegroundColor White
    Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor White
    Write-Host "  Qdrant: http://localhost:6335/dashboard" -ForegroundColor White
    Write-Host ""
    Write-Host "Check status: $ContainerCompose -f docker-compose.web-crawler-rag.yml ps" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: Failed to start!" -ForegroundColor Red
}

pause
