#!/usr/bin/env sh
# Watch backend logs in real-time
set -e
. "$(dirname "$0")/common.sh"

echo "=== Watching Backend Logs (Ctrl+C to stop) ==="
$CONTAINER_RUNTIME logs -f web-crawler-rag_backend-api_1 2>/dev/null || \
$CONTAINER_RUNTIME logs -f backend-api 2>/dev/null || \
echo "ERROR: Backend container not found. Is it running?"
