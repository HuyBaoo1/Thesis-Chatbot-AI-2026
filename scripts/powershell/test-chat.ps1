$headers = @{ 'X-API-Key' = 'dev-api-key-12345'; 'Content-Type' = 'application/json' }

# First create a session
try {
  $r = Invoke-WebRequest -Uri 'http://localhost:5173/api/v1/chat/sessions' -Method POST -UseBasicParsing -TimeoutSec 10 -Headers $headers -Body '{"metadata":{}}'
  $session = $r.Content | ConvertFrom-Json
  $sessionId = $session.id
  Write-Output "Session created: $sessionId"
} catch {
  Write-Output "Failed to create session: $($_.Exception.Message)"
  exit 1
}

# Now send a query
$body = "{`"session_id`":`"$sessionId`",`"question`":`"hello`"}"
try {
  $r = Invoke-WebRequest -Uri 'http://localhost:5173/api/v1/chat/query' -Method POST -UseBasicParsing -TimeoutSec 30 -Headers $headers -Body $body
  Write-Output "Query Status: $($r.StatusCode)"
  Write-Output "Body: $($r.Content.Substring(0, [System.Math]::Min(500, $r.Content.Length)))"
} catch {
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd()
    Write-Output "Query HTTP $($_.Exception.Response.StatusCode.value__): $body"
  } else {
    Write-Output "Query Error: $($_.Exception.Message)"
  }
}
