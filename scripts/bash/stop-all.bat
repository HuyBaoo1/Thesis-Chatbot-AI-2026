@echo off
REM Script dừng tất cả services cho Web Crawler RAG Chatbot
REM Dành cho Windows

echo ========================================
echo   Web Crawler RAG Chatbot - Stop All
echo ========================================
echo.

echo [1/2] Dung Docker services...
docker compose -f docker-compose.web-crawler-rag.yml down

if errorlevel 1 (
    echo WARNING: Co loi khi dung Docker services
) else (
    echo OK: Docker services da dung
)
echo.

echo [2/2] Dung Dashboard...
echo Vui long dong cua so terminal cua Dashboard (npm run dev)
echo hoac nhan Ctrl+C trong cua so do.
echo.

echo ========================================
echo   TAT CA SERVICES DA DUNG!
echo ========================================
echo.
echo De khoi dong lai, chay: start-all.bat
echo.
pause
