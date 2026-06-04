#!/bin/bash
# Script to restart services after enabling evaluation agent

echo "🔄 Restarting services to enable Response Evaluation Agent..."
echo ""

# Check if using podman-compose or docker-compose
if command -v podman-compose &> /dev/null; then
    COMPOSE_CMD="podman-compose"
    echo "✓ Using podman-compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    echo "✓ Using docker-compose"
else
    echo "❌ Error: Neither podman-compose nor docker-compose found"
    exit 1
fi

echo ""
echo "📋 Current containers:"
if [ "$COMPOSE_CMD" = "podman-compose" ]; then
    podman ps --format "table {{.Names}}\t{{.Status}}"
else
    docker ps --format "table {{.Names}}\t{{.Status}}"
fi

echo ""
echo "🔄 Restarting backend and celery-worker..."

# Try restart first
$COMPOSE_CMD restart backend celery-worker

# If restart doesn't work, try down/up
if [ $? -ne 0 ]; then
    echo "⚠️  Restart command not available, using down/up instead..."
    $COMPOSE_CMD down backend celery-worker
    $COMPOSE_CMD up -d backend celery-worker
fi

echo ""
echo "✅ Services restarted!"
echo ""
echo "📊 Checking status..."
sleep 2

if [ "$COMPOSE_CMD" = "podman-compose" ]; then
    podman ps --filter "name=backend" --filter "name=celery" --format "table {{.Names}}\t{{.Status}}"
else
    docker ps --filter "name=backend" --filter "name=celery" --format "table {{.Names}}\t{{.Status}}"
fi

echo ""
echo "🎉 Evaluation Agent is now active!"
echo ""
echo "📝 Next steps:"
echo "  1. Test with a RAG query"
echo "  2. Check logs: $COMPOSE_CMD logs -f backend | grep -i evaluation"
echo "  3. View metrics: curl http://localhost:8001/api/v1/evaluation/metrics"
echo ""
echo "📚 Full documentation: docs/EVALUATION_AGENT_SETUP.md"
