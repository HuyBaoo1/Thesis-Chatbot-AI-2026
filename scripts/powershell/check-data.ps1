. ("$PSScriptRoot\common.ps1")
# Check if data still exists in database and Qdrant
Write-Host "=== CHECKING DATA STATUS ===" -ForegroundColor Cyan

# 1. Check PostgreSQL
Write-Host "`n1. Checking PostgreSQL database..." -ForegroundColor Yellow
try {
    $chunks = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM content_chunks;"
    $urls = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM crawled_urls;"
    $sessions = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM crawl_sessions;"
    
    Write-Host "   Content chunks: $($chunks.Trim())" -ForegroundColor Cyan
    Write-Host "   Crawled URLs: $($urls.Trim())" -ForegroundColor Cyan
    Write-Host "   Crawl sessions: $($sessions.Trim())" -ForegroundColor Cyan
    
    if ($chunks.Trim() -eq "0") {
        Write-Host "   [WARNING] No chunks found in database!" -ForegroundColor Red
    } else {
        Write-Host "   [OK] Database has data" -ForegroundColor Green
    }
} catch {
    Write-Host "   [ERROR] Cannot connect to PostgreSQL: $_" -ForegroundColor Red
}

# 2. Check Qdrant
Write-Host "`n2. Checking Qdrant vector store..." -ForegroundColor Yellow
try {
    $qdrant = Invoke-RestMethod -Uri "http://localhost:6333/collections/crawled_content" -Method GET
    Write-Host "   Points count: $($qdrant.result.points_count)" -ForegroundColor Cyan
    Write-Host "   Vectors count: $($qdrant.result.vectors_count)" -ForegroundColor Cyan
    
    if ($qdrant.result.points_count -eq 0) {
        Write-Host "   [WARNING] No vectors found in Qdrant!" -ForegroundColor Red
    } else {
        Write-Host "   [OK] Qdrant has vectors" -ForegroundColor Green
    }
} catch {
    Write-Host "   [ERROR] Cannot connect to Qdrant: $_" -ForegroundColor Red
}

# 3. Check sample data
Write-Host "`n3. Checking sample data..." -ForegroundColor Yellow
try {
    $sample = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT url, title FROM crawled_urls LIMIT 3;"
    if ($sample) {
        Write-Host "   Sample URLs:" -ForegroundColor Cyan
        Write-Host $sample
    }
} catch {
    Write-Host "   [ERROR] Cannot query sample data: $_" -ForegroundColor Red
}

Write-Host "`n=== CHECK COMPLETED ===" -ForegroundColor Cyan
