#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Auto-fetch PR reviews after git push
.DESCRIPTION
    This script runs after git push to automatically fetch latest PR reviews
    from phoenix-mentor bot. Runs in background to not block push.
#>

# Run in background job to not block git push
Start-Job -ScriptBlock {
    param($RepoPath)
    
    # Wait a bit for GitHub to process the push
    Start-Sleep -Seconds 10
    
    # Change to repo directory
    Set-Location $RepoPath
    
    # Fetch PR reviews
    try {
        $output = python scripts/python/fetch_pr_reviews.py 2>&1
        
        # Log output
        $logFile = ".pr-reviews/auto-fetch.log"
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "$timestamp - Auto-fetch completed`n$output`n" | Out-File -Append $logFile
        
        Write-Host "✅ PR reviews auto-fetched in background"
    }
    catch {
        Write-Host "⚠️ Failed to auto-fetch PR reviews: $_"
    }
} -ArgumentList (Get-Location).Path | Out-Null

Write-Host "🔄 PR review fetch started in background..."
