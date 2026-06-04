. ("$PSScriptRoot\common.ps1")
# Export database and Qdrant data for sharing
Write-Host "=== EXPORTING DATA FOR SHARING ===" -ForegroundColor Cyan

$exportDir = "data-export-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $exportDir -Force | Out-Null

Write-Host "`nExport directory: $exportDir" -ForegroundColor Yellow

# 1. Export PostgreSQL database
Write-Host "`n1. Exporting PostgreSQL database..." -ForegroundColor Yellow
$ContainerRuntime exec web-crawler-rag_app-postgres_1 pg_dump -U app -d app_db -F c -f /tmp/app_db.dump
$ContainerRuntime cp web-crawler-rag_app-postgres_1:/tmp/app_db.dump "$exportDir/postgres_dump.backup"
Write-Host "   [OK] PostgreSQL exported: $exportDir/postgres_dump.backup" -ForegroundColor Green

# 2. Export Qdrant snapshot
Write-Host "`n2. Exporting Qdrant collection..." -ForegroundColor Yellow
try {
    # Create snapshot via API
    $snapshot = Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content/snapshots" -Method POST
    $snapshotName = $snapshot.result.name
    Write-Host "   Created snapshot: $snapshotName" -ForegroundColor Gray
    
    # Download snapshot
    Invoke-WebRequest -Uri "http://localhost:6335/collections/crawled_content/snapshots/$snapshotName" -OutFile "$exportDir/qdrant_snapshot.snapshot"
    Write-Host "   [OK] Qdrant exported: $exportDir/qdrant_snapshot.snapshot" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Failed to export Qdrant: $_" -ForegroundColor Red
}

# 3. Export configuration files
Write-Host "`n3. Exporting configuration..." -ForegroundColor Yellow
Copy-Item ".env.example" "$exportDir/.env.example"
Copy-Item "docker-compose.web-crawler-rag.yml" "$exportDir/docker-compose.yml"
Write-Host "   [OK] Config files exported" -ForegroundColor Green

# 4. Create README for recipient
Write-Host "`n4. Creating import instructions..." -ForegroundColor Yellow
$readme = @"
# RAG System Data Export

## Contents
- postgres_dump.backup: PostgreSQL database dump (chunks, URLs, metadata)
- qdrant_snapshot.snapshot: Qdrant vector embeddings
- .env.example: Environment variables template
- docker-compose.yml: Docker compose configuration

## Import Instructions

### Prerequisites
- Docker or $ContainerRuntime installed
- At least 2GB free disk space
- Ports 5433, 6333, 6379, 8000 available

### Steps

1. **Setup environment**
   ```powershell
   # Copy .env.example to .env and fill in your OPENAI_API_KEY
   cp .env.example .env
   # Edit .env and set OPENAI_API_KEY=your-key-here
   ```

2. **Start services**
   ```powershell
Invoke-Compose -f docker-compose.yml up -d
   # Wait 10 seconds for services to start
   ```

3. **Import PostgreSQL data**
   ```powershell
   # Copy dump file to container
   $ContainerRuntime cp postgres_dump.backup web-crawler-rag_app-postgres_1:/tmp/
   
   # Restore database
   $ContainerRuntime exec web-crawler-rag_app-postgres_1 pg_restore -U app -d app_db -c /tmp/postgres_dump.backup
   ```

4. **Import Qdrant snapshot**
   ```powershell
   # Copy snapshot to Qdrant container
   $ContainerRuntime cp qdrant_snapshot.snapshot web-crawler-rag_qdrant_1:/qdrant/snapshots/
   
   # Restore via API
   `$body = @{location = "qdrant_snapshot.snapshot"} | ConvertTo-Json
   Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content/snapshots/recover" -Method PUT -Body `$body -ContentType "application/json"
   ```

5. **Verify data**
   ```powershell
   # Check chunks count
   $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -c "SELECT COUNT(*) FROM content_chunks;"
   
   # Check Qdrant points
   Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method GET
   ```

6. **Test chatbot**
   ```powershell
   # Create session
   `$headers = @{"X-API-Key" = "test-key"}
   `$session = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/sessions" -Method POST -Headers `$headers -Body '{"metadata":{}}' -ContentType "application/json"
   
   # Test query
   `$body = @{session_id = `$session.id; question = "Tell me about VinUni"} | ConvertTo-Json
   `$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/query" -Method POST -Headers `$headers -Body `$body -ContentType "application/json"
   Write-Host `$response.answer
   ```

## Data Statistics
- Export Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- Database Size: $(if (Test-Path "$exportDir/postgres_dump.backup") { "{0:N2} MB" -f ((Get-Item "$exportDir/postgres_dump.backup").Length / 1MB) } else { "N/A" })
- Qdrant Snapshot Size: $(if (Test-Path "$exportDir/qdrant_snapshot.snapshot") { "{0:N2} MB" -f ((Get-Item "$exportDir/qdrant_snapshot.snapshot").Length / 1MB) } else { "N/A" })

## Notes
- Make sure to set your own OPENAI_API_KEY in .env
- The data includes embeddings, so you don't need to regenerate them
- If you want to add more data, use the crawl and embedding generation endpoints

## Support
For issues, check the logs:
```powershell
$ContainerRuntime logs web-crawler-rag_backend-api_1
```
"@

Set-Content -Path "$exportDir/README.md" -Value $readme
Write-Host "   [OK] README.md created" -ForegroundColor Green

# 5. Create import script
Write-Host "`n5. Creating import script..." -ForegroundColor Yellow
$importScript = @'
# Import RAG System Data
Write-Host "=== IMPORTING RAG SYSTEM DATA ===" -ForegroundColor Cyan

# Check prerequisites
if (-not (Test-Path ".env")) {
    Write-Host "[ERROR] .env file not found. Copy .env.example to .env and set OPENAI_API_KEY" -ForegroundColor Red
    exit 1
}

# Start services
Write-Host "`n1. Starting services..." -ForegroundColor Yellow
Invoke-Compose -f docker-compose.yml up -d
Start-Sleep -Seconds 15
Write-Host "   [OK] Services started" -ForegroundColor Green

# Import PostgreSQL
Write-Host "`n2. Importing PostgreSQL data..." -ForegroundColor Yellow
$ContainerRuntime cp postgres_dump.backup web-crawler-rag_app-postgres_1:/tmp/
$ContainerRuntime exec web-crawler-rag_app-postgres_1 pg_restore -U app -d app_db -c /tmp/postgres_dump.backup 2>$null
Write-Host "   [OK] PostgreSQL data imported" -ForegroundColor Green

# Import Qdrant
Write-Host "`n3. Importing Qdrant snapshot..." -ForegroundColor Yellow
$ContainerRuntime cp qdrant_snapshot.snapshot web-crawler-rag_qdrant_1:/qdrant/snapshots/
$body = @{location = "qdrant_snapshot.snapshot"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content/snapshots/recover" -Method PUT -Body $body -ContentType "application/json" | Out-Null
Write-Host "   [OK] Qdrant data imported" -ForegroundColor Green

# Verify
Write-Host "`n4. Verifying data..." -ForegroundColor Yellow
$chunks = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM content_chunks;"
$qdrant = Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method GET
Write-Host "   Chunks in database: $($chunks.Trim())" -ForegroundColor Cyan
Write-Host "   Points in Qdrant: $($qdrant.result.points_count)" -ForegroundColor Cyan

Write-Host "`n=== IMPORT COMPLETED ===" -ForegroundColor Green
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Gray
Write-Host "Dashboard: http://localhost:3000 (start separately with 'npm run dev')" -ForegroundColor Gray
'@

Set-Content -Path "$exportDir/import-data.ps1" -Value $importScript
Write-Host "   [OK] import-data.ps1 created" -ForegroundColor Green

# 6. Compress for sharing
Write-Host "`n6. Compressing export..." -ForegroundColor Yellow
$zipFile = "$exportDir.zip"
Compress-Archive -Path $exportDir -DestinationPath $zipFile -Force
$zipSize = (Get-Item $zipFile).Length / 1MB
Write-Host "   [OK] Compressed: $zipFile ($("{0:N2}" -f $zipSize) MB)" -ForegroundColor Green

Write-Host "`n=== EXPORT COMPLETED ===" -ForegroundColor Cyan
Write-Host "`nShare this file: $zipFile" -ForegroundColor Yellow
Write-Host "Recipient should:" -ForegroundColor Gray
Write-Host "  1. Extract the zip file" -ForegroundColor Gray
Write-Host "  2. Read README.md for instructions" -ForegroundColor Gray
Write-Host "  3. Run import-data.ps1 to import data" -ForegroundColor Gray
