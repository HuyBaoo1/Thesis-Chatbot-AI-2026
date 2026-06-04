# Debug script to test RAG query with detailed output
$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = "dev-api-key-12345"
}

# Create a new session
Write-Host "Creating chat session..." -ForegroundColor Yellow
$sessionResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/sessions" -Method POST -Headers $headers -Body '{"metadata":{}}'
$sessionId = $sessionResponse.id
Write-Host "Session ID: $sessionId" -ForegroundColor Green
Write-Host ""

# Test query
$question = "MBA program"
Write-Host "Testing query: $question" -ForegroundColor Yellow

$body = @{
    session_id = $sessionId
    question = $question
    top_k = 5
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/query" -Method POST -Headers $headers -Body $body
    
    Write-Host "Answer:" -ForegroundColor Cyan
    Write-Host $response.answer
    Write-Host ""
    
    Write-Host "Confidence: $($response.confidence)" -ForegroundColor Cyan
    Write-Host "Processing time: $($response.processing_time)s" -ForegroundColor Cyan
    Write-Host "Sources count: $($response.sources.Count)" -ForegroundColor Cyan
    Write-Host ""
    
    if ($response.sources.Count -gt 0) {
        Write-Host "Sources:" -ForegroundColor Cyan
        $response.sources | ForEach-Object {
            Write-Host "  - $($_.title)" -ForegroundColor Gray
            Write-Host "    URL: $($_.url)" -ForegroundColor Gray
            Write-Host "    Score: $($_.relevance_score)" -ForegroundColor Gray
        }
    } else {
        Write-Host "No sources found!" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
