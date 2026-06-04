#!/usr/bin/env python3
"""
Backward-compatible Cursor entry: sets tool to cursor without POSIX env syntax.

Prefer in .cursor/hooks.json: python scripts/python/log_hook.py --tool cursor
"""
import importlib.util
import os
import sys
from pathlib import Path


def main() -> None:
    os.environ.setdefault("AI_TOOL_NAME", "cursor")
    if "--tool" not in sys.argv:
        sys.argv[1:1] = ["--tool", "cursor"]
    _dir = Path(__file__).resolve().parent
    spec = importlib.util.spec_from_file_location("log_hook", _dir / "log_hook.py")
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load log_hook.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.main()


if __name__ == "__main__":
    main()
