#!/bin/bash
set -e

echo "=== Worker Starting ==="
if [ -z "$REDIS_URL" ]; then
    echo "FATAL: REDIS_URL environment variable is not set"
    exit 1
fi

echo "REDIS_URL: SET"
echo "Starting rq worker..."

exec python /app/worker/start.py
