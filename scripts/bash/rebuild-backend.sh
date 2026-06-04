#!/usr/bin/env sh
# Rebuild and restart backend with code changes
set -e
. "$(dirname "$0")/common.sh"
cd "$PROJECT_ROOT"

echo "=== Rebuilding Backend ==="

echo "Stopping backend services..."
$CONTAINER_RUNTIME stop web-crawler-rag_backend-api_1 2>/dev/null || true
$CONTAINER_RUNTIME stop web-crawler-rag_celery-worker_1 2>/dev/null || true
$CONTAINER_RUNTIME rm web-crawler-rag_backend-api_1 2>/dev/null || true
$CONTAINER_RUNTIME rm web-crawler-rag_celery-worker_1 2>/dev/null || true

echo "Rebuilding backend image..."
$CONTAINER_RUNTIME build -t web-crawler-rag-backend -f services/web-crawler-rag-backend/Dockerfile services/web-crawler-rag-backend

echo "Starting services..."
$CONTAINER_COMPOSE -f docker-compose.web-crawler-rag.yml up -d backend-api celery-worker

echo "Done! Waiting for services to be ready..."
sleep 5

echo "Testing health endpoint..."
if curl -s http://localhost:8000/health | grep -q "ok"; then
    echo "Backend is healthy!"
else
    echo "WARNING: Backend health check failed."
fi
