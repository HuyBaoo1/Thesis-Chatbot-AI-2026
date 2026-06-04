. ("$PSScriptRoot\common.ps1")
#!/usr/bin/env pwsh
# Get dashboard data with authentication

Write-Host "=== Dashboard Data Viewer ===" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
$backendRunning = $ContainerRuntime ps --filter "name=backend-api" --format "{{.Names}}" 2>$null
if (-not $backendRunning) {
    Write-Host "ERROR: Backend container is not running!" -ForegroundColor Red
    exit 1
}

# Create test user and get token
Write-Host "Step 1: Creating test user and getting auth token..." -ForegroundColor Green
$ContainerRuntime exec web-crawler-rag_backend-api_1 python scripts/create_test_user.py

# Login to get token
Write-Host "Step 2: Logging in..." -ForegroundColor Green
$loginBody = @{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.access_token
    Write-Host "Success: Login successful" -ForegroundColor Green
} catch {
    Write-Host "Error: Login failed - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$from = "2024-01-01"
$to = (Get-Date).ToString("yyyy-MM-dd")

Write-Host ""
Write-Host "Step 3: Fetching dashboard data..." -ForegroundColor Green
Write-Host ""

# Hot Questions
Write-Host "=== Hot Questions ===" -ForegroundColor Yellow
try {
    $url = "http://localhost:8000/api/v1/dashboard/hot-questions?from=$from" + "&to=$to" + "&limit=10"
    $hotQuestions = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    Write-Host "Total questions: $($hotQuestions.total)" -ForegroundColor Cyan
    Write-Host "Date range: $($hotQuestions.from) to $($hotQuestions.to)" -ForegroundColor Cyan
    Write-Host ""
    if ($hotQuestions.questions.Count -gt 0) {
        Write-Host "Top 5 questions:" -ForegroundColor White
        foreach ($q in ($hotQuestions.questions | Select-Object -First 5)) {
            Write-Host "  - [$($q.temperature)] $($q.representative_question)" -ForegroundColor Gray
            Write-Host "    Frequency: $($q.frequency_count), Success rate: $($q.success_rate)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  No questions found" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error: Failed - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Conversion Funnel
Write-Host "=== Conversion Funnel ===" -ForegroundColor Yellow
try {
    $url = "http://localhost:8000/api/v1/dashboard/conversion-funnel?from=$from" + "&to=$to"
    $funnel = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    Write-Host "Date range: $($funnel.from) to $($funnel.to)" -ForegroundColor Cyan
    Write-Host ""
    if ($funnel.stages.Count -gt 0) {
        Write-Host "Funnel stages:" -ForegroundColor White
        foreach ($stage in $funnel.stages) {
            Write-Host "  $($stage.stage): $($stage.count) users ($($stage.conversion_rate) conversion)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  No funnel data found" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error: Failed - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Leads
Write-Host "=== Leads ===" -ForegroundColor Yellow
try {
    $url = "http://localhost:8000/api/v1/dashboard/leads?from=$from" + "&to=$to" + "&limit=10"
    $leads = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    Write-Host "Total leads: $($leads.total)" -ForegroundColor Cyan
    Write-Host "Date range: $($leads.from) to $($leads.to)" -ForegroundColor Cyan
    Write-Host ""
    if ($leads.leads.Count -gt 0) {
        Write-Host "Top 5 leads:" -ForegroundColor White
        foreach ($lead in ($leads.leads | Select-Object -First 5)) {
            Write-Host "  - $($lead.name): Score $($lead.score), Status: $($lead.status)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  No leads found" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error: Failed - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "View full dashboard at: http://localhost:5173/analytics" -ForegroundColor Yellow
Write-Host "API docs: http://localhost:8000/docs" -ForegroundColor Yellow
