. ("$PSScriptRoot\common.ps1")
# Diagnose backend issues
Write-Host "=== Backend Diagnosis ===" -ForegroundColor Cyan

Write-Host "`n1. Checking if backend container is running..." -ForegroundColor Yellow
$running = $ContainerRuntime ps --filter name=backend --format "{{.Names}}"
if ($running) {
    Write-Host "   Container running: $running" -ForegroundColor Green
} else {
    Write-Host "   Container NOT running!" -ForegroundColor Red
    Write-Host "   Checking stopped containers..." -ForegroundColor Yellow
    $ContainerRuntime ps -a --filter name=backend --format "{{.Names}} - {{.Status}}"
    exit 1
}

Write-Host "`n2. Testing backend health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 3
    Write-Host "   Health: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   Health check FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Backend is not responding!" -ForegroundColor Red
}

Write-Host "`n3. Checking backend logs for errors..." -ForegroundColor Yellow
Write-Host "   Last 30 lines:" -ForegroundColor Gray
$ContainerRuntime logs --tail 30 web-crawler-rag_backend-api_1

Write-Host "`n4. Checking for Python errors..." -ForegroundColor Yellow
$errors = $ContainerRuntime logs --tail 100 web-crawler-rag_backend-api_1 2>&1 | Select-String -Pattern "Error|ERROR|Exception|Traceback|Failed" -Context 1
if ($errors) {
    Write-Host "   Found errors:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host $_.Line -ForegroundColor Red }
} else {
    Write-Host "   No obvious errors found" -ForegroundColor Green
}

Write-Host "`n5. Testing CORS with curl..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -Headers @{"Origin"="http://localhost:3000"} -UseBasicParsing
    $corsHeader = $response.Headers["Access-Control-Allow-Origin"]
    Write-Host "   CORS Header: $corsHeader" -ForegroundColor Cyan
} catch {
    Write-Host "   CORS test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Diagnosis Complete ===" -ForegroundColor Cyan
