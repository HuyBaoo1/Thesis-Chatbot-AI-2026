# Complete reset: Clear Qdrant + Reset database + Regenerate
$headers = @{ "X-API-Key" = "dev-api-key-12345" }
$sessionId = "2f0bb167-84bd-405a-b391-b01a001dd436"

Write-Host "Step 1: Deleting Qdrant collection..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method DELETE
    Write-Host "Deleted!" -ForegroundColor Green
} catch {
    Write-Host "Collection may not exist" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 2: Creating new collection..." -ForegroundColor Yellow
$body = '{"vectors":{"size":1536,"distance":"Cosine"}}'
Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method PUT -Body $body -ContentType "application/json" | Out-Null
Write-Host "Created!" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Resetting database qdrant_point_id..." -ForegroundColor Yellow
# This requires direct database access - we'll do it via API by deleting and recreating chunks
# For now, just regenerate and it should overwrite

Write-Host ""
Write-Host "Step 4: Regenerating embeddings (this will take a few minutes)..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content/session/$sessionId/generate-embeddings" -Method POST -Headers $headers
Write-Host "Status: $($response.status)" -ForegroundColor Cyan

Write-Host ""
Write-Host "Step 5: Monitoring progress..." -ForegroundColor Yellow
for ($i = 0; $i -lt 120; $i++) {
    Start-Sleep -Seconds 5
    $progress = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content/session/$sessionId/embedding-progress" -Method GET -Headers $headers
    
    Write-Host "`rProgress: $($progress.content_with_embeddings)/$($progress.total_content) ($($progress.progress_percentage)%) - Chunks: $($progress.total_chunks)" -NoNewline
    
    if ($progress.status -eq "completed" -and $progress.total_chunks -gt 0) {
        Write-Host ""
        Write-Host "Completed!" -ForegroundColor Green
        break
    }
}

Write-Host ""
Write-Host "Step 6: Checking Qdrant collection..." -ForegroundColor Yellow
$collection = Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method GET
Write-Host "Points in Qdrant: $($collection.result.points_count)" -ForegroundColor Cyan

if ($collection.result.points_count -eq 0) {
    Write-Host "WARNING: No points in Qdrant! Embeddings may not have been stored." -ForegroundColor Red
    Write-Host "Check celery worker logs for errors." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Step 7: Testing chatbot..." -ForegroundColor Yellow
    .\test-rag-debug.ps1
}
