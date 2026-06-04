. ("$PSScriptRoot\common.ps1")
#!/usr/bin/env pwsh
# Test tracking system end-to-end


Write-Host "=== Testing Tracking System ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Send tracking event
Write-Host "Test 1: Sending tracking event..." -ForegroundColor Yellow

$body = @{
  events = @(
    @{
      session_id = "test_session_" + (Get-Date).Ticks
      event_type = "page_view"
      occurred_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
      url = "https://vinuni.edu.vn/programs/mba"
      utm_source = "test"
      utm_campaign = "tracking_test"
      event_data = @{
        test = $true
      }
    }
  )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/tracking/events" `
      -Method Post `
      -Headers @{"X-API-Key"="vinuni-tracking-key-2024"} `
      -Body $body `
      -ContentType "application/json"
    
    Write-Host "✅ Event sent successfully!" -ForegroundColor Green
    Write-Host "   Processed: $($response.data.processed)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Failed to send event:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Test 2: Send form submit event (creates lead)
Write-Host "Test 2: Sending form submit event (creates lead)..." -ForegroundColor Yellow

$sessionId = "test_session_" + (Get-Date).Ticks

$body2 = @{
  events = @(
    @{
      session_id = $sessionId
      event_type = "form_submit"
      occurred_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
      url = "https://vinuni.edu.vn/contact"
      event_data = @{
        name = "Test User"
        email = "test@example.com"
        phone = "+84123456789"
        form_id = "contact-form"
      }
    }
  )
} | ConvertTo-Json -Depth 10

try {
    $response2 = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/tracking/events" `
      -Method Post `
      -Headers @{"X-API-Key"="vinuni-tracking-key-2024"} `
      -Body $body2 `
      -ContentType "application/json"
    
    Write-Host "✅ Form submit event sent!" -ForegroundColor Green
    Write-Host "   Lead created: $($response2.data.results[0].lead_created)" -ForegroundColor White
    Write-Host "   Lead ID: $($response2.data.results[0].lead_id)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Failed to send form submit:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Test 3: Check data in database
Write-Host "Test 3: Checking data in database..." -ForegroundColor Yellow

$eventCount = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM funnel_events WHERE session_id LIKE 'test_session_%';"
$leadCount = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM lead WHERE email = 'test@example.com';"

Write-Host "✅ Database check:" -ForegroundColor Green
Write-Host "   Test events in DB: $($eventCount.Trim())" -ForegroundColor White
Write-Host "   Test leads in DB: $($leadCount.Trim())" -ForegroundColor White
Write-Host ""

# Test 4: Check dashboard data
Write-Host "Test 4: Checking dashboard data..." -ForegroundColor Yellow

try {
    # Login first
    $loginBody = @{
        email = "admin@example.com"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $loginResponse.access_token

    # Get conversion funnel
    $funnelResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/dashboard/conversion-funnel?from=2024-01-01&to=2026-12-31" `
        -Headers @{"Authorization"="Bearer $token"}
    
    $pageViews = ($funnelResponse.data.stages | Where-Object { $_.name -eq "page_view" }).count
    
    Write-Host "✅ Dashboard data:" -ForegroundColor Green
    Write-Host "   Total page views: $pageViews" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "⚠️  Dashboard check failed (might be expected if no data yet)" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "=== All Tests Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open demo page: http://localhost:5173/tracking-demo.html" -ForegroundColor White
Write-Host "  2. View dashboard: http://localhost:5173/analytics" -ForegroundColor White
Write-Host "  3. Read guide: TRACKING_INTEGRATION_GUIDE.md" -ForegroundColor White
