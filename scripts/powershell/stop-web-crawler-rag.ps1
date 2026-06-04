. ("$PSScriptRoot\common.ps1")
# Dừng Web Crawler RAG
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Dừng Web Crawler RAG" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Invoke-Compose -f docker-compose.web-crawler-rag.yml down

Write-Host ""
Write-Host "Đã dừng tất cả services!" -ForegroundColor Green
Write-Host ""
pause
