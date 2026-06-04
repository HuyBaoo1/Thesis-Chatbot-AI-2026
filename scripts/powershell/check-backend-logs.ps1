. ("$PSScriptRoot\common.ps1")
# Check backend logs for errors
Write-Host "=== Backend Logs (Last 100 lines) ===" -ForegroundColor Cyan
$ContainerRuntime logs --tail 100 web-crawler-rag_backend-api_1

Write-Host "`n=== Filtering for Errors ===" -ForegroundColor Yellow
$ContainerRuntime logs --tail 100 web-crawler-rag_backend-api_1 2>&1 | Select-String -Pattern "error|Error|ERROR|Traceback|Exception|Failed|failed" -Context 2
