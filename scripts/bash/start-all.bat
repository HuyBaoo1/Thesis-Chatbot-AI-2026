@echo off
REM Script khởi động tất cả services cho Web Crawler RAG Chatbot
REM Dành cho Windows

echo ========================================
echo   Web Crawler RAG Chatbot - Start All
echo ========================================
echo.

REM Kiểm tra Docker
echo [1/4] Kiểm tra Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker chua duoc cai dat!
    echo Vui long cai dat Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo OK: Docker da san sang
echo.

REM Kiểm tra file .env.docker
echo [2/4] Kiểm tra cấu hình...
if not exist .env.docker (
    echo WARNING: File .env.docker khong ton tai!
    echo Dang tao tu .env.example...
    copy .env.example .env.docker
    echo.
    echo QUAN TRONG: Vui long chinh sua .env.docker va them OPENAI_API_KEY
    echo Sau do chay lai script nay.
    pause
    exit /b 1
)

REM Kiểm tra OPENAI_API_KEY
findstr /C:"OPENAI_API_KEY=sk-" .env.docker >nul
if errorlevel 1 (
    echo WARNING: OPENAI_API_KEY chua duoc cau hinh trong .env.docker
    echo Vui long them OPENAI_API_KEY=sk-your-key-here vao file .env.docker
    pause
    exit /b 1
)
echo OK: Cau hinh da san sang
echo.

REM Khởi động Docker services
echo [3/4] Khoi dong Backend services (Docker)...
echo Dang khoi dong: PostgreSQL, Redis, Qdrant, Backend API, Celery Worker...
docker compose --env-file .env.docker -f docker-compose.web-crawler-rag.yml up -d --build

if errorlevel 1 (
    echo ERROR: Khoi dong Docker services that bai!
    pause
    exit /b 1
)

echo OK: Backend services da khoi dong
echo.
echo Cho 10 giay de services khoi dong hoan toan...
timeout /t 10 /nobreak >nul
echo.

REM Kiểm tra Backend health
echo Kiem tra Backend API...
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo WARNING: Backend API chua san sang. Vui long doi them it giay...
) else (
    echo OK: Backend API da san sang
)
echo.

REM Khởi động Dashboard
echo [4/4] Khoi dong Dashboard (React)...
cd services\web-crawler-rag-dashboard

REM Kiểm tra node_modules
if not exist node_modules (
    echo Dang cai dat dependencies lan dau...
    call npm install
    if errorlevel 1 (
        echo ERROR: Cai dat dependencies that bai!
        cd ..\..
        pause
        exit /b 1
    )
)

REM Kiểm tra .env
if not exist .env (
    echo Tao file .env cho Dashboard...
    copy .env.example .env
)

echo.
echo Khoi dong Dashboard...
echo Dashboard se mo tai: http://localhost:5173
echo.
echo ========================================
echo   TAT CA SERVICES DA KHOI DONG!
echo ========================================
echo.
echo Cac URL quan trong:
echo   - Dashboard:     http://localhost:5173
echo   - API Docs:      http://localhost:8000/docs
echo   - API Health:    http://localhost:8000/health
echo   - Qdrant UI:     http://localhost:6335/dashboard
echo.
echo De dung tat ca services, nhan Ctrl+C va chay: stop-all.bat
echo.
echo Dang khoi dong Dashboard...
echo.

start cmd /k "npm run dev"

cd ..\..

echo.
echo Dashboard dang chay trong cua so terminal moi.
echo Giu cua so nay mo de xem logs cua Docker services.
echo.
echo Nhan Ctrl+C de xem logs, hoac dong cua so nay.
pause
