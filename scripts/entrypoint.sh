#!/bin/bash
# Entrypoint script that runs API, RQ worker, and evaluation

# Start an embedded RQ worker for local development. Production/staging should
# run the dedicated worker service instead.
if [ "${START_EMBEDDED_WORKER:-true}" != "false" ]; then
    RQ_QUEUE="${RQ_QUEUE_NAME:-default}"
    if [ -z "$REDIS_URL" ]; then
        if [ "$APP_ENV" = "production" ] || [ "$APP_ENV" = "staging" ]; then
            echo "FATAL: REDIS_URL environment variable is not set"
            exit 1
        fi
        export REDIS_URL="redis://localhost:6379/0"
    fi
    echo "[entrypoint] Starting RQ worker (queue=$RQ_QUEUE)..."
    RQ_QUEUE_NAME="$RQ_QUEUE" python /app/worker/start.py &
    WORKER_PID=$!
    echo "[entrypoint] RQ worker started (PID: $WORKER_PID)"
fi

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
