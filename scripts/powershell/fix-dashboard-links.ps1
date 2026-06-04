# Fix dashboard links - Force rebuild and clear cache
Write-Host "=== FIXING DASHBOARD LINKS ===" -ForegroundColor Cyan

# Navigate to dashboard
Set-Location services/web-crawler-rag-dashboard

# Kill any running node processes
Write-Host "`nStopping any running dashboard processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node" -and $_.Path -like "*web-crawler-rag-dashboard*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear build cache
Write-Host "Clearing build cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "Cleared .next directory" -ForegroundColor Green
}

if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force node_modules/.cache
    Write-Host "Cleared node_modules cache" -ForegroundColor Green
}

# Start dashboard
Write-Host "`nStarting dashboard..." -ForegroundColor Yellow
Write-Host "Dashboard will be available at http://localhost:3000" -ForegroundColor Cyan
Write-Host "After it starts, open browser and press Ctrl+Shift+R to hard refresh" -ForegroundColor Yellow
Write-Host ""

npm run dev

# Return to root
Set-Location ../..
