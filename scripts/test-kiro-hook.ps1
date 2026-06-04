# Test if Kiro hooks are working
# This simulates what Kiro should send to the hook

$testPayload = @{
    hook_event_name = "beforeSubmitPrompt"
    prompt = "Test prompt from Kiro"
    agent = "kiro"
    source = "test-script"
    session_id = "test-session-123"
    files = @()
} | ConvertTo-Json -Compress

Write-Host "Testing Kiro hook with payload:"
Write-Host $testPayload
Write-Host ""

# Send to log_hook.py
$testPayload | python scripts/python/log_hook.py --tool kiro

Write-Host ""
Write-Host "Check .ai-log/session.jsonl for the test entry"
Write-Host ""
Write-Host "Last 3 entries:"
Get-Content .ai-log/session.jsonl | Select-Object -Last 3
