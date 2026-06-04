#!/usr/bin/env sh
# Install git hooks from the repo root path documented in AGENTS.md.
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
exec bash scripts/bash/setup_hooks.sh
