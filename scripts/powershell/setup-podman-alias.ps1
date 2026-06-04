. ("$PSScriptRoot\common.ps1")
# Setup $ContainerRuntime aliases for PowerShell
# Run this once: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

Write-Host "Setting up $ContainerRuntime aliases for PowerShell..." -ForegroundColor Green

# Create PowerShell profile if not exists
if (!(Test-Path -Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force | Out-Null
    Write-Host "Created PowerShell profile: $PROFILE" -ForegroundColor Yellow
}

# Add aliases to profile
$aliasContent = @"

# $ContainerRuntime aliases (added by setup-podman-alias.ps1)
function docker { $ContainerRuntime `$args }
function docker-compose { $ContainerCompose `$args }
"@

# Check if aliases already exist
$profileContent = Get-Content $PROFILE -Raw -ErrorAction SilentlyContinue
if ($profileContent -notlike "*$ContainerRuntime aliases*") {
    Add-Content -Path $PROFILE -Value $aliasContent
    Write-Host "Added aliases to PowerShell profile" -ForegroundColor Green
} else {
    Write-Host "Aliases already exist in profile" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To use the aliases:" -ForegroundColor Cyan
Write-Host "  1. Close and reopen PowerShell, OR"
Write-Host "  2. Run: . `$PROFILE"
Write-Host ""
Write-Host "Then you can use:" -ForegroundColor Cyan
Write-Host "  docker ps"
Write-Host "  docker-compose up -d"
Write-Host ""
