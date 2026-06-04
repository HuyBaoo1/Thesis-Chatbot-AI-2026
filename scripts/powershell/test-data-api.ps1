# Test if data is accessible via API
Write-Host "=== TESTING DATA VIA API ===" -ForegroundColor Cyan

$headers = @{
    "X-API-Key" = "test-key"
}

# 1. Get content statistics
Write-Host "`n1. Content statistics..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content/stats" -Method GET -Headers $headers
    Write-Host "   Total documents: $($stats.total_documents)" -ForegroundColor Cyan
    Write-Host "   Total sessions: $($stats.total_sessions)" -ForegroundColor Cyan
    Write-Host "   Avg content size: $($stats.avg_content_size)" -ForegroundColor Cyan
} catch {
    Write-Host "   [ERROR] $_" -ForegroundColor Red
}

# 2. Get crawled content
Write-Host "`n2. Crawled content (first 5)..." -ForegroundColor Yellow
try {
    $content = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content?page=1&page_size=5" -Method GET -Headers $headers
    Write-Host "   Total items: $($content.total)" -ForegroundColor Cyan
    Write-Host "   Items on page: $($content.items.Count)" -ForegroundColor Cyan
    
    if ($content.items.Count -gt 0) {
        Write-Host "`n   Sample URLs:" -ForegroundColor Gray
        foreach ($item in $content.items) {
            Write-Host "   - $($item.url)" -ForegroundColor Gray
            Write-Host "     Title: $($item.title)" -ForegroundColor DarkGray
        }
    }
} catch {
    Write-Host "   [ERROR] $_" -ForegroundColor Red
}

# 3. Test search
Write-Host "`n3. Testing search..." -ForegroundColor Yellow
try {
    $body = @{
        question = "VinUni"
        top_k = 3
    } | ConvertTo-Json
    
    $search = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat/search" -Method POST -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "   Found $($search.results.Count) results" -ForegroundColor Cyan
    
    if ($search.results.Count -gt 0) {
        Write-Host "`n   Top result:" -ForegroundColor Gray
        $top = $search.results[0]
        Write-Host "   - Score: $($top.score)" -ForegroundColor Gray
        Write-Host "   - URL: $($top.metadata.url)" -ForegroundColor Gray
        Write-Host "   - Text: $($top.text.Substring(0, [Math]::Min(100, $top.text.Length)))..." -ForegroundColor DarkGray
    }
} catch {
    Write-Host "   [ERROR] $_" -ForegroundColor Red
}

Write-Host "`n=== TEST COMPLETED ===" -ForegroundColor Cyan
