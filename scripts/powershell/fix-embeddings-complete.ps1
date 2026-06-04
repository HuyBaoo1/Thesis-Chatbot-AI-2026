. ("$PSScriptRoot\common.ps1")
# Complete fix: Reset database + Qdrant + Regenerate
$headers = @{ "X-API-Key" = "dev-api-key-12345" }
$sessionId = "2f0bb167-84bd-405a-b391-b01a001dd436"

Write-Host "=== COMPLETE EMBEDDINGS FIX ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Delete Qdrant collection..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method DELETE | Out-Null
    Write-Host "✓ Deleted" -ForegroundColor Green
} catch {
    Write-Host "✓ Collection doesn't exist" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 2: Create new Qdrant collection..." -ForegroundColor Yellow
$body = '{"vectors":{"size":1536,"distance":"Cosine"}}'
Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method PUT -Body $body -ContentType "application/json" | Out-Null
Write-Host "✓ Created" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Reset database (via SQL)..." -ForegroundColor Yellow
Write-Host "Connecting to PostgreSQL container..." -ForegroundColor Gray

$sqlCommand = "UPDATE content_chunks SET qdrant_point_id = NULL WHERE crawled_url_id IN (SELECT id FROM crawled_urls WHERE session_id = '$sessionId');"

try {
    $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -c $sqlCommand
    Write-Host "Reset qdrant_point_id in database" -ForegroundColor Green
} catch {
    Write-Host "Could not reset database directly" -ForegroundColor Yellow
    Write-Host "  This is OK - embeddings will be regenerated anyway" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 4: Regenerate embeddings..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content/session/$sessionId/generate-embeddings" -Method POST -Headers $headers
Write-Host "✓ Started (status: $($response.status))" -ForegroundColor Green

Write-Host ""
Write-Host "Step 5: Monitor progress (this takes 5-10 minutes)..." -ForegroundColor Yellow
$startTime = Get-Date
for ($i = 0; $i -lt 120; $i++) {
    Start-Sleep -Seconds 5
    $progress = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content/session/$sessionId/embedding-progress" -Method GET -Headers $headers
    
    $elapsed = ((Get-Date) - $startTime).TotalSeconds
    Write-Host "`r[$([int]$elapsed)s] Progress: $($progress.content_with_embeddings)/$($progress.total_content) ($($progress.progress_percentage)%%) - Chunks: $($progress.total_chunks)    " -NoNewline
    
    if ($progress.status -eq "completed" -and $progress.total_chunks -gt 0) {
        Write-Host ""
        Write-Host "✓ Completed!" -ForegroundColor Green
        break
    }
}

Write-Host ""
Write-Host ""
Write-Host "Step 6: Verify Qdrant has data..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$collection = Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method GET
$pointsCount = $collection.result.points_count

Write-Host "Points in Qdrant: $pointsCount" -ForegroundColor Cyan

if ($pointsCount -eq 0) {
    Write-Host ""
    Write-Host "❌ FAILED: No points in Qdrant!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "1. Celery worker not running or has errors"
    Write-Host "2. OpenAI API key invalid"
    Write-Host "3. Qdrant connection issue"
    Write-Host ""
    Write-Host "Check logs:" -ForegroundColor Yellow
    Write-Host "  $ContainerRuntime logs web-crawler-rag_celery-worker_1 --tail 50"
} else {
    Write-Host "✓ Success! $pointsCount embeddings stored" -ForegroundColor Green
    Write-Host ""
    Write-Host "Step 7: Test chatbot..." -ForegroundColor Yellow
    Write-Host ""
    
    # Test English
    Write-Host "Test 1: English query" -ForegroundColor Cyan
    $sessionResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/sessions" -Method POST -Headers $headers -Body '{"metadata":{}}'
    $testSessionId = $sessionResponse.id
    $testBody = '{"session_id":"' + $testSessionId + '","question":"What is the MBA program?"}'
    $testResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/query" -Method POST -Headers $headers -Body $testBody
    
    Write-Host "Confidence: $($testResponse.confidence)" -ForegroundColor Yellow
    Write-Host "Sources: $($testResponse.sources.Count)" -ForegroundColor Yellow
    Write-Host "Answer preview: $($testResponse.answer.Substring(0, [Math]::Min(150, $testResponse.answer.Length)))..." -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "=== DONE ===" -ForegroundColor Green
    Write-Host "You can now use the chatbot at: http://localhost:5173/" -ForegroundColor Cyan
}
