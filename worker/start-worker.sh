#!/bin/bash
set -e

if [ -z "$REDIS_URL" ]; then
    echo "FATAL: REDIS_URL environment variable is not set"
    exit 1
fi

echo "=== RQ Worker Starting ==="
echo "REDIS_URL: SET"
echo "RQ_QUEUE_NAME: ${RQ_QUEUE_NAME:-default}"

exec python /app/worker/start.py
