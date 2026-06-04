#!/usr/bin/env pwsh
# Test conversion funnel API

$baseUrl = "http://localhost:8000"

# Login
$loginBody = @{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.access_token

Write-Host "Token: $token" -ForegroundColor Green

# Test conversion funnel
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "accept" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/dashboard/conversion-funnel?from=2024-01-01&to=2026-04-18" -Headers $headers -Method Get
    Write-Host "Success!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message
    }
}
