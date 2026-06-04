# Scripts Directory

Thư mục chứa các automation scripts, organized by platform.

## Structure

```
scripts/
├── powershell/    # .ps1 scripts (Windows PowerShell)
├── python/        # .py scripts (cross-platform)
├── bash/          # .sh / .bat scripts (Unix shell + Windows batch)
└── README.md      # This file
```

## PowerShell (`powershell/`)

### Shared
- `common.ps1` - **Auto-detect container runtime** (podman/docker). Sourced by all scripts.

### Development
- `start-web-crawler-rag.ps1` - Start toàn bộ hệ thống
- `stop-web-crawler-rag.ps1` - Stop toàn bộ hệ thống
- `start-rag-simple.ps1` - Start simple mode
- `start-dashboard.ps1` - Start dashboard only
- `start-backend-with-env.ps1` - Start backend với env vars

### Restart & Rebuild
- `restart-backend-*.ps1` - Các script restart backend
- `rebuild-backend*.ps1` - Rebuild backend containers
- `quick-restart-backend.ps1` / `simple-restart.ps1` - Quick restart
- `force-restart-backend.ps1` - Force restart

### Data Management
- `crawl-vinuni-full.ps1` - Crawl VinUni website
- `generate-embeddings.ps1` / `regenerate-embeddings-simple.ps1` - Embeddings
- `clear-and-regenerate-embeddings.ps1` / `reset-and-regenerate.ps1` - Clear & regenerate
- `populate-analytics-data.ps1` / `populate-data-simple.ps1` - Populate data
- `export-data.ps1` / `export-crawl-markdown.ps1` - Export data

### Testing
- `test-*.ps1` - Test scripts (chat, analytics, tracking, etc.)
- `monitor-and-test.ps1` - Monitor và test

### Diagnostic
- `diagnose-backend.ps1` - Diagnose backend issues
- `check-*.ps1` - Check logs, data, sources
- `watch-logs-live.ps1` / `show-error-logs.ps1` - View logs

### Fix
- `fix-*.ps1` - Fix scripts (embeddings, network, dashboard, etc.)
- `restore-from-backup.ps1` - Restore từ backup

### Setup & Utility
- `setup-podman-alias.ps1` / `setup-powershell-profile.ps1` / `fix-podman-path.ps1` - Setup
- `clear-python-cache.ps1` - Clear Python cache
- `create-tracking-api-key.ps1` - Create tracking API key
- `upgrade-to-large-embeddings.ps1` - Upgrade embeddings

### AI Logging
- `windsurf-auto-log.ps1` / `kiro-auto-log.ps1` - Auto-log wrappers
- `log-kiro-session.ps1` / `log-current-conversation.ps1` - Manual logging
- `auto-fetch-pr-reviews.ps1` - Auto-fetch PR reviews

## Python (`python/`)

### AI Prompt Logging
- `log_hook.py` - Main AI prompt logger (called by all tools)
- `cursor_log_hook.py` - Cursor backward-compatible entry
- `windsurf_hook_adapter.py` - Windsurf hook adapter

### PR Review Automation
- `fetch_pr_reviews.py` - Fetch PR reviews from GitHub
- `parse_pr_review.py` - Parse review into structured data
- `auto_fix_pr_issues.py` - Generate fix instructions
- `save_pr_comment_manual.py` - Manually save PR comments
- `check_prs.py` - Check PR status

### Setup & Data
- `setup_hooks.py` - Install git hooks for AI logging
- `submit_log.py` - Submit AI logs to grading server
- `export_crawl_markdown.py` - Export crawled content as Markdown
- `cleanup_error_pages.py` - Cleanup error pages from database

### Maintenance
- `purge_api_logs.py` - Purge old OpenAI API call logs (30-day retention)

## Bash/Batch (`bash/`)

### Shared
- `common.sh` - **Auto-detect container runtime** (podman/docker). Sourced by all .sh scripts.

### Shell Scripts (cross-platform, Mac/Linux)
- `start-web-crawler-rag.sh` - Start RAG stack
- `stop-web-crawler-rag.sh` - Stop RAG stack
- `restart-backend.sh` - Restart backend
- `rebuild-backend.sh` - Rebuild and restart
- `watch-logs.sh` - Watch logs real-time
- `diagnose-backend.sh` - Diagnose backend issues
- `setup_hooks.sh` - Install git hooks
- `pr-review-helper.sh` - PR review helper

### Batch Files (Windows CMD)
- `start-web-crawler-rag.bat` / `stop-web-crawler-rag.bat` - Start/stop
- `start-all.bat` / `stop-all.bat` - Start/stop all services
- `docker.bat` / `docker-compose.bat` - Docker shortcuts
- `pr-review-helper.bat` - PR review helper

## Usage

Chạy script từ root directory:

```powershell
# Windows PowerShell
.\scripts\powershell\start-web-crawler-rag.ps1

# Python (cross-platform)
python scripts/python/setup_hooks.py

# Batch file
.\scripts\bash\start-web-crawler-rag.bat
```

## Cross-Platform Support

| Platform | Container Runtime | Script Format |
|----------|-------------------|---------------|
| Windows | Podman or Docker | `.ps1` (PowerShell) / `.bat` (CMD) |
| macOS / Linux | Podman or Docker | `.sh` (Bash/Zsh) |

All scripts auto-detect `podman` vs `docker` via `common.ps1` / `common.sh`.
No hardcoded paths — works on any machine with the container runtime installed.

## Notes

- Tất cả scripts được thiết kế để chạy từ root directory
- Scripts sử dụng relative paths
- Scripts auto-detect podman/docker — không cần cấu hình thủ công
- Shell (.sh) scripts tương đương PS1 scripts cho Mac/Linux
