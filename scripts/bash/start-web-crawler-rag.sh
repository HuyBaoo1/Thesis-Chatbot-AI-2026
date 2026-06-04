#!/usr/bin/env sh
# Start the Web Crawler RAG stack (Postgres, Redis, Qdrant, Backend, Celery)
# Cross-platform equivalent of start-web-crawler-rag.ps1
set -e
. "$(dirname "$0")/common.sh"
cd "$PROJECT_ROOT"

echo "=== Starting Web Crawler RAG Stack ==="

# Start infrastructure
echo "Starting infrastructure (Postgres, Redis, Qdrant)..."
$CONTAINER_COMPOSE -f docker-compose.web-crawler-rag.yml up -d app-postgres redis qdrant

# Wait for Postgres
echo "Waiting for Postgres to be ready..."
sleep 5

# Start backend and worker
echo "Starting backend API and Celery worker..."
$CONTAINER_COMPOSE -f docker-compose.web-crawler-rag.yml up -d backend-api celery-worker

echo ""
echo "=== Stack Started ==="
echo "Backend API:   http://localhost:8000"
echo "API Docs:      http://localhost:8000/docs"
echo "Qdrant:        http://localhost:6333/dashboard"
echo ""
echo "Check logs:  $CONTAINER_RUNTIME logs -f backend-api"
