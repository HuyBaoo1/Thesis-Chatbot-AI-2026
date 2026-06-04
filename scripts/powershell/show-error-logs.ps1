. ("$PSScriptRoot\common.ps1")
# Show recent error logs
Write-Host "=== Recent Backend Logs (Last 50 lines) ===" -ForegroundColor Cyan
$ContainerRuntime logs --tail 50 web-crawler-rag_backend-api_1

Write-Host "`n=== Filtering for Errors ===" -ForegroundColor Yellow
$ContainerRuntime logs --tail 100 web-crawler-rag_backend-api_1 2>&1 | Select-String -Pattern "Error|ERROR|Exception|Traceback|500" -Context 3
