#!/usr/bin/env pwsh
# Restart dashboard to apply tracking changes

Write-Host "=== Restarting Dashboard ===" -ForegroundColor Cyan

# Check if dashboard is running
$dashboardProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*web-crawler-rag-dashboard*" }

if ($dashboardProcess) {
    Write-Host "Stopping dashboard..." -ForegroundColor Yellow
    $dashboardProcess | Stop-Process -Force
    Start-Sleep -Seconds 2
}

Write-Host "Starting dashboard..." -ForegroundColor Green
Set-Location services/web-crawler-rag-dashboard

# Start in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Minimized

Write-Host ""
Write-Host "✅ Dashboard starting..." -ForegroundColor Green
Write-Host ""
Write-Host "Wait 5 seconds then open:" -ForegroundColor Cyan
Write-Host "  http://localhost:5173/analytics" -ForegroundColor White
Write-Host ""
Write-Host "Check browser console for tracking logs!" -ForegroundColor Yellow

Set-Location ../..
