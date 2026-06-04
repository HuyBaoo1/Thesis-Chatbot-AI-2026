. ("$PSScriptRoot\common.ps1")
#!/usr/bin/env pwsh
# Check if dashboard is showing real data


Write-Host "=== Checking Dashboard Data Sources ===" -ForegroundColor Cyan
Write-Host ""

# Check 1: Hot Questions
Write-Host "1. HOT QUESTIONS (Câu hỏi Hot)" -ForegroundColor Yellow
Write-Host "   Source: faq_analytics table" -ForegroundColor Gray
$faqCount = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM faq_analytics;" 2>$null
$faqCountNum = if ($faqCount) { [int]($faqCount -join '' | Out-String).Trim() } else { 0 }
Write-Host "   Total entries: $faqCountNum" -ForegroundColor White

if ($faqCountNum -gt 0) {
    Write-Host "   ✅ HAS REAL DATA" -ForegroundColor Green
    $sample = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -c "SELECT normalized, question_count, intent FROM faq_analytics ORDER BY question_count DESC LIMIT 3;" 2>$null
    Write-Host $sample
} else {
    Write-Host "   ❌ NO DATA (showing mock/empty)" -ForegroundColor Red
}

# Check 2: Conversion Funnel
Write-Host ""
Write-Host "2. CONVERSION FUNNEL (Phễu chuyển đổi)" -ForegroundColor Yellow
Write-Host "   Source: funnel_events table" -ForegroundColor Gray
$eventCount = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM funnel_events;" 2>$null
$eventCountNum = if ($eventCount) { [int]($eventCount -join '' | Out-String).Trim() } else { 0 }
Write-Host "   Total events: $eventCountNum" -ForegroundColor White

if ($eventCountNum -gt 0) {
    Write-Host "   ✅ HAS REAL DATA" -ForegroundColor Green
    $events = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -c "SELECT event_type, COUNT(*) as count FROM funnel_events GROUP BY event_type ORDER BY count DESC;"
    Write-Host $events
} else {
    Write-Host "   ❌ NO DATA (showing mock/empty)" -ForegroundColor Red
}

# Check 3: Lead Scoring
Write-Host ""
Write-Host "3. LEAD SCORING (Điểm Lead)" -ForegroundColor Yellow
Write-Host "   Source: lead table" -ForegroundColor Gray
$leadCount = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -t -c "SELECT COUNT(*) FROM lead;" 2>$null
$leadCountNum = if ($leadCount) { [int]($leadCount -join '' | Out-String).Trim() } else { 0 }
Write-Host "   Total leads: $leadCountNum" -ForegroundColor White

if ($leadCountNum -gt 0) {
    Write-Host "   ✅ HAS REAL DATA" -ForegroundColor Green
    $leads = $ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -c "SELECT name, score, status FROM lead ORDER BY score DESC LIMIT 5;"
    Write-Host $leads
} else {
    Write-Host "   ❌ NO DATA (showing mock/empty)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== VERDICT ===" -ForegroundColor Cyan

$faqReal = $faqCountNum -gt 0
$funnelReal = $eventCountNum -gt 0
$leadReal = $leadCountNum -gt 0

if ($faqReal -and $funnelReal -and $leadReal) {
    Write-Host "✅ ALL 3 SECTIONS SHOWING REAL DATA!" -ForegroundColor Green
} elseif ($faqReal -or $funnelReal -or $leadReal) {
    Write-Host "⚠️  MIXED: Some sections have real data, some don't" -ForegroundColor Yellow
    Write-Host "   Hot Questions: $(if($faqReal){'✅ Real'}else{'❌ Empty'})" -ForegroundColor White
    Write-Host "   Conversion Funnel: $(if($funnelReal){'✅ Real'}else{'❌ Empty'})" -ForegroundColor White
    Write-Host "   Lead Scoring: $(if($leadReal){'✅ Real'}else{'❌ Empty'})" -ForegroundColor White
} else {
    Write-Host "❌ NO REAL DATA - All sections empty or showing mock data" -ForegroundColor Red
}

Write-Host ""
Write-Host "To populate data:" -ForegroundColor Cyan
Write-Host "  - For testing: .\populate-data-simple.ps1" -ForegroundColor White
Write-Host "  - For real data: Use the system (chat, forms, tracking)" -ForegroundColor White
