# PowerShell script to restart services after enabling evaluation agent

Write-Host "🔄 Restarting services to enable Response Evaluation Agent..." -ForegroundColor Cyan
Write-Host ""

# Check if using podman-compose or docker-compose
$COMPOSE_CMD = $null
if (Get-Command podman-compose -ErrorAction SilentlyContinue) {
    $COMPOSE_CMD = "podman-compose"
    Write-Host "✓ Using podman-compose" -ForegroundColor Green
} elseif (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $COMPOSE_CMD = "docker-compose"
    Write-Host "✓ Using docker-compose" -ForegroundColor Green
} else {
    Write-Host "❌ Error: Neither podman-compose nor docker-compose found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Current containers:" -ForegroundColor Yellow
if ($COMPOSE_CMD -eq "podman-compose") {
    podman ps --format "table {{.Names}}`t{{.Status}}"
} else {
    docker ps --format "table {{.Names}}`t{{.Status}}"
}

Write-Host ""
Write-Host "🔄 Restarting backend and celery-worker..." -ForegroundColor Cyan

# Try restart first
& $COMPOSE_CMD restart backend celery-worker

# If restart doesn't work, try down/up
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Restart command not available, using down/up instead..." -ForegroundColor Yellow
    & $COMPOSE_CMD down backend celery-worker
    & $COMPOSE_CMD up -d backend celery-worker
}

Write-Host ""
Write-Host "✅ Services restarted!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Checking status..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

if ($COMPOSE_CMD -eq "podman-compose") {
    podman ps --filter "name=backend" --filter "name=celery" --format "table {{.Names}}`t{{.Status}}"
} else {
    docker ps --filter "name=backend" --filter "name=celery" --format "table {{.Names}}`t{{.Status}}"
}

Write-Host ""
Write-Host "🎉 Evaluation Agent is now active!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test with a RAG query"
Write-Host "  2. Check logs: $COMPOSE_CMD logs -f backend | Select-String -Pattern 'evaluation'"
Write-Host "  3. View metrics: curl http://localhost:8001/api/v1/evaluation/metrics"
Write-Host ""
Write-Host "📚 Full documentation: docs/EVALUATION_AGENT_SETUP.md" -ForegroundColor Cyan
