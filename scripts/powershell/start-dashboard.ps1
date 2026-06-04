# Start dashboard
Write-Host "=== STARTING DASHBOARD ===" -ForegroundColor Cyan

# Navigate to dashboard directory
Set-Location services/web-crawler-rag-dashboard

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Start dashboard
Write-Host "`nStarting dashboard on http://localhost:3000..." -ForegroundColor Yellow
npm run dev

# Return to root
Set-Location ../..
