. ("$PSScriptRoot\common.ps1")
# Restart backend with DEBUG mode enabled

Write-Host "Stopping backend..." -ForegroundColor Yellow
$ContainerRuntime stop web-crawler-rag_backend-api_1
$ContainerRuntime rm web-crawler-rag_backend-api_1

# Read API key from .env
$envContent = Get-Content .env
$apiKey = ($envContent | Select-String "^OPENAI_API_KEY=").ToString().Split("=")[1]

Write-Host "Starting backend with DEBUG=true..." -ForegroundColor Yellow

$ContainerRuntime run -d `
  --name web-crawler-rag_backend-api_1 `
  --network web-crawler-rag_rag-net `
  -p 8000:8000 `
  -e "DEBUG=true" `
  -e "OPENAI_API_KEY=$apiKey" `
  -e "OPENAI_EMBEDDING_MODEL=text-embedding-3-large" `
  -e "DATABASE_URL=postgresql+psycopg://app:app_password@app-postgres:5432/app_db" `
  -e "CELERY_BROKER_URL=redis://redis:6379/0" `
  -e "CELERY_RESULT_BACKEND=redis://redis:6379/1" `
  -e "QDRANT_URL=http://qdrant:6333" `
  -e "FIRECRAWL_API_URL=http://host.docker.internal:3002" `
  -e "LOG_LEVEL=INFO" `
  --add-host host.docker.internal:host-gateway `
  -v "${PWD}/services/web-crawler-rag-backend:/app" `
  localhost/web-crawler-rag-backend `
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Verifying environment..." -ForegroundColor Yellow
$debug = $ContainerRuntime exec web-crawler-rag_backend-api_1 env | Select-String "DEBUG"
$apiKeyCheck = $ContainerRuntime exec web-crawler-rag_backend-api_1 env | Select-String "OPENAI_API_KEY"

Write-Host "DEBUG: $debug" -ForegroundColor Cyan
if ($apiKeyCheck -match "sk-") {
    Write-Host "OPENAI_API_KEY: Set correctly" -ForegroundColor Green
} else {
    Write-Host "OPENAI_API_KEY: NOT SET!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing API..." -ForegroundColor Yellow
$headers = @{ "X-API-Key" = "test-key" }
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Headers $headers
    Write-Host "Health check: OK" -ForegroundColor Green
} catch {
    Write-Host "Health check failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Ready to regenerate embeddings!" -ForegroundColor Green
