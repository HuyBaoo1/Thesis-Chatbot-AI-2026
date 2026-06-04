# Test cross-lingual semantic search
$headers = @{ "X-API-Key" = "test-key" }

Write-Host "=== CROSS-LINGUAL SEMANTIC SEARCH TEST ===" -ForegroundColor Cyan
Write-Host ""

# Create chat session
$sessionResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/sessions" -Method POST -Headers $headers -Body '{"metadata":{}}' -ContentType "application/json"
$sessionId = $sessionResponse.id

Write-Host "Testing with session: $sessionId" -ForegroundColor Gray
Write-Host ""

# Test 1: English question (database has English content)
Write-Host "Test 1: English question -> English content" -ForegroundColor Yellow
$body1 = @{
    session_id = $sessionId
    question = "What is the MBA program at VinUni?"
} | ConvertTo-Json

$response1 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/query" -Method POST -Headers $headers -Body $body1 -ContentType "application/json"

Write-Host "  Confidence: $($response1.confidence)" -ForegroundColor Cyan
Write-Host "  Sources: $($response1.sources.Count)" -ForegroundColor Cyan
Write-Host "  Answer: $($response1.answer.Substring(0, [Math]::Min(100, $response1.answer.Length)))..." -ForegroundColor Gray
Write-Host ""

# Test 2: Vietnamese question (database has English content)
Write-Host "Test 2: Vietnamese question -> English content" -ForegroundColor Yellow
$body2 = @{
    session_id = $sessionId
    question = "Chuong trinh MBA cua VinUni nhu the nao?"
} | ConvertTo-Json

$response2 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/query" -Method POST -Headers $headers -Body $body2 -ContentType "application/json"

Write-Host "  Confidence: $($response2.confidence)" -ForegroundColor Cyan
Write-Host "  Sources: $($response2.sources.Count)" -ForegroundColor Cyan
Write-Host "  Answer: $($response2.answer.Substring(0, [Math]::Min(100, $response2.answer.Length)))..." -ForegroundColor Gray
Write-Host ""

# Test 3: Vietnamese question with diacritics
Write-Host "Test 3: Vietnamese with diacritics" -ForegroundColor Yellow
$body3 = @{
    session_id = $sessionId
    question = "Chương trình MBA của VinUni như thế nào?"
} | ConvertTo-Json

$response3 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/query" -Method POST -Headers $headers -Body $body3 -ContentType "application/json"

Write-Host "  Confidence: $($response3.confidence)" -ForegroundColor Cyan
Write-Host "  Sources: $($response3.sources.Count)" -ForegroundColor Cyan
Write-Host "  Answer: $($response3.answer.Substring(0, [Math]::Min(100, $response3.answer.Length)))..." -ForegroundColor Gray
Write-Host ""

# Compare confidences
Write-Host "=== COMPARISON ===" -ForegroundColor Cyan
Write-Host "English -> English: $($response1.confidence)" -ForegroundColor Yellow
Write-Host "Vietnamese -> English: $($response2.confidence)" -ForegroundColor Yellow
Write-Host "Vietnamese (diacritics) -> English: $($response3.confidence)" -ForegroundColor Yellow
Write-Host ""

if ($response2.confidence -gt 0.5) {
    Write-Host "SUCCESS! Cross-lingual search works!" -ForegroundColor Green
    Write-Host "Vietnamese questions can find English content." -ForegroundColor Green
} else {
    Write-Host "WARNING: Cross-lingual confidence is low" -ForegroundColor Yellow
    Write-Host "May need to improve query or add Vietnamese content" -ForegroundColor Yellow
}
