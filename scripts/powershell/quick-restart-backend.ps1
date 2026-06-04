. ("$PSScriptRoot\common.ps1")
# Quick restart backend container
Write-Host "Restarting backend..." -ForegroundColor Yellow
$ContainerRuntime restart web-crawler-rag_backend-api_1

Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Checking health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health"
    Write-Host "Backend is healthy!" -ForegroundColor Green
    Write-Host "Status: $($health.status)" -ForegroundColor Cyan
} catch {
    Write-Host "Health check failed, showing logs..." -ForegroundColor Red
    $ContainerRuntime logs --tail 30 web-crawler-rag_backend-api_1
}
