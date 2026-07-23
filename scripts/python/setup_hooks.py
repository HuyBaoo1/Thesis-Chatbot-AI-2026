#!/usr/bin/env python3
"""
Install personal Git hooks for GitHub PR review fetching (Linux, macOS, Windows).

Writes POSIX #!/bin/sh hooks so Git Bash / MSYS / Unix shells all behave the same.
Hooks installed:
  - pre-push: Fetch PR reviews in the background after push starts
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

PRE_PUSH = """#!/bin/sh
# Pre-push hook: fetch GitHub PR reviews in background.
# External AI prompt-log submission is intentionally disabled for this personal project.

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
        print("[hooks] ERROR: .git not found — run this from a git clone.", file=sys.stderr)
        sys.exit(1)

    hooks_dir = git_dir / "hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)

    # Install pre-push hook (PR review fetch in background)
    pre_push = hooks_dir / "pre-push"
    pre_push.write_text(PRE_PUSH + "\n", encoding="utf-8")

    # Remove obsolete post-push hook (Git does not support this hook)
    post_push = hooks_dir / "post-push"
    if post_push.exists():
        post_push.unlink()
        print("[hooks] Removed obsolete post-push hook (not a standard Git hook).")

    # Clean up any corrupted pre-push files (e.g., Unicode variant names)
    for f in hooks_dir.iterdir():
        if f.name.startswith("pre-push") and f.name not in ("pre-push", "pre-push.sample"):
            f.unlink()
            print(f"[hooks] Removed corrupted hook file: {f.name}")

    # Install post-merge hook (PR review fetch)
    post_merge = hooks_dir / "post-merge"
    post_merge.write_text(POST_MERGE + "\n", encoding="utf-8")

    if os.name != "nt":
        for h in (pre_push, post_merge):
            mode = h.stat().st_mode
            h.chmod(mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

    print("[hooks] Git pre-push hook installed (GitHub PR review fetch in background).")
    print("[hooks] Git post-merge hook installed (GitHub PR review fetch).")
    print("[hooks] External AI log submission is disabled.")


if __name__ == "__main__":
    main()
