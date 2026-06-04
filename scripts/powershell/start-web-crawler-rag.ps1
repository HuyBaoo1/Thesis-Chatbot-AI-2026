. ("$PSScriptRoot\common.ps1")
# Web Crawler RAG - $ContainerRuntime Deployment (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Web Crawler RAG - $ContainerRuntime Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra container runtime
try {
    $runtimeVersion = & $ContainerRuntime --version
    Write-Host "[OK] $ContainerRuntime : $runtimeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] $ContainerRuntime chưa được cài đặt hoặc không có trong PATH!" -ForegroundColor Red
    Write-Host "Vui lòng cài đặt Docker (https://docker.com) hoặc Podman (https://podman.io/)" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host ""
Write-Host "[1/4] Kiểm tra Firecrawl..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Firecrawl cần chạy RIÊNG trong repo đã clone." -ForegroundColor Cyan
Write-Host "Nếu chưa setup Firecrawl, vui lòng:" -ForegroundColor Cyan
Write-Host "  1. git clone https://github.com/mendableai/firecrawl.git firecrawl-repo" -ForegroundColor White
Write-Host "  2. cd firecrawl-repo" -ForegroundColor White
Write-Host "  3. copy .env.example .env" -ForegroundColor White
Write-Host "  4. Sửa OPENAI_API_KEY và BULL_AUTH_KEY trong .env" -ForegroundColor White
Write-Host "  5. $ContainerCompose up -d" -ForegroundColor White
Write-Host ""

$firecrawlReady = Read-Host "Đã chạy Firecrawl chưa? (y/n)"
if ($firecrawlReady -ne "y") {
    Write-Host ""
    Write-Host "Vui lòng setup Firecrawl trước rồi chạy lại script này." -ForegroundColor Yellow
    pause
    exit 0
}

Write-Host ""
Write-Host "[2/4] Dừng các container cũ (nếu có)..." -ForegroundColor Yellow
Invoke-Compose -f docker-compose.web-crawler-rag.yml down 2>$null

Write-Host ""
Write-Host "[3/4] Khởi động Web Crawler RAG stack..." -ForegroundColor Yellow
Invoke-Compose --env-file .env.docker -f docker-compose.web-crawler-rag.yml up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Khởi động thất bại!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "[4/4] Kiểm tra trạng thái..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Invoke-Compose -f docker-compose.web-crawler-rag.yml ps

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   THÀNH CÔNG! Hệ thống đang chạy" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  - Backend API:    http://localhost:8000" -ForegroundColor White
Write-Host "  - API Docs:       http://localhost:8000/docs" -ForegroundColor White
Write-Host "  - Qdrant UI:      http://localhost:6335/dashboard" -ForegroundColor White
Write-Host "  - PostgreSQL:     localhost:5433" -ForegroundColor White
Write-Host "  - Redis:          localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "Tiếp theo:" -ForegroundColor Cyan
Write-Host "  1. cd services\web-crawler-rag-dashboard" -ForegroundColor White
Write-Host "  2. npm install (nếu chưa cài)" -ForegroundColor White
Write-Host "  3. npm run dev" -ForegroundColor White
Write-Host "  4. Mở Dashboard: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Xem logs:" -ForegroundColor Cyan
Write-Host "  $ContainerCompose -f docker-compose.web-crawler-rag.yml logs -f" -ForegroundColor White
Write-Host ""
Write-Host "Dừng hệ thống:" -ForegroundColor Cyan
Write-Host "  $ContainerCompose -f docker-compose.web-crawler-rag.yml down" -ForegroundColor White
Write-Host ""
pause
