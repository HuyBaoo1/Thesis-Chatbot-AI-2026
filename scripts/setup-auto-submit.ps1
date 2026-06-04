# Setup automatic log submission using Windows Task Scheduler
# This script creates a scheduled task that runs every 30 minutes

$scriptPath = Join-Path $PSScriptRoot "python\submit_log.py"
$workingDir = Split-Path -Parent $PSScriptRoot

$action = New-ScheduledTaskAction -Execute "python" -Argument "`"$scriptPath`"" -WorkingDirectory $workingDir

# Run every 30 minutes
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration ([TimeSpan]::MaxValue)

# Run only when user is logged in, don't show window
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

$taskName = "AI-Log-Auto-Submit"

# Remove existing task if it exists
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Register the new task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Automatically submit AI logs every 30 minutes"

Write-Host "✅ Scheduled task created successfully!" -ForegroundColor Green
Write-Host "Task name: $taskName" -ForegroundColor Cyan
Write-Host "Frequency: Every 30 minutes" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view the task:" -ForegroundColor Yellow
Write-Host "  Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
Write-Host ""
Write-Host "To disable the task:" -ForegroundColor Yellow
Write-Host "  Disable-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
Write-Host ""
Write-Host "To remove the task:" -ForegroundColor Yellow
Write-Host "  Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false" -ForegroundColor White
