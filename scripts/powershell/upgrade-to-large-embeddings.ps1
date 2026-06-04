. ("$PSScriptRoot\common.ps1")
# Upgrade to text-embedding-3-large (3072 dimensions)
$headers = @{ "X-API-Key" = "test-key" }

Write-Host "=== UPGRADING TO TEXT-EMBEDDING-3-LARGE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Delete existing Qdrant collection (1536 dims)" -ForegroundColor Gray
Write-Host "  2. Create new collection (3072 dims)" -ForegroundColor Gray
Write-Host "  3. Delete all chunks from database" -ForegroundColor Gray
Write-Host "  4. Regenerate embeddings with new model" -ForegroundColor Gray
Write-Host ""
Write-Host "WARNING: This will take 5-10 minutes and use more OpenAI API credits" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Cancelled" -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "Step 1: Deleting old Qdrant collection..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method DELETE | Out-Null
    Write-Host "  Deleted" -ForegroundColor Green
} catch {
    Write-Host "  Collection doesn't exist or already deleted" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 2: Creating new collection with 3072 dimensions..." -ForegroundColor Yellow
$body = '{"vectors":{"size":3072,"distance":"Cosine"}}'
Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method PUT -Body $body -ContentType "application/json" | Out-Null
Write-Host "  Created" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Deleting chunks from database..." -ForegroundColor Yellow
$ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -c "DELETE FROM content_chunks;"
Write-Host "  Deleted" -ForegroundColor Green

Write-Host ""
Write-Host "Step 4: Updating .env file..." -ForegroundColor Yellow
$envContent = Get-Content .env
$envContent = $envContent -replace "OPENAI_EMBEDDING_MODEL=text-embedding-3-small", "OPENAI_EMBEDDING_MODEL=text-embedding-3-large"
$envContent | Set-Content .env
Write-Host "  Updated" -ForegroundColor Green

Write-Host ""
Write-Host "Step 5: Restarting backend with new config..." -ForegroundColor Yellow
.\restart-backend-debug.ps1 | Out-Null
Write-Host "  Restarted" -ForegroundColor Green

Write-Host ""
Write-Host "Step 6: Getting sessions..." -ForegroundColor Yellow
$sessionResult = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT DISTINCT session_id FROM crawled_urls WHERE status = 'CRAWLED';"
$sessionIds = $sessionResult -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim() }
Write-Host "  Found $($sessionIds.Count) sessions" -ForegroundColor Cyan

Write-Host ""
Write-Host "Step 7: Regenerating embeddings with text-embedding-3-large..." -ForegroundColor Yellow
foreach ($sessionId in $sessionIds) {
    Write-Host "  Processing session: $sessionId" -ForegroundColor Gray
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content/session/$sessionId/generate-embeddings" -Method POST -Headers $headers
        Write-Host "    Status: $($response.status)" -ForegroundColor Green
    } catch {
        Write-Host "    Failed: $_" -ForegroundColor Red
    }
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Step 8: Monitoring progress (2 minutes)..." -ForegroundColor Yellow
for ($i = 0; $i -lt 24; $i++) {
    Start-Sleep -Seconds 5
    
    $chunksResult = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM content_chunks WHERE qdrant_point_id IS NOT NULL;"
    $chunksWithEmbeddings = $chunksResult.Trim()
    
    try {
        $collection = Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method GET
        $pointsCount = $collection.result.points_count
    } catch {
        $pointsCount = 0
    }
    
    Write-Host "[$($i*5)s] Chunks: $chunksWithEmbeddings | Qdrant points: $pointsCount" -ForegroundColor Cyan
    
    if ($pointsCount -gt 50) {
        Write-Host ""
        Write-Host "Embeddings are being generated!" -ForegroundColor Green
        break
    }
}

Write-Host ""
Write-Host "=== UPGRADE COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Benefits of text-embedding-3-large:" -ForegroundColor Cyan
Write-Host "  - Better multilingual support (English <-> Vietnamese)" -ForegroundColor Gray
Write-Host "  - Higher accuracy for semantic search" -ForegroundColor Gray
Write-Host "  - Better handling of complex queries" -ForegroundColor Gray
Write-Host ""
Write-Host "Note: Embeddings will continue generating in background" -ForegroundColor Yellow
Write-Host "Monitor with: .\monitor-and-test.ps1" -ForegroundColor Gray
