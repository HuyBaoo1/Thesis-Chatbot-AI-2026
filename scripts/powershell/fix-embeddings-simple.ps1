. ("$PSScriptRoot\common.ps1")
# Simple fix: Reset and regenerate embeddings
$headers = @{ "X-API-Key" = "dev-api-key-12345" }
$sessionId = "2f0bb167-84bd-405a-b391-b01a001dd436"

Write-Host "Step 1: Delete Qdrant collection..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method DELETE | Out-Null
    Write-Host "Deleted!" -ForegroundColor Green
} catch {
    Write-Host "Collection may not exist" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 2: Create new collection..." -ForegroundColor Yellow
$body = '{"vectors":{"size":1536,"distance":"Cosine"}}'
Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method PUT -Body $body -ContentType "application/json" | Out-Null
Write-Host "Created!" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Reset database..." -ForegroundColor Yellow
$sqlCommand = "UPDATE content_chunks SET qdrant_point_id = NULL;"
try {
    $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -c $sqlCommand | Out-Null
    Write-Host "Database reset!" -ForegroundColor Green
} catch {
    Write-Host "Could not reset database (OK)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 4: Regenerate embeddings..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content/session/$sessionId/generate-embeddings" -Method POST -Headers $headers | Out-Null
Write-Host "Started!" -ForegroundColor Green

Write-Host ""
Write-Host "Step 5: Wait for completion (5-10 minutes)..." -ForegroundColor Yellow
for ($i = 0; $i -lt 120; $i++) {
    Start-Sleep -Seconds 5
    $progress = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content/session/$sessionId/embedding-progress" -Method GET -Headers $headers
    
    Write-Host "`rProgress: $($progress.content_with_embeddings)/$($progress.total_content) - Chunks: $($progress.total_chunks)    " -NoNewline
    
    if ($progress.status -eq "completed" -and $progress.total_chunks -gt 0) {
        Write-Host ""
        Write-Host "Completed!" -ForegroundColor Green
        break
    }
}

Write-Host ""
Write-Host "Step 6: Verify..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$collection = Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method GET
Write-Host "Points in Qdrant: $($collection.result.points_count)" -ForegroundColor Cyan

if ($collection.result.points_count -gt 0) {
    Write-Host ""
    Write-Host "SUCCESS! Testing chatbot..." -ForegroundColor Green
    .\test-rag-debug.ps1
} else {
    Write-Host ""
    Write-Host "FAILED: No embeddings in Qdrant" -ForegroundColor Red
    Write-Host "Check celery worker logs" -ForegroundColor Yellow
}
