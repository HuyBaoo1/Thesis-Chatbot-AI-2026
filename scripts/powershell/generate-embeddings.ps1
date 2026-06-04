# Script to generate embeddings for a crawl session
param(
    [Parameter(Mandatory=$true)]
    [string]$SessionId
)

$apiUrl = "http://localhost:8000"
$apiKey = "dev-api-key-12345"

Write-Host "Generating embeddings for session: $SessionId" -ForegroundColor Green

$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = $apiKey
}

try {
    # Start embedding generation
    Write-Host "Starting embedding generation..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$apiUrl/api/v1/content/session/$SessionId/generate-embeddings" -Method POST -Headers $headers
    
    Write-Host "✓ Embedding generation started!" -ForegroundColor Green
    Write-Host ""
    
    # Poll progress
    Write-Host "Monitoring progress..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    for ($i = 0; $i -lt 120; $i++) {
        $progress = Invoke-RestMethod -Uri "$apiUrl/api/v1/content/session/$SessionId/embedding-progress" -Method GET -Headers $headers
        
        $completed = $progress.content_with_embeddings
        $total = $progress.total_content
        $chunks = $progress.total_chunks
        $percentage = $progress.progress_percentage
        
        Write-Host "`rProgress: $completed / $total content items ($percentage%) - Total chunks: $chunks" -NoNewline
        
        if ($progress.status -eq "completed") {
            Write-Host ""
            break
        }
        
        Start-Sleep -Seconds 5
    }
    
    Write-Host ""
    Write-Host ""
    Write-Host "✓ Embedding generation completed!" -ForegroundColor Green
    Write-Host "Total chunks created: $chunks" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now query the chatbot at: http://localhost:5173/" -ForegroundColor Yellow
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
