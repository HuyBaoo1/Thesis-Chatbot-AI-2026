# Script to manually log Kiro AI session
# Usage: .\scripts\log-kiro-session.ps1 "Your task description"

param(
    [Parameter(Mandatory=$true)]
    [string]$TaskDescription
)

$json = @{
    hook_event_name = "beforeSubmitPrompt"
    prompt = $TaskDescription
    agent = "kiro"
    session_id = (Get-Date -Format "yyyyMMdd-HHmmss")
    files = @()
} | ConvertTo-Json -Compress

echo $json | python scripts/python/log_hook.py --tool kiro

Write-Host "✅ Logged Kiro session: $TaskDescription" -ForegroundColor Green
