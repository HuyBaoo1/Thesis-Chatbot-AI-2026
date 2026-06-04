# AI Logs và Prompt Assets

Tài liệu này giúp người chấm xác định nhanh phần AI logs, prompt templates và cấu hình hook/webhook của repository.

## Mục tiêu

- Chứng minh repository có cơ chế ghi log prompt/hội thoại AI.
- Chỉ ra vị trí prompt templates và script logging.
- Liên kết tới các file cấu hình liên quan để kiểm tra nhanh.

## 1. Chat logs / session logs

- File log chính: `.ai-log/session.jsonl`
- Thư mục log: `.ai-log/`
- Cơ chế:
  - Prompt và sự kiện dừng phiên được ghi tự động qua hooks.
  - Log được append theo định dạng JSON Lines.

## 2. Hook config cho Codex

- Cấu hình hook: `.codex/hooks.json`
- Hook chính:
  - `UserPromptSubmit` gọi `scripts/python/log_hook.py`
  - `Stop` gọi `scripts/python/log_hook.py`
  - Các hook phụ trợ khác nằm trong `.codex/hooks/`

## 3. Script logging

- Logger chính: `scripts/python/log_hook.py`
- Entry tương thích Cursor: `scripts/python/cursor_log_hook.py`
- Script submit log: `scripts/python/submit_log.py`
- Script cài hook: `scripts/python/setup_hooks.py`
- Script shell cài hook: `scripts/bash/setup_hooks.sh`

## 4. Prompt templates / AI assets

- Prompt templates cho chat pipeline:
  - `src/services/chat_pipeline/prompts.py`
  - `src/services/chat_pipeline/prompt_builder.py`
- Hướng dẫn và quy ước AI agent:
  - `AGENTS.md`
  - `CLAUDE.md`

## 5. Điểm cần kiểm tra nhanh khi chấm

1. Mở `.ai-log/session.jsonl` để xác nhận log thực tế đã được ghi.
2. Mở `.codex/hooks.json` để xác nhận hook logging được cấu hình.
3. Mở `scripts/python/log_hook.py` để xác nhận pipeline ghi log.
4. Mở `src/services/chat_pipeline/prompts.py` để xác nhận prompt assets của hệ thống AI.

## 6. Ghi chú

- Theo quy ước dự án, `.ai-log/*.jsonl` không commit vào git nếu không cần thiết cho source control lịch sử.
- Trong workspace hiện tại, thư mục `.ai-log/` vẫn được giữ để phục vụ kiểm tra artifact.
