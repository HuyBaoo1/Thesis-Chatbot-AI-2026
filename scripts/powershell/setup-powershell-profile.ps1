# Setup PowerShell Profile to auto-refresh PATH
Write-Host "Setting up PowerShell Profile..." -ForegroundColor Cyan

# Get profile path
$profilePath = $PROFILE

# Create profile if not exists
if (!(Test-Path -Path $profilePath)) {
    New-Item -ItemType File -Path $profilePath -Force | Out-Null
    Write-Host "Created PowerShell profile at: $profilePath" -ForegroundColor Green
} else {
    Write-Host "PowerShell profile exists at: $profilePath" -ForegroundColor Yellow
}

# Content to add
$contentToAdd = @"

# Auto-refresh PATH on startup (added by setup-powershell-profile.ps1)
`$env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")
"@

# Check if already added
$currentContent = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue

if ($currentContent -notlike "*Auto-refresh PATH*") {
    Add-Content -Path $profilePath -Value $contentToAdd
    Write-Host "Added PATH auto-refresh to profile" -ForegroundColor Green
} else {
    Write-Host "PATH auto-refresh already exists in profile" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done! From now on, every new PowerShell window will auto-refresh PATH." -ForegroundColor Green
Write-Host ""
Write-Host "To apply now (without closing PowerShell):" -ForegroundColor Cyan
Write-Host "  . `$PROFILE" -ForegroundColor White
Write-Host ""

pause
