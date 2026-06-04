#!/usr/bin/env sh
# Diagnose backend issues — check container status, health, and recent logs
set -e
. "$(dirname "$0")/common.sh"

echo "=== Backend Diagnostics ==="
echo ""

echo "1. Container Status:"
$CONTAINER_RUNTIME ps -a --filter "name=backend-api" --filter "name=web-crawler-rag" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || \
$CONTAINER_RUNTIME ps -a | grep -E "backend|postgres|redis|qdrant"
echo ""

echo "2. Health Check:"
HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null || echo "FAILED")
echo "   $HEALTH"
echo ""

echo "3. Recent Logs (last 20 lines):"
$CONTAINER_RUNTIME logs --tail 20 web-crawler-rag_backend-api_1 2>/dev/null || \
$CONTAINER_RUNTIME logs --tail 20 backend-api 2>/dev/null || \
echo "   Could not fetch logs"
echo ""

echo "4. Disk Usage:"
df -h . 2>/dev/null || echo "   N/A"
