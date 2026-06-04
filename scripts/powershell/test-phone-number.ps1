# Test phone number queries
$headers = @{ "X-API-Key" = "test-key" }

Write-Host "=== TESTING PHONE NUMBER QUERIES ===" -ForegroundColor Cyan
Write-Host ""

# Create session
$sessionResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/sessions" -Method POST -Headers $headers -Body '{"metadata":{}}' -ContentType "application/json"
$sessionId = $sessionResponse.id

$queries = @(
    "What is the hotline number for admissions?",
    "How can I contact the admission office?",
    "What is the phone number for VinUni admissions?",
    "Số điện thoại tuyển sinh VinUni là gì?",
    "Làm sao để liên hệ phòng tuyển sinh?",
    "Hotline tuyển sinh VinUni"
)

foreach ($query in $queries) {
    Write-Host "Query: $query" -ForegroundColor Yellow
    
    $body = @{
        session_id = $sessionId
        question = $query
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/query" -Method POST -Headers $headers -Body $body -ContentType "application/json"
        
        Write-Host "  Confidence: $($response.confidence)" -ForegroundColor Cyan
        Write-Host "  Sources: $($response.sources.Count)" -ForegroundColor Cyan
        
        # Check if answer contains phone number
        if ($response.answer -match "1800|8189|2471089779|98 100 8189") {
            Write-Host "  FOUND PHONE NUMBER!" -ForegroundColor Green
            Write-Host "  Answer: $($response.answer)" -ForegroundColor Gray
        } else {
            Write-Host "  No phone number in answer" -ForegroundColor Red
            Write-Host "  Answer: $($response.answer.Substring(0, [Math]::Min(150, $response.answer.Length)))..." -ForegroundColor Gray
        }
    } catch {
        Write-Host "  ERROR: $_" -ForegroundColor Red
    }
    
    Write-Host ""
    Start-Sleep -Seconds 1
}

Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "If phone numbers were not found, possible reasons:" -ForegroundColor Yellow
Write-Host "1. Embeddings not yet generated for contact info chunks" -ForegroundColor Gray
Write-Host "2. Semantic similarity too low (confidence < 0.6)" -ForegroundColor Gray
Write-Host "3. Need to wait for embedding progress to reach 100%" -ForegroundColor Gray
