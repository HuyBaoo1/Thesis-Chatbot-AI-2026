#!/bin/bash
set -e

# Default to TCP proxy if REDIS_URL not set
if [ -z "$REDIS_URL" ]; then
    REDIS_URL="redis://default:CGkoasZHjZvbMSFUXDDPXCUjdnBNUYfF@switchyard.proxy.rlwy.net:16890"
fi

echo "=== RQ Worker Starting ==="
echo "REDIS_URL: ${REDIS_URL:0:30}..."
echo "RQ_QUEUE_NAME: ${RQ_QUEUE_NAME:-default}"

exec rq worker --url "$REDIS_URL" "${RQ_QUEUE_NAME:-default}" -v
