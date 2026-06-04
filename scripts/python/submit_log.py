#!/usr/bin/env python3
"""
Submit .ai-log/session.jsonl to grading server.
Called by git pre-push hook or manually.
"""
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path


STATE_FILE = Path(os.environ.get("AI_LOG_DIR", ".ai-log")) / "submit_state.json"


def load_dotenv_fallback(env_path: Path) -> None:
    """
    Lightweight .env loader used when python-dotenv is unavailable.
    Supports KEY=VALUE pairs and ignores blank/comment lines.
    """
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


try:
    from dotenv import load_dotenv  # type: ignore[import-not-found]

    load_dotenv()
except Exception:
    load_dotenv_fallback(Path(".env"))

SERVER_URL = os.environ.get("AI_LOG_SERVER", "")
API_KEY = os.environ.get("AI_LOG_API_KEY", "")
LOG_FILE = Path(os.environ.get("AI_LOG_DIR", ".ai-log")) / "session.jsonl"


def _load_state() -> dict:
    try:
        if STATE_FILE.exists():
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {"last_submitted_line": 0}


def _save_state(state: dict) -> None:
    try:
        STATE_FILE.parent.mkdir(exist_ok=True)
        STATE_FILE.write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
    except Exception:
        # Never block push due to state persistence
        pass


def main():
    if not SERVER_URL:
        print("[ai-log] AI_LOG_SERVER not set — skipping submission.", file=sys.stderr)
        sys.exit(0)

    if not LOG_FILE.exists() or LOG_FILE.stat().st_size == 0:
        print("[ai-log] No logs to submit.", file=sys.stderr)
        sys.exit(0)

    state = _load_state()
    try:
        start_line = int(state.get("last_submitted_line", 0))
    except Exception:
        start_line = 0

    entries = []
    total_lines = 0
    with open(LOG_FILE, encoding="utf-8") as f:
        for i, line in enumerate(f, start=1):
            total_lines = i
            if i <= start_line:
                continue
            line = line.strip()
            if line:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    pass

    if not entries:
        print("[ai-log] No new logs to submit.", file=sys.stderr)
        sys.exit(0)

    payload = json.dumps({"entries": entries}, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    req = urllib.request.Request(
        SERVER_URL,
        data=payload,
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"[ai-log] Submitted {len(entries)} entries → {resp.status}", file=sys.stderr)
            if 200 <= getattr(resp, "status", 0) < 300:
                _save_state({"last_submitted_line": total_lines})
    except urllib.error.URLError as e:
        print(f"[ai-log] Submit failed: {e} — logs kept locally.", file=sys.stderr)
        sys.exit(0)  # Don't block push on server error


if __name__ == "__main__":
    main()
