. ("$PSScriptRoot\common.ps1")
# Test if success rate fix is working
Write-Host "=== Testing Success Rate Fix ===" -ForegroundColor Cyan

# Check if new messages have confidence_score
Write-Host "`nChecking recent messages in database..." -ForegroundColor Yellow
$ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -c "SELECT id, confidence_score, is_fallback, LEFT(normalized_question, 30) as norm_q, LEFT(content, 50) as content_preview FROM conversation_messages WHERE role = 'assistant' ORDER BY timestamp DESC LIMIT 5;"

# Check success rate calculation
Write-Host "`nChecking success rate for top questions..." -ForegroundColor Yellow
$ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -c "
WITH question_stats AS (
  SELECT
    faq.question,
    faq.normalized,
    faq.frequency_count as count,
    (
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 0.0
          WHEN COUNT(*) FILTER (WHERE m.confidence_score IS NOT NULL AND m.confidence_score >= 0.7) > 0 THEN
            COUNT(*) FILTER (WHERE m.confidence_score >= 0.7)::float / COUNT(*)
          ELSE
            1.0 - (COUNT(*) FILTER (WHERE m.is_fallback = 'true')::float / NULLIF(COUNT(*), 0))
        END
      FROM conversation_messages m
      WHERE m.normalized_question = faq.normalized
        AND m.role = 'assistant'
    ) as success_rate
  FROM faq_analytics faq
)
SELECT LEFT(question, 60) as question, count, ROUND(success_rate::numeric, 2) as success_rate
FROM question_stats
ORDER BY count DESC
LIMIT 10;
"

Write-Host "`nDone!" -ForegroundColor Green
