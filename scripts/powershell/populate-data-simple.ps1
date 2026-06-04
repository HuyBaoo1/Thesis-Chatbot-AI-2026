. ("$PSScriptRoot\common.ps1")
#!/usr/bin/env pwsh
# Populate analytics data - Simple version


Write-Host "=== Populating Analytics Data ===" -ForegroundColor Cyan

# Run populate script inside container
Write-Host "Running populate script..." -ForegroundColor Yellow
$ContainerRuntime exec web-crawler-rag_backend-api_1 python scripts/populate_analytics_data.py

Write-Host ""
Write-Host "Done! Now run: .\get-dashboard-data.ps1" -ForegroundColor Green
