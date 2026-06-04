. ("$PSScriptRoot\common.ps1")
#!/usr/bin/env pwsh
# Create API key for tracking


Write-Host "=== Creating Tracking API Key ===" -ForegroundColor Cyan

Write-Host "Running Python script inside container..." -ForegroundColor Yellow
$ContainerRuntime exec web-crawler-rag_backend-api_1 python scripts/create_tracking_api_key.py

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
