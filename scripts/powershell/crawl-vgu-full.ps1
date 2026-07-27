# Crawl the official VGU admissions website through the current backend API.
param(
    [string]$ApiUrl = "http://localhost:8000",
    [int]$Limit = 100,
    [string]$AccessToken = "",
    [string]$Origin = ""
)

$ErrorActionPreference = "Stop"

Write-Host "Creating crawl session for VGU Admissions..." -ForegroundColor Green

$sessionBody = @{
    target_url = "https://vgu.edu.vn/admission"
    limit = $Limit
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}
if ($AccessToken) {
    $headers["Authorization"] = "Bearer $AccessToken"
}
if ($Origin) {
    $headers["Origin"] = $Origin
}

try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/crawl/sessions/" -Method POST -Body $sessionBody -Headers $headers
    $sessionId = $response.id

    Write-Host "Session created and queued: $sessionId" -ForegroundColor Green
    Write-Host "Monitor progress in the Admin Dashboard: /admin/web-crawler" -ForegroundColor Cyan

    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 5
        $status = Invoke-RestMethod -Uri "$ApiUrl/api/crawl/sessions/$sessionId" -Method GET -Headers $headers

        $completed = $status.completed_pages
        $total = $status.total_pages
        $progress = if ($total -gt 0) { [math]::Round(($completed / $total) * 100, 1) } else { 0 }

        Write-Host "Progress: $completed / $total pages ($progress%) - Status: $($status.status)"

        if ($status.status -eq "COMPLETED" -or $status.status -eq "FAILED") {
            break
        }
    }

    Write-Host "Next step: review crawled pages, then send reviewed pages to Knowledge Base." -ForegroundColor Yellow
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    throw
}
