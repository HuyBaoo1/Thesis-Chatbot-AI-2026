#!/usr/bin/env sh
# Restart backend API and Celery worker
set -e
. "$(dirname "$0")/common.sh"
cd "$PROJECT_ROOT"

echo "=== Restarting Backend ==="

echo "Stopping backend services..."
$CONTAINER_COMPOSE -f docker-compose.web-crawler-rag.yml stop backend-api celery-worker
$CONTAINER_COMPOSE -f docker-compose.web-crawler-rag.yml rm -f backend-api celery-worker

echo "Rebuilding backend image..."
$CONTAINER_RUNTIME build -t web-crawler-rag-backend -f services/web-crawler-rag-backend/Dockerfile services/web-crawler-rag-backend

echo "Starting backend services..."
$CONTAINER_COMPOSE -f docker-compose.web-crawler-rag.yml up -d backend-api celery-worker

echo "Waiting for backend to start..."
sleep 5

echo "Testing health endpoint..."
if curl -s http://localhost:8000/health | grep -q "ok"; then
    echo "Backend is healthy!"
else
    echo "WARNING: Backend health check failed. Check logs: $CONTAINER_RUNTIME logs backend-api"
fi
