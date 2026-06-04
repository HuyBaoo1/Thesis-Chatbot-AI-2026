# Test the exact API call that dashboard makes
Write-Host "=== TESTING DASHBOARD API CALLS ===" -ForegroundColor Cyan

$headers = @{
    "X-API-Key" = "test-key"
}

# Test the content list endpoint (what dashboard calls on load)
Write-Host "`nTesting: GET /api/v1/content?page=1&page_size=20" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content?page=1&page_size=20" -Method GET -Headers $headers
    
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host "  Total items: $($response.total)" -ForegroundColor Green
    Write-Host "  Page: $($response.page)" -ForegroundColor Green
    Write-Host "  Page size: $($response.page_size)" -ForegroundColor Green
    Write-Host "  Total pages: $($response.total_pages)" -ForegroundColor Green
    Write-Host "  Items returned: $($response.items.Count)" -ForegroundColor Green
    
    if ($response.items.Count -gt 0) {
        Write-Host "`n  First item:" -ForegroundColor Gray
        $first = $response.items[0]
        Write-Host "    ID: $($first.id)" -ForegroundColor Gray
        Write-Host "    URL: $($first.url)" -ForegroundColor Gray
        Write-Host "    Title: $($first.title)" -ForegroundColor Gray
        Write-Host "    Crawled at: $($first.crawled_at)" -ForegroundColor Gray
    }
    
    Write-Host "`n[SUCCESS] API is returning data correctly!" -ForegroundColor Green
    Write-Host "Dashboard should show $($response.total) documents" -ForegroundColor Yellow
    
} catch {
    Write-Host "[ERROR] $_" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode -ForegroundColor Red
}

Write-Host "`n=== TEST COMPLETED ===" -ForegroundColor Cyan
Write-Host "`nIf dashboard still shows 0:" -ForegroundColor Yellow
Write-Host "  1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor Gray
Write-Host "  2. Hard refresh (Ctrl+F5)" -ForegroundColor Gray
Write-Host "  3. Check browser console for errors (F12)" -ForegroundColor Gray
Write-Host "  4. Restart dashboard: cd services/web-crawler-rag-dashboard && npm run dev" -ForegroundColor Gray
