. ("$PSScriptRoot\common.ps1")
#!/usr/bin/env pwsh
# Fix funnel_events constraint to allow chat_message


Write-Host "=== Fixing funnel_events Constraint ===" -ForegroundColor Cyan

$sql = @"
-- Drop old constraint
ALTER TABLE funnel_events DROP CONSTRAINT IF EXISTS chk_funnel_event_type;

-- Add new constraint with chat_message
ALTER TABLE funnel_events ADD CONSTRAINT chk_funnel_event_type 
CHECK (event_type IN (
  'page_view',
  'form_start',
  'form_submit',
  'chat_start',
  'chat_message',
  'application_started',
  'application_submitted',
  'enrolled'
));

-- Verify
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'chk_funnel_event_type';
"@

Write-Host "Updating constraint..." -ForegroundColor Yellow
$ContainerRuntime exec web-crawler-rag_app-postgres_1 psql -U app -d app_db -c "$sql"

Write-Host ""
Write-Host "✅ Constraint updated!" -ForegroundColor Green
Write-Host "Chat should work now. Try sending a message." -ForegroundColor Cyan
