# Setup GitHub Token for PowerShell
# Run this script once to add token to your PowerShell profile

$token = $env:GITHUB_TOKEN
if (-not $token) {
    Write-Host "ERROR: GITHUB_TOKEN environment variable is not set." -ForegroundColor Red
    Write-Host "Please set it first:" -ForegroundColor Yellow
    Write-Host '  $env:GITHUB_TOKEN = "ghp_your_token_here"' -ForegroundColor White
    exit 1
}

# Check if profile exists
if (!(Test-Path -Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force
    Write-Host "Created PowerShell profile at: $PROFILE" -ForegroundColor Green
}

# Add token to profile
$profileContent = Get-Content $PROFILE -Raw -ErrorAction SilentlyContinue
if ($profileContent -notlike "*GITHUB_TOKEN*") {
    Add-Content -Path $PROFILE -Value "`n# GitHub Token for PR reviews"
    Add-Content -Path $PROFILE -Value "`$env:GITHUB_TOKEN = `"$token`""
    Write-Host "✅ Added GITHUB_TOKEN to PowerShell profile" -ForegroundColor Green
    Write-Host "   Profile location: $PROFILE" -ForegroundColor Cyan
    Write-Host "" 
    Write-Host "⚠️  Please restart PowerShell or run:" -ForegroundColor Yellow
    Write-Host "   . `$PROFILE" -ForegroundColor White
} else {
    Write-Host "✅ GITHUB_TOKEN already exists in profile" -ForegroundColor Green
}

Write-Host ""
Write-Host "Test token:" -ForegroundColor Cyan
Write-Host "   python scripts/python/fetch_pr_reviews.py 2" -ForegroundColor White
