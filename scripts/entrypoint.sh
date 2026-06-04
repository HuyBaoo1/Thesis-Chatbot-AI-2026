#!/bin/bash
# Entrypoint script that runs API, RQ worker, and evaluation

# Start RQ worker in background (required for OCR and async tasks)
RQ_QUEUE="${RQ_QUEUE_NAME:-default}"
REDIS="${REDIS_URL:-redis://localhost:6379/0}"
echo "[entrypoint] Starting RQ worker (queue=$RQ_QUEUE)..."
python -m rq.cli worker --url "$REDIS" "$RQ_QUEUE" &
WORKER_PID=$!
echo "[entrypoint] RQ worker started (PID: $WORKER_PID)"

# Run RAG evaluation in background before starting API
if [ "$RUN_EVAL_ON_DEPLOY" = "true" ]; then
    echo "[entrypoint] Starting RAG evaluation in background..."
    bash /app/scripts/run_eval_on_deploy.sh &
    EVAL_PID=$!
    echo "[entrypoint] Evaluation started (PID: $EVAL_PID)"
fi

# Warm up answer cache with top FAQ questions in background
# (non-blocking — the API starts while cache fills in parallel)
if [ "$WARMUP_FAQ_CACHE" != "false" ]; then
    echo "[entrypoint] Starting FAQ cache warmup in background..."
    python /app/scripts/warmup_faq_cache.py --limit "${WARMUP_FAQ_LIMIT:-30}" &
    WARMUP_PID=$!
    echo "[entrypoint] FAQ cache warmup started (PID: $WARMUP_PID)"
fi

# Start the API (pass through to original command)
exec "$@"