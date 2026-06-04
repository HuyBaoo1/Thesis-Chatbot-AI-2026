# Windsurf / Cascade Auto-logging wrapper
# This script is called by Windsurf hook or manually to log prompts
# It receives the prompt message as stdin and logs it

param(
    [Parameter(ValueFromPipeline=$true)]
    [string]$InputMessage
)

# Read from stdin if piped
if (-not $InputMessage -and -not [Console]::IsInputRedirected) {
    # No input, try to read from stdin
    $InputMessage = [Console]::In.ReadToEnd()
}

if (-not $InputMessage) {
    # Fallback: create a generic log entry
    $InputMessage = "Windsurf session at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

# Create JSON payload
$json = @{
    hook_event_name = "beforeSubmitPrompt"
    prompt = $InputMessage
    agent = "windsurf"
    source = "windsurf-hook"
    session_id = (Get-Date -Format "yyyyMMdd-HHmmss")
    files = @()
} | ConvertTo-Json -Compress

# Log it
$json | python scripts/python/log_hook.py --tool windsurf | Out-Null

# Silent success (don't clutter Windsurf output)
exit 0
