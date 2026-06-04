. ("$PSScriptRoot\common.ps1")
# Restore data from latest backup
Write-Host "=== RESTORING DATA FROM BACKUP ===" -ForegroundColor Cyan

# Find backup with PostgreSQL dump
$backups = Get-ChildItem -Path . -Filter "data-export-*" -Directory | Sort-Object LastWriteTime -Descending

$latestBackup = $null
foreach ($backup in $backups) {
    $pgDumpTest = Join-Path $backup.FullName "postgres_dump.backup"
    if (Test-Path $pgDumpTest) {
        $latestBackup = $backup
        break
    }
}

if (-not $latestBackup) {
    Write-Host "[ERROR] No backup with PostgreSQL dump found!" -ForegroundColor Red
    exit 1
}

Write-Host "`nUsing backup: $($latestBackup.Name)" -ForegroundColor Yellow
Write-Host "Created: $($latestBackup.LastWriteTime)" -ForegroundColor Gray

$backupPath = $latestBackup.FullName
$pgDump = Join-Path $backupPath "postgres_dump.backup"
$qdrantSnapshot = Join-Path $backupPath "qdrant_snapshot.snapshot"

# Check files exist
if (-not (Test-Path $pgDump)) {
    Write-Host "[ERROR] PostgreSQL dump not found: $pgDump" -ForegroundColor Red
    exit 1
}

# 1. Restore PostgreSQL
Write-Host "`n1. Restoring PostgreSQL database..." -ForegroundColor Yellow
try {
    # Copy dump to container
    & $ContainerRuntime cp $pgDump web-crawler-rag_app-postgres_1:/tmp/restore.dump
    
    # Restore (ignore errors about existing objects)
    & $ContainerRuntime exec web-crawler-rag_app-postgres_1 pg_restore -U app -d app_db -c /tmp/restore.dump 2>$null
    
    # Verify
    $chunks = & $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM content_chunks;"
    $urls = & $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM crawled_urls;"
    
    Write-Host "   Restored chunks: $($chunks.Trim())" -ForegroundColor Cyan
    Write-Host "   Restored URLs: $($urls.Trim())" -ForegroundColor Cyan
    Write-Host "   [OK] PostgreSQL restored" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Failed to restore PostgreSQL: $_" -ForegroundColor Red
}

# 2. Check Qdrant (may not need restore if vectors still exist)
Write-Host "`n2. Checking Qdrant..." -ForegroundColor Yellow
try {
    $qdrant = Invoke-RestMethod -Uri "http://localhost:6333/collections/crawled_content" -Method GET
    Write-Host "   Current points: $($qdrant.result.points_count)" -ForegroundColor Cyan
    
    if ($qdrant.result.points_count -gt 0) {
        Write-Host "   [OK] Qdrant already has vectors, skipping restore" -ForegroundColor Green
    } elseif (Test-Path $qdrantSnapshot) {
        Write-Host "   Restoring Qdrant snapshot..." -ForegroundColor Gray
        & $ContainerRuntime cp $qdrantSnapshot web-crawler-rag_qdrant_1:/qdrant/snapshots/
        $body = @{location = "qdrant_snapshot.snapshot"} | ConvertTo-Json
        Invoke-RestMethod -Uri "http://localhost:6333/collections/crawled_content/snapshots/recover" -Method PUT -Body $body -ContentType "application/json" | Out-Null
        Write-Host "   [OK] Qdrant restored" -ForegroundColor Green
    }
} catch {
    Write-Host "   [ERROR] Failed with Qdrant: $_" -ForegroundColor Red
}

# 3. Verify restoration
Write-Host "`n3. Verifying data..." -ForegroundColor Yellow
try {
    $chunks = & $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM content_chunks;"
    $qdrant = Invoke-RestMethod -Uri "http://localhost:6333/collections/crawled_content" -Method GET
    
    Write-Host "   Database chunks: $($chunks.Trim())" -ForegroundColor Cyan
    Write-Host "   Qdrant points: $($qdrant.result.points_count)" -ForegroundColor Cyan
    
    if ($chunks.Trim() -gt 0 -and $qdrant.result.points_count -gt 0) {
        Write-Host "`n[SUCCESS] Data restored successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n[WARNING] Data may not be fully restored" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [ERROR] Verification failed: $_" -ForegroundColor Red
}

Write-Host "`n=== RESTORE COMPLETED ===" -ForegroundColor Cyan
Write-Host "Check dashboard at http://localhost:3000" -ForegroundColor Gray
