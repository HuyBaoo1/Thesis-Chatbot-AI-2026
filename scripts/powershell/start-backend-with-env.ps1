. ("$PSScriptRoot\common.ps1")
# Start backend with correct environment variables

# Read API key from .env
$envContent = Get-Content .env
$apiKey = ($envContent | Select-String "^OPENAI_API_KEY=").ToString().Split("=")[1]

Write-Host "Starting backend with API key: $($apiKey.Substring(0,20))..." -ForegroundColor Yellow

$ContainerRuntime run -d `
  --name web-crawler-rag_backend-api_1 `
  --network web-crawler-rag_rag-net `
  -p 8000:8000 `
  -e "OPENAI_API_KEY=$apiKey" `
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

Start-Sleep -Seconds 3
Write-Host ""
Write-Host "Checking health..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:8000/health" | ConvertTo-Json

Write-Host ""
Write-Host "Verifying API key in container..." -ForegroundColor Yellow
$keyInContainer = $ContainerRuntime exec web-crawler-rag_backend-api_1 env | Select-String "OPENAI_API_KEY"
if ($keyInContainer -match "sk-") {
    Write-Host "API key is set correctly" -ForegroundColor Green
} else {
    Write-Host "WARNING: API key not set!" -ForegroundColor Red
}
