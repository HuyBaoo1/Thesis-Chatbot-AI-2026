# Script to crawl full VinUni Admissions website
$apiUrl = "http://localhost:8000"
$apiKey = "dev-api-key-12345"

Write-Host "Creating crawl session for VinUni Admissions..." -ForegroundColor Green

# Create session
$sessionBody = @{
    name = "VinUni Admissions Full Crawl"
    start_urls = @("https://admissions.vinuni.edu.vn/")
    max_depth = 3
    max_pages = 100
    include_patterns = @("admissions.vinuni.edu.vn/*")
    exclude_patterns = @()
    follow_links = $true
    respect_robots_txt = $true
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = $apiKey
}

try {
    $response = Invoke-RestMethod -Uri "$apiUrl/api/v1/sessions" -Method POST -Body $sessionBody -Headers $headers
    $sessionId = $response.id
    
    Write-Host "✓ Session created: $sessionId" -ForegroundColor Green
    Write-Host ""
    
    # Start crawl
    Write-Host "Starting crawl..." -ForegroundColor Yellow
    $crawlResponse = Invoke-RestMethod -Uri "$apiUrl/api/v1/sessions/$sessionId/start" -Method POST -Headers $headers
    
    Write-Host "✓ Crawl started!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Monitor progress at: http://localhost:5173/" -ForegroundColor Cyan
    Write-Host "Session ID: $sessionId" -ForegroundColor Cyan
    Write-Host ""
    
    # Poll status
    Write-Host "Checking status..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    for ($i = 0; $i -lt 60; $i++) {
        $status = Invoke-RestMethod -Uri "$apiUrl/api/v1/sessions/$sessionId" -Method GET -Headers $headers
        
        $crawled = $status.urls_crawled
        $total = $status.total_urls
        $progress = if ($total -gt 0) { [math]::Round(($crawled / $total) * 100, 1) } else { 0 }
        
        Write-Host "`rProgress: $crawled / $total URLs ($progress%) - Status: $($status.status)" -NoNewline
        
        if ($status.status -eq "completed" -or $status.status -eq "failed") {
            Write-Host ""
            break
        }
        
        Start-Sleep -Seconds 5
    }
    
    Write-Host ""
    Write-Host ""
    Write-Host "Crawl completed!" -ForegroundColor Green
    Write-Host "Next step: Generate embeddings in the dashboard" -ForegroundColor Yellow
    Write-Host "Or run: .\generate-embeddings.ps1 $sessionId" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
