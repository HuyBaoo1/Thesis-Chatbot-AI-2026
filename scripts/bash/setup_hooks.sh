#!/usr/bin/env sh
# Install git pre-push hook for AI log submission (delegates to setup_hooks.py).
# Works on Linux, macOS, and Git Bash on Windows.
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if command -v python3 >/dev/null 2>&1; then
  exec python3 scripts/python/setup_hooks.py
elif command -v python >/dev/null 2>&1; then
  exec python scripts/python/setup_hooks.py
elif command -v py >/dev/null 2>&1; then
  exec py -3 scripts/python/setup_hooks.py
else
  echo "[ai-log] ERROR: Need Python 3 (python3, python, or py)." >&2
  exit 1
fi
