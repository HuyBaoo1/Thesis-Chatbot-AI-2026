. ("$PSScriptRoot\common.ps1")
# Export crawled content as Markdown files for a specific session
# Usage: .\export-crawl-markdown.ps1
#        .\export-crawl-markdown.ps1 -SessionId <uuid>

param(
    [string]$SessionId = "",
    [string]$OutputDir = "",
    [string]$UrlFilter = ""
)

$ErrorActionPreference = "Stop"

# --- Config ---
$ContainerName = "web-crawler-rag_app-postgres_1"
$DbUser = "app"
$DbName = "app_db"

# --- Helper: Run SQL in Postgres container ---
function Invoke-PgQuery {
    param([string]$Sql)
    $result = $ContainerRuntime exec $ContainerName psql -U $DbUser -d $DbName -t -A -F "|" -c $Sql 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Database query failed: $result" -ForegroundColor Red
        exit 1
    }
    return $result
}

# --- Step 1: List sessions if no SessionId provided ---
if (-not $SessionId) {
    Write-Host "`n=== Available Crawl Sessions ===" -ForegroundColor Cyan
    $sessions = Invoke-PgQuery "SELECT id, target_url, strategy, status, created_at FROM crawl_sessions ORDER BY created_at DESC LIMIT 20;"
    
    if (-not $sessions -or $sessions.Trim() -eq "") {
        Write-Host "No crawl sessions found in database." -ForegroundColor Yellow
        exit 0
    }

    $index = 0
    $sessionList = @()
    foreach ($line in $sessions) {
        if ($line.Trim() -eq "") { continue }
        $parts = $line.Split("|")
        if ($parts.Length -ge 5) {
            $index++
            $sessionList += $parts[0].Trim()
            Write-Host ("  [{0}] {1}  |  {2}  |  {3}  |  {4}" -f $index, $parts[1].Trim(), $parts[2].Trim(), $parts[3].Trim(), $parts[4].Trim()) -ForegroundColor White
        }
    }

    if ($sessionList.Count -eq 0) {
        Write-Host "No sessions to export." -ForegroundColor Yellow
        exit 0
    }

    Write-Host ""
    $choice = Read-Host "Enter session number to export (1-$index), or 'q' to quit"
    if ($choice -eq "q" -or $choice -eq "") { exit 0 }
    
    $choiceIndex = [int]$choice - 1
    if ($choiceIndex -lt 0 -or $choiceIndex -ge $sessionList.Count) {
        Write-Host "Invalid choice." -ForegroundColor Red
        exit 1
    }
    $SessionId = $sessionList[$choiceIndex]
}

Write-Host "`nExporting session: $SessionId" -ForegroundColor Yellow

# --- Step 2: Get session info ---
$sessionInfo = Invoke-PgQuery "SELECT target_url, strategy, status FROM crawl_sessions WHERE id = '$SessionId';"
if (-not $sessionInfo -or $sessionInfo.Trim() -eq "") {
    Write-Host "[ERROR] Session not found: $SessionId" -ForegroundColor Red
    exit 1
}
$parts = $sessionInfo.Split("|")
$targetUrl = $parts[0].Trim()
$strategy = $parts[1].Trim()
Write-Host "  Target: $targetUrl  |  Strategy: $strategy" -ForegroundColor Gray

# --- Step 3: Set output directory ---
if (-not $OutputDir) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safeName = $targetUrl -replace 'https?://', '' -replace '[^a-zA-Z0-9.-]', '_'
    $OutputDir = "export-md-${safeName}-${timestamp}"
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
Write-Host "  Output: $OutputDir/" -ForegroundColor Gray

# --- Step 4: Query crawled URLs ---
$urlFilterSql = ""
if ($UrlFilter) {
    $urlFilterSql = " AND url LIKE '%$UrlFilter%'"
    Write-Host "  URL filter: $UrlFilter" -ForegroundColor Gray
}

$countResult = Invoke-PgQuery "SELECT COUNT(*) FROM crawled_urls WHERE session_id = '$SessionId' AND status = 'CRAWLED' AND content IS NOT NULL${urlFilterSql};"
$total = [int]($countResult.Trim())
Write-Host "  Pages to export: $total" -ForegroundColor Gray

if ($total -eq 0) {
    Write-Host "No crawled content found for this session." -ForegroundColor Yellow
    exit 0
}

# --- Step 5: Export each page as .md ---
# Fetch in batches of 100
$batchSize = 100
$exported = 0
$offset = 0

while ($offset -lt $total) {
    $rows = Invoke-PgQuery "SELECT url, title, content, metadata FROM crawled_urls WHERE session_id = '$SessionId' AND status = 'CRAWLED' AND content IS NOT NULL${urlFilterSql} ORDER BY title OFFSET $offset LIMIT $batchSize;"
    
    foreach ($line in $rows) {
        if ($line.Trim() -eq "") { continue }
        
        # Parse: url|title|content|metadata
        # Content may contain | so we need careful parsing
        $firstPipe = $line.IndexOf("|")
        $secondPipe = $line.IndexOf("|", $firstPipe + 1)
        
        $url = $line.Substring(0, $firstPipe).Trim()
        $title = $line.Substring($firstPipe + 1, $secondPipe - $firstPipe - 1).Trim()
        $rest = $line.Substring($secondPipe + 1)
        
        # Content is everything up to the last | (metadata is last field)
        $lastPipe = $rest.LastIndexOf("|")
        if ($lastPipe -gt 0) {
            $content = $rest.Substring(0, $lastPipe).Trim()
            $metadata = $rest.Substring($lastPipe + 1).Trim()
        } else {
            $content = $rest.Trim()
            $metadata = "{}"
        }

        # Skip empty content
        if (-not $content -or $content.Length -lt 10) { continue }

        # Generate safe filename from title or URL
        if ($title -and $title -ne "Untitled" -and $title.Length -gt 0) {
            $safeTitle = $title -replace '[\\/:*?\"<>|]', '_' -replace '\s+', ' '
            if ($safeTitle.Length -gt 80) { $safeTitle = $safeTitle.Substring(0, 80) }
        } else {
            # Use URL path as filename
            $uri = [System.Uri]$url
            $safeTitle = $uri.AbsolutePath.Trim('/') -replace '[\\/:*?\"<>|]', '_'
            if ($safeTitle.Length -gt 80) { $safeTitle = $safeTitle.Substring(0, 80) }
            if ($safeTitle.Length -eq 0) { $safeTitle = "index" }
        }

        # Handle duplicate filenames
        $fileName = "${safeTitle}.md"
        $filePath = Join-Path $OutputDir $fileName
        $counter = 1
        while (Test-Path $filePath) {
            $fileName = "${safeTitle}_$counter.md"
            $filePath = Join-Path $OutputDir $fileName
            $counter++
        }

        # Build markdown with metadata header
        $md = @"
---
url: $url
title: $title
crawled_from: $targetUrl
---

# $title

$content
"@

        # Write file (UTF-8 without BOM)
        [System.IO.File]::WriteAllText($filePath, $md, [System.Text.UTF8Encoding]::new($false))
        $exported++
    }

    $offset += $batchSize
    Write-Host ("  Exported {0}/{1} pages..." -f [Math]::Min($exported, $total), $total) -ForegroundColor DarkGray
}

# --- Done ---
Write-Host "`n=== EXPORT COMPLETED ===" -ForegroundColor Green
Write-Host "  Session: $SessionId" -ForegroundColor White
Write-Host "  Target:  $targetUrl" -ForegroundColor White
Write-Host "  Pages:   $exported files" -ForegroundColor White
Write-Host "  Output:  $OutputDir\" -ForegroundColor White

if ($exported -gt 0) {
    $sampleFile = Get-ChildItem $OutputDir -Filter "*.md" | Select-Object -First 1
    Write-Host "`n  Sample: $($sampleFile.Name)" -ForegroundColor DarkGray
}
