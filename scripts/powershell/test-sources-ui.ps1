# Test Sources UI improvements
Write-Host "=== TESTING SOURCES UI IMPROVEMENTS ===" -ForegroundColor Cyan

$headers = @{
    "X-API-Key" = "test-key"
}

# Test 1: Create session
Write-Host "`nTest 1: Creating chat session..." -ForegroundColor Yellow
try {
    $sessionResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/sessions" `
        -Method POST `
        -Headers $headers `
        -Body '{"metadata":{}}' `
        -ContentType "application/json"
    
    $sessionId = $sessionResponse.id
    Write-Host "[OK] Session created: $sessionId" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to create session: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Query with English question
Write-Host "`nTest 2: Testing English query..." -ForegroundColor Yellow
$body = @{
    session_id = $sessionId
    question = "How can I contact the admission office?"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/query" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "[OK] Query successful" -ForegroundColor Green
    Write-Host "  Confidence: $($response.confidence)" -ForegroundColor Gray
    Write-Host "  Sources: $($response.sources.Count)" -ForegroundColor Gray
    
    # Check new fields in sources
    if ($response.sources.Count -gt 0) {
        $source = $response.sources[0]
        Write-Host "`n  Source 1 Details:" -ForegroundColor Cyan
        Write-Host "    Title: $($source.title)" -ForegroundColor Gray
        Write-Host "    Domain: $($source.domain)" -ForegroundColor Gray
        Write-Host "    Path Preview: $($source.path_preview)" -ForegroundColor Gray
        Write-Host "    Relevance: $($source.relevance_percentage)%" -ForegroundColor Gray
        Write-Host "    Excerpt: $($source.excerpt.Substring(0, [Math]::Min(80, $source.excerpt.Length)))..." -ForegroundColor Gray
        
        # Verify new fields exist
        if ($source.domain -and $source.relevance_percentage -ne $null) {
            Write-Host "`n  [OK] New fields present (domain, relevance_percentage)" -ForegroundColor Green
        } else {
            Write-Host "`n  [ERROR] New fields missing!" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "[ERROR] Query failed: $_" -ForegroundColor Red
}

# Test 3: Query with Vietnamese question
Write-Host "`nTest 3: Testing Vietnamese query..." -ForegroundColor Yellow
$body = @{
    session_id = $sessionId
    question = "Lam the nao de lien he voi phong tuyen sinh?"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/query" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "[OK] Query successful" -ForegroundColor Green
    Write-Host "  Confidence: $($response.confidence)" -ForegroundColor Gray
    Write-Host "  Sources: $($response.sources.Count)" -ForegroundColor Gray
    
    if ($response.sources.Count -gt 0) {
        Write-Host "  [OK] Sources returned with new format" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] Query failed: $_" -ForegroundColor Red
}

# Test 4: Check for duplicate URLs
Write-Host "`nTest 4: Checking for duplicate URLs..." -ForegroundColor Yellow
$body = @{
    session_id = $sessionId
    question = "Tell me about VinUni programs"
    top_k = 10
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/query" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json"
    
    $urls = $response.sources | ForEach-Object { $_.url }
    $uniqueUrls = $urls | Select-Object -Unique
    
    if ($urls.Count -eq $uniqueUrls.Count) {
        Write-Host "  [OK] No duplicate URLs ($($urls.Count) unique sources)" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Found duplicates: $($urls.Count) total, $($uniqueUrls.Count) unique" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Query failed: $_" -ForegroundColor Red
}

# Test 5: Verify sources are sorted by relevance
Write-Host "`nTest 5: Verifying sources sorted by relevance..." -ForegroundColor Yellow
if ($response.sources.Count -gt 1) {
    $sorted = $true
    for ($i = 0; $i -lt ($response.sources.Count - 1); $i++) {
        if ($response.sources[$i].relevance_score -lt $response.sources[$i + 1].relevance_score) {
            $sorted = $false
            break
        }
    }
    
    if ($sorted) {
        Write-Host "  [OK] Sources are sorted by relevance (descending)" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Sources are NOT sorted correctly" -ForegroundColor Red
    }
}

Write-Host "`n=== TESTS COMPLETED ===" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3000/chat in your browser" -ForegroundColor Gray
Write-Host "2. Ask a question and verify the new card-based Sources UI" -ForegroundColor Gray
Write-Host "3. Check that sources show:" -ForegroundColor Gray
Write-Host "   - Card layout with icon" -ForegroundColor Gray
Write-Host "   - Domain name (not full URL)" -ForegroundColor Gray
Write-Host "   - Relevance percentage" -ForegroundColor Gray
Write-Host "   - Excerpt preview" -ForegroundColor Gray
Write-Host "   - Clickable View Page link" -ForegroundColor Gray
