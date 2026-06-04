#!/usr/bin/env python3
"""
Windsurf Cascade Hook adapter.

Receives JSON from .windsurf/hooks.json events (pre_user_prompt, post_cascade_response),
transforms to the shared log_hook.py format, and pipes it through.

Cascade hooks send JSON via stdin with fields:
  - agent_action_name: e.g. "pre_user_prompt", "post_cascade_response"
  - trajectory_id: conversation id
  - execution_id: turn id
  - model_name: e.g. "Claude Sonnet 4"
  - tool_info: event-specific data
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def main() -> None:
    raw = sys.stdin.read().strip()
    if not raw:
        sys.exit(0)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        sys.exit(0)

    action = data.get("agent_action_name", "")
    tool_info = data.get("tool_info", {})

    # Map Cascade hook event to log_hook event name
    if action == "pre_user_prompt":
        event = "beforeSubmitPrompt"
        prompt = tool_info.get("user_prompt", "")[:1000]
        response = ""
    elif action == "post_cascade_response":
        event = "afterCascadeResponse"
        prompt = ""
        response = tool_info.get("response", "")[:500]
    else:
        # Forward other events as-is
        event = action
        prompt = ""
        response = ""

    payload = {
        "hook_event_name": event,
        "prompt": prompt,
        "response": response,
        "agent": "windsurf",
        "source": "windsurf-cascade-hook",
        "session_id": data.get("trajectory_id", ""),
        "conversation_id": data.get("trajectory_id", ""),
        "generation_id": data.get("execution_id", ""),
        "model": data.get("model_name", ""),
        "files": [],
    }

    # Pipe to log_hook.py
    hook_script = Path(__file__).resolve().parent / "log_hook.py"
    try:
        proc = subprocess.run(
            [sys.executable, str(hook_script), "--tool", "windsurf"],
            input=json.dumps(payload, ensure_ascii=False),
            capture_output=True,
            text=True,
            timeout=5,
        )
        # Silent — don't clutter Cascade UI
        sys.exit(0)
    except Exception:
        # Never block Cascade on logging failure
        sys.exit(0)


if __name__ == "__main__":
    main()
