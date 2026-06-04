# Clear Qdrant collection and regenerate embeddings with URL metadata
$headers = @{
    "X-API-Key" = "dev-api-key-12345"
}

$sessionId = "2f0bb167-84bd-405a-b391-b01a001dd436"

Write-Host "Step 1: Clearing Qdrant collection..." -ForegroundColor Yellow
# Delete and recreate collection via Qdrant API
try {
    Invoke-RestMethod -Uri "http://localhost:6333/collections/crawled_content" -Method DELETE
    Write-Host "Collection deleted!" -ForegroundColor Green
} catch {
    Write-Host "Collection may not exist or already deleted" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 2: Regenerating embeddings..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content/session/$sessionId/generate-embeddings" -Method POST -Headers $headers
Write-Host "Status: $($response.status)" -ForegroundColor Cyan

Write-Host ""
Write-Host "Step 3: Monitoring progress..." -ForegroundColor Yellow
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 5
    $progress = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content/session/$sessionId/embedding-progress" -Method GET -Headers $headers
    
    Write-Host "`rProgress: $($progress.content_with_embeddings)/$($progress.total_content) ($($progress.progress_percentage)%) - Chunks: $($progress.total_chunks)" -NoNewline
    
    if ($progress.status -eq "completed") {
        Write-Host ""
        Write-Host "Completed!" -ForegroundColor Green
        break
    }
}

Write-Host ""
Write-Host "Step 4: Testing chatbot..." -ForegroundColor Yellow
.\test-rag-debug.ps1
