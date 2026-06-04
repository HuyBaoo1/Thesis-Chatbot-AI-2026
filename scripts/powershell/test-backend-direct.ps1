. ("$PSScriptRoot\common.ps1")
# Direct test of backend without dashboard
Write-Host "=== Testing Backend Directly ===" -ForegroundColor Cyan

# Test 1: Health check
Write-Host "`n1. Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5
    Write-Host "   Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Backend is not running or not responding" -ForegroundColor Red
    exit 1
}

# Test 2: Create session
Write-Host "`n2. Create Chat Session" -ForegroundColor Yellow
try {
    $headers = @{
        "X-API-Key" = "test-api-key-12345"
        "Content-Type" = "application/json"
    }
    
    $sessionBody = @{ metadata = @{} } | ConvertTo-Json
    $session = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/sessions" -Method POST -Headers $headers -Body $sessionBody
    Write-Host "   Session ID: $($session.id)" -ForegroundColor Green
    $sessionId = $session.id
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}

# Test 3: Send query
Write-Host "`n3. Send Query" -ForegroundColor Yellow
try {
    $queryBody = @{
        session_id = $sessionId
        question = "What is VinUni?"
    } | ConvertTo-Json
    
    Write-Host "   Sending query..." -ForegroundColor Gray
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/query" -Method POST -Headers $headers -Body $queryBody -TimeoutSec 30
    
    Write-Host "   Confidence: $($response.confidence)" -ForegroundColor Green
    Write-Host "   Is Fallback: $($response.is_fallback)" -ForegroundColor Green
    Write-Host "   Answer: $($response.answer.Substring(0, [Math]::Min(100, $response.answer.Length)))..." -ForegroundColor Gray
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    
    Write-Host "`n   Checking backend logs..." -ForegroundColor Yellow
    $ContainerRuntime logs --tail 30 web-crawler-rag_backend-api_1
    exit 1
}

Write-Host "`n=== All Tests Passed! ===" -ForegroundColor Green
