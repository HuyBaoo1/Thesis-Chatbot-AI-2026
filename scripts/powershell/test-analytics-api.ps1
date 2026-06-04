#!/usr/bin/env pwsh
# Test analytics API endpoints

Write-Host "=== Test Analytics API ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8000"
$from = "2024-01-01"
$to = (Get-Date).ToString("yyyy-MM-dd")

# Get auth token (if needed)
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "Testing analytics endpoints..." -ForegroundColor Green
Write-Host ""

# Test 1: Hot Questions
Write-Host "1. Hot Questions:" -ForegroundColor Yellow
$url = "$baseUrl/api/v1/dashboard/hot-questions?from=$from&to=$to&limit=5"
Write-Host "   GET $url" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    Write-Host "   ✓ Success: Found $($response.questions.Count) hot questions" -ForegroundColor Green
    if ($response.questions.Count -gt 0) {
        $q = $response.questions[0]
        Write-Host "     Top question: $($q.representative_question)" -ForegroundColor Cyan
        Write-Host "     Frequency: $($q.frequency_count), Success rate: $($q.success_rate)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Conversion Funnel
Write-Host "2. Conversion Funnel:" -ForegroundColor Yellow
$url = "$baseUrl/api/v1/dashboard/conversion-funnel?from=$from&to=$to"
Write-Host "   GET $url" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    Write-Host "   ✓ Success: Found $($response.stages.Count) funnel stages" -ForegroundColor Green
    foreach ($stage in $response.stages) {
        Write-Host "     $($stage.stage): $($stage.count) users ($($stage.conversion_rate)% conversion)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Leads
Write-Host "3. Leads:" -ForegroundColor Yellow
$url = "$baseUrl/api/v1/dashboard/leads?from=$from&to=$to&limit=5"
Write-Host "   GET $url" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    Write-Host "   ✓ Success: Found $($response.total) leads" -ForegroundColor Green
    if ($response.leads.Count -gt 0) {
        $lead = $response.leads[0]
        Write-Host "     Lead: $($lead.name), Score: $($lead.score), Status: $($lead.status)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Mock endpoint
Write-Host "4. Mock Data (for dev):" -ForegroundColor Yellow
$url = "$baseUrl/api/v1/dashboard/mock/hot-questions"
Write-Host "   GET $url" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    Write-Host "   ✓ Success: Mock data available" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "View full API docs at: http://localhost:8000/docs" -ForegroundColor Yellow
