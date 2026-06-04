#!/usr/bin/env sh
# Stop the Web Crawler RAG stack
set -e
. "$(dirname "$0")/common.sh"
cd "$PROJECT_ROOT"

echo "=== Stopping Web Crawler RAG Stack ==="
$CONTAINER_COMPOSE -f docker-compose.web-crawler-rag.yml down

echo "Stack stopped."
