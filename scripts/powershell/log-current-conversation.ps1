# Log current Kiro conversation
# This should be run manually or via git pre-push hook

# Get the last commit message as a proxy for what was done
$lastCommit = git log -1 --pretty=format:"%s%n%b"

# Create a summary from recent git activity
$recentCommits = git log --since="1 hour ago" --pretty=format:"%s" | Out-String

$prompt = @"
Recent work session:
Commits in last hour:
$recentCommits

Latest commit:
$lastCommit
"@

$json = @{
    hook_event_name = "beforeSubmitPrompt"
    prompt = $prompt.Trim()
    agent = "kiro"
    source = "git-activity"
    session_id = (Get-Date -Format "yyyyMMdd-HHmmss")
    files = @()
} | ConvertTo-Json -Compress

$json | python scripts/python/log_hook.py --tool kiro | Out-Null

Write-Host "✅ Logged Kiro session based on git activity" -ForegroundColor Green
