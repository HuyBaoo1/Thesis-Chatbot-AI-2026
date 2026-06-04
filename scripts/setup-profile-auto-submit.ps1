# Add auto-submit to PowerShell profile
# This will submit logs when you close PowerShell terminal

$profileContent = @'

# Auto-submit AI logs on exit (runs in background)
$exitScript = {
    $repoRoot = "REPO_ROOT_PLACEHOLDER"
    if (Test-Path "$repoRoot\.ai-log\session.jsonl") {
        Start-Job -ScriptBlock {
            param($root)
            Set-Location $root
            python scripts/python/submit_log.py 2>&1 | Out-Null
        } -ArgumentList $repoRoot | Out-Null
    }
}

# Register exit event
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action $exitScript | Out-Null

'@

# Replace placeholder with actual repo root
$repoRoot = (Get-Location).Path
$profileContent = $profileContent -replace "REPO_ROOT_PLACEHOLDER", $repoRoot

# Check if profile exists
if (-not (Test-Path $PROFILE)) {
    New-Item -Path $PROFILE -ItemType File -Force | Out-Null
}

# Check if auto-submit already exists
$currentProfile = Get-Content $PROFILE -Raw -ErrorAction SilentlyContinue
if ($currentProfile -notlike "*Auto-submit AI logs*") {
    Add-Content -Path $PROFILE -Value "`n# Auto-submit AI logs on exit`n$profileContent"
    Write-Host "✅ Auto-submit added to PowerShell profile!" -ForegroundColor Green
    Write-Host "Profile location: $PROFILE" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Logs will be submitted automatically when you close PowerShell terminal." -ForegroundColor Yellow
    Write-Host "Restart PowerShell to activate." -ForegroundColor Yellow
} else {
    Write-Host "⚠️  Auto-submit already exists in profile." -ForegroundColor Yellow
}
