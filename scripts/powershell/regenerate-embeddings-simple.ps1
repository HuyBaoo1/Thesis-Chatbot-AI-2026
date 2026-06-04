. ("$PSScriptRoot\common.ps1")
# Simple script to regenerate embeddings
$headers = @{ "X-API-Key" = "dev-api-key-12345" }

Write-Host "=== REGENERATE EMBEDDINGS ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Delete all chunks to force regeneration
Write-Host "Step 1: Deleting all chunks..." -ForegroundColor Yellow
$ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -c "DELETE FROM content_chunks;"
Write-Host "Done" -ForegroundColor Green

# Step 2: Get session IDs
Write-Host ""
Write-Host "Step 2: Getting session IDs..." -ForegroundColor Yellow
$sessionResult = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT DISTINCT session_id FROM crawled_urls WHERE status = 'CRAWLED';"
$sessionIds = $sessionResult -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim() }
Write-Host "Found $($sessionIds.Count) sessions" -ForegroundColor Cyan

# Step 3: Trigger embedding generation
Write-Host ""
Write-Host "Step 3: Triggering embedding generation..." -ForegroundColor Yellow
foreach ($sessionId in $sessionIds) {
    Write-Host "  Processing: $sessionId" -ForegroundColor Gray
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content/session/$sessionId/generate-embeddings" -Method POST -Headers $headers
        Write-Host "  Status: $($response.status)" -ForegroundColor Green
    } catch {
        Write-Host "  Failed: $_" -ForegroundColor Red
    }
    Start-Sleep -Seconds 1
}

# Step 4: Monitor progress
Write-Host ""
Write-Host "Step 4: Monitoring progress (60 seconds)..." -ForegroundColor Yellow
Write-Host "Check logs with: $ContainerRuntime logs web-crawler-rag_backend-api_1 -f" -ForegroundColor Gray
Write-Host ""

for ($i = 0; $i -lt 12; $i++) {
    Start-Sleep -Seconds 5
    
    $chunksResult = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM content_chunks WHERE qdrant_point_id IS NOT NULL;"
    $chunksWithEmbeddings = $chunksResult.Trim()
    
    try {
        $collection = Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method GET
        $pointsCount = $collection.result.points_count
    } catch {
        $pointsCount = 0
    }
    
    Write-Host "[$($i*5)s] Chunks with embeddings: $chunksWithEmbeddings | Qdrant points: $pointsCount" -ForegroundColor Cyan
    
    if ($pointsCount -gt 0) {
        Write-Host ""
        Write-Host "SUCCESS! Embeddings are being generated." -ForegroundColor Green
        break
    }
}

Write-Host ""
Write-Host "Done. Check final status with:" -ForegroundColor Yellow
Write-Host "  $ContainerRuntime logs web-crawler-rag_backend-api_1 --tail 50" -ForegroundColor Gray
