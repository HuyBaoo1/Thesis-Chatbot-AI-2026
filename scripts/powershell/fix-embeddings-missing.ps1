. ("$PSScriptRoot\common.ps1")
# Fix: Generate embeddings for chunks that don't have them
# Problem: Chunks exist but qdrant_point_id is NULL (no embeddings in Qdrant)

$headers = @{ "X-API-Key" = "dev-api-key-12345" }

Write-Host "=== FIX MISSING EMBEDDINGS ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Check current status..." -ForegroundColor Yellow

# Count chunks without embeddings
$result = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM content_chunks WHERE qdrant_point_id IS NULL;"
$chunksWithoutEmbeddings = $result.Trim()

Write-Host "Chunks without embeddings: $chunksWithoutEmbeddings" -ForegroundColor Yellow

if ($chunksWithoutEmbeddings -eq "0") {
    Write-Host "✓ All chunks have embeddings!" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Step 2: Reset qdrant_point_id to force regeneration..." -ForegroundColor Yellow
Write-Host "(This is already NULL, but confirming...)" -ForegroundColor Gray

Write-Host ""
Write-Host "Step 3: Delete existing chunks to force recreation..." -ForegroundColor Yellow
$sqlDelete = "DELETE FROM content_chunks;"
$ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -c $sqlDelete
Write-Host "✓ Deleted all chunks" -ForegroundColor Green

Write-Host ""
Write-Host "Step 4: Get session IDs..." -ForegroundColor Yellow
$sessionResult = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT DISTINCT session_id FROM crawled_urls WHERE status = 'CRAWLED';"
$sessionIds = $sessionResult -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim() }

Write-Host "Found $($sessionIds.Count) sessions with crawled content" -ForegroundColor Cyan

Write-Host ""
Write-Host "Step 5: Regenerate embeddings for each session..." -ForegroundColor Yellow

foreach ($sessionId in $sessionIds) {
    Write-Host ""
    Write-Host "Processing session: $sessionId" -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content/session/$sessionId/generate-embeddings" -Method POST -Headers $headers
        Write-Host "  Status: $($response.status)" -ForegroundColor Green
        Write-Host "  Content count: $($response.content_count)" -ForegroundColor Gray
    } catch {
        Write-Host "  ❌ Failed: $_" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Step 6: Monitor progress (wait 2 minutes)..." -ForegroundColor Yellow
Write-Host "This will take time as embeddings are generated via OpenAI API" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date
for ($i = 0; $i -lt 24; $i++) {
    Start-Sleep -Seconds 5
    
    # Check database
    $chunksResult = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM content_chunks WHERE qdrant_point_id IS NOT NULL;"
    $chunksWithEmbeddings = $chunksResult.Trim()
    
    # Check Qdrant
    try {
        $collection = Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method GET
        $pointsCount = $collection.result.points_count
    } catch {
        $pointsCount = 0
    }
    
    $elapsed = ((Get-Date) - $startTime).TotalSeconds
    Write-Host "`r[$([int]$elapsed)s] DB chunks with embeddings: $chunksWithEmbeddings | Qdrant points: $pointsCount    " -NoNewline
    
    if ($pointsCount -gt 0 -and $chunksWithEmbeddings -gt 0) {
        Write-Host ""
        Write-Host "✓ Embeddings are being generated!" -ForegroundColor Green
        break
    }
}

Write-Host ""
Write-Host ""
Write-Host "Step 7: Final verification..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$finalChunks = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM content_chunks WHERE qdrant_point_id IS NOT NULL;"
$finalChunksCount = $finalChunks.Trim()

$collection = Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method GET
$finalPointsCount = $collection.result.points_count

Write-Host ""
Write-Host "Results:" -ForegroundColor Cyan
Write-Host "  Database chunks with embeddings: $finalChunksCount" -ForegroundColor Yellow
Write-Host "  Qdrant points: $finalPointsCount" -ForegroundColor Yellow

if ($finalPointsCount -gt 0) {
    Write-Host ""
    Write-Host "✓ SUCCESS! Embeddings are being generated." -ForegroundColor Green
    Write-Host "  Continue monitoring progress with:" -ForegroundColor Gray
    Write-Host "  $ContainerRuntime logs web-crawler-rag_backend-api_1 -f | Select-String 'Thread'" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ FAILED: No embeddings generated" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check backend logs for errors:" -ForegroundColor Yellow
    Write-Host "  $ContainerRuntime logs web-crawler-rag_backend-api_1 --tail 50" -ForegroundColor Gray
}
