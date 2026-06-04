#!/bin/bash
set -e

echo "=== Worker Starting ==="
echo "REDIS_URL length: ${#REDIS_URL}"
echo "Starting rq worker..."

exec rq worker --url "$REDIS_URL" -v