. ("$PSScriptRoot\common.ps1")
# Watch logs in real-time
Write-Host "Watching backend logs (Ctrl+C to stop)..." -ForegroundColor Cyan
Write-Host "Now try to send a message in the dashboard" -ForegroundColor Yellow
Write-Host ""
$ContainerRuntime logs -f web-crawler-rag_backend-api_1
