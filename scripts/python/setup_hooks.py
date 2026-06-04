#!/usr/bin/env python3
"""
Install git hooks for AI log submission and PR review fetching (Linux, macOS, Windows).

Writes POSIX #!/bin/sh hooks so Git Bash / MSYS / Unix shells all behave the same.
Hooks installed:
  - pre-push: Submit AI logs to grading server before push
  - post-merge: Fetch PR reviews after pull/merge

Run once from repo root:

  python3 scripts/python/setup_hooks.py
  python scripts/python/setup_hooks.py
  py -3 scripts/python/setup_hooks.py
"""
from __future__ import annotations

import os
import stat
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

# POSIX shell: works with Git for Windows (sh.exe), Linux, macOS.
# Try python3 first (common on Linux/macOS), then python (Windows/conda), then py launcher.
PRE_PUSH = """#!/bin/sh
# Pre-push hook: submit AI logs + fetch PR reviews in background (POSIX — Linux, macOS, Git for Windows)

# Submit AI logs to grading server
if command -v python3 >/dev/null 2>&1; then
  python3 scripts/python/submit_log.py
elif command -v python >/dev/null 2>&1; then
  python scripts/python/submit_log.py
elif command -v py >/dev/null 2>&1; then
  py -3 scripts/python/submit_log.py
else
  echo "[ai-log] Python interpreter not found — skipping submission." >&2
fi

# Fetch PR reviews in background (don't block push)
# Note: Git has no post-push hook, so we trigger fetch here in background
(if command -v python3 >/dev/null 2>&1; then
  sleep 5 && python3 scripts/python/fetch_pr_reviews.py 2>/dev/null
elif command -v python >/dev/null 2>&1; then
  sleep 5 && python scripts/python/fetch_pr_reviews.py 2>/dev/null
elif command -v py >/dev/null 2>&1; then
  sleep 5 && py -3 scripts/python/fetch_pr_reviews.py 2>/dev/null
fi) &

exit 0
"""

POST_MERGE = """#!/bin/sh
# Fetch PR reviews after pull/merge (POSIX — Linux, macOS, Git for Windows)
if command -v python3 >/dev/null 2>&1; then
  python3 scripts/python/fetch_pr_reviews.py 2>/dev/null
elif command -v python >/dev/null 2>&1; then
  python scripts/python/fetch_pr_reviews.py 2>/dev/null
elif command -v py >/dev/null 2>&1; then
  py -3 scripts/python/fetch_pr_reviews.py 2>/dev/null
fi
exit 0
"""

# NOTE: Git does not have a post-push hook. PR review fetching is now
# integrated into pre-push (runs in background with sleep to allow
# GitHub to process the push first).


def main() -> None:
    git_dir = REPO_ROOT / ".git"
    if not git_dir.is_dir():
        print("[ai-log] ERROR: .git not found — run this from a git clone.", file=sys.stderr)
        sys.exit(1)

    hooks_dir = git_dir / "hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)

    # Install pre-push hook (AI log submission + PR review fetch in background)
    pre_push = hooks_dir / "pre-push"
    pre_push.write_text(PRE_PUSH + "\n", encoding="utf-8")

    # Remove obsolete post-push hook (Git does not support this hook)
    post_push = hooks_dir / "post-push"
    if post_push.exists():
        post_push.unlink()
        print("[ai-log] Removed obsolete post-push hook (not a standard Git hook).")

    # Clean up any corrupted pre-push files (e.g., Unicode variant names)
    for f in hooks_dir.iterdir():
        if f.name.startswith("pre-push") and f.name not in ("pre-push", "pre-push.sample"):
            f.unlink()
            print(f"[ai-log] Removed corrupted hook file: {f.name}")

    # Install post-merge hook (PR review fetch)
    post_merge = hooks_dir / "post-merge"
    post_merge.write_text(POST_MERGE + "\n", encoding="utf-8")

    if os.name != "nt":
        for h in (pre_push, post_merge):
            mode = h.stat().st_mode
            h.chmod(mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

    log_dir = REPO_ROOT / ".ai-log"
    log_dir.mkdir(exist_ok=True)
    (log_dir / ".gitkeep").touch(exist_ok=True)

    print("[ai-log] Git pre-push hook installed (AI log submission + PR review fetch in background).")
    print("[ai-log] Git post-merge hook installed (PR review fetch).")
    print("[ai-log] Setup complete. Configure AI_LOG_SERVER in your .env file.")


if __name__ == "__main__":
    main()
