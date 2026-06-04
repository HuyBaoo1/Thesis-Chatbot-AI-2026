@echo off
echo ========================================
echo   Web Crawler RAG - Podman Deployment
echo ========================================
echo.

REM Kiểm tra Podman
where podman >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Podman chua duoc cai dat!
    echo Vui long cai dat Podman truoc: https://podman.io/
    pause
    exit /b 1
)

echo [1/4] Kiem tra Firecrawl...
echo.
echo Firecrawl can chay RIENG trong repo da clone.
echo Neu chua setup Firecrawl, vui long:
echo   1. git clone https://github.com/mendableai/firecrawl.git firecrawl-repo
echo   2. cd firecrawl-repo
echo   3. copy .env.example .env
echo   4. Sua OPENAI_API_KEY va BULL_AUTH_KEY trong .env
echo   5. docker-compose up -d
echo.
set /p FIRECRAWL_READY="Da chay Firecrawl chua? (y/n): "
if /i not "%FIRECRAWL_READY%"=="y" (
    echo.
    echo Vui long setup Firecrawl truoc roi chay lai script nay.
    pause
    exit /b 0
)

echo.
echo [2/4] Dung cac container cu (neu co)...
docker-compose -f docker-compose.web-crawler-rag.yml down

echo.
echo [3/4] Khoi dong Web Crawler RAG stack...
docker-compose --env-file .env.docker -f docker-compose.web-crawler-rag.yml up -d --build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Khoi dong that bai!
    pause
    exit /b 1
)

echo.
echo [4/4] Kiem tra trang thai...
timeout /t 5 /nobreak >nul
docker-compose -f docker-compose.web-crawler-rag.yml ps

echo.
echo ========================================
echo   THANH CONG! He thong dang chay
echo ========================================
echo.
echo Services:
echo   - Backend API:    http://localhost:8000
echo   - API Docs:       http://localhost:8000/docs
echo   - Qdrant UI:      http://localhost:6335/dashboard
echo   - PostgreSQL:     localhost:5433
echo   - Redis:          localhost:6379
echo.
echo Tiep theo:
echo   1. cd services\web-crawler-rag-dashboard
echo   2. npm install (neu chua cai)
echo   3. npm run dev
echo   4. Mo Dashboard: http://localhost:5173
echo.
echo Xem logs:
echo   docker-compose -f docker-compose.web-crawler-rag.yml logs -f
echo.
echo Dung he thong:
echo   docker-compose -f docker-compose.web-crawler-rag.yml down
echo.
pause
