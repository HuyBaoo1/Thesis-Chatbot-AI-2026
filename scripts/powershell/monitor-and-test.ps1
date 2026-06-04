. ("$PSScriptRoot\common.ps1")
# Monitor embedding progress and test chatbot
$headers = @{ "X-API-Key" = "test-key" }

Write-Host "=== MONITORING EMBEDDING GENERATION ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Monitoring for 3 minutes..." -ForegroundColor Yellow
Write-Host ""

for ($i = 0; $i -lt 36; $i++) {
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
    
    $elapsed = $i * 5
    Write-Host "[$($elapsed)s] DB chunks: $chunksWithEmbeddings | Qdrant points: $pointsCount" -ForegroundColor Cyan
    
    # If we have a good number of embeddings, test the chatbot
    if ($pointsCount -gt 50 -and $i -gt 6) {
        Write-Host ""
        Write-Host "Testing chatbot with $pointsCount embeddings..." -ForegroundColor Yellow
        
        # Create chat session
        $sessionResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/sessions" -Method POST -Headers $headers -Body '{"metadata":{}}' -ContentType "application/json"
        $testSessionId = $sessionResponse.id
        
        # Test query
        $testBody = @{
            session_id = $testSessionId
            question = "What is the MBA program at VinUni?"
        } | ConvertTo-Json
        
        $testResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/query" -Method POST -Headers $headers -Body $testBody -ContentType "application/json"
        
        Write-Host ""
        Write-Host "Chatbot Test Results:" -ForegroundColor Green
        Write-Host "  Confidence: $($testResponse.confidence)" -ForegroundColor Yellow
        Write-Host "  Sources: $($testResponse.sources.Count)" -ForegroundColor Yellow
        Write-Host "  Answer preview:" -ForegroundColor Yellow
        Write-Host "  $($testResponse.answer.Substring(0, [Math]::Min(200, $testResponse.answer.Length)))..." -ForegroundColor Gray
        
        if ($testResponse.confidence -gt 0.5 -and $testResponse.sources.Count -gt 0) {
            Write-Host ""
            Write-Host "SUCCESS! Chatbot is working!" -ForegroundColor Green
            break
        }
    }
}

Write-Host ""
Write-Host "Final Status:" -ForegroundColor Cyan

$finalChunks = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM content_chunks WHERE qdrant_point_id IS NOT NULL;"
$finalChunksCount = $finalChunks.Trim()

$collection = Invoke-RestMethod -Uri "http://localhost:6335/collections/crawled_content" -Method GET
$finalPointsCount = $collection.result.points_count

Write-Host "  Database chunks with embeddings: $finalChunksCount" -ForegroundColor Yellow
Write-Host "  Qdrant points: $finalPointsCount" -ForegroundColor Yellow

Write-Host ""
Write-Host "Check backend logs for details:" -ForegroundColor Gray
Write-Host "  $ContainerRuntime logs web-crawler-rag_backend-api_1 -f | Select-String 'Thread'" -ForegroundColor Gray
