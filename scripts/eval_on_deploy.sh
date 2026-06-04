#!/bin/bash
# Run RAG evaluation after API deploy
# This script runs once on container start and exits

set -e

echo "[eval-on-deploy] Starting RAG evaluation..."

# Wait for API to be ready
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -sf http://localhost:8000/docs > /dev/null 2>&1; then
        echo "[eval-on-deploy] API is ready"
        break
    fi
    echo "[eval-on-deploy] Waiting for API... ($attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "[eval-on-deploy] ERROR: API not available after $max_attempts attempts"
    exit 1
fi

# Run evaluation
cd /app
echo "[eval-on-deploy] Running auto_label_dataset.py..."
python scripts/auto_label_dataset.py --limit 20 --output /app/src/evaluation/datasets/auto_eval.jsonl 2>&1 || {
    echo "[eval-on-deploy] ERROR: auto_label_dataset.py failed"
    exit 1
}

echo "[eval-on-deploy] Running evaluation..."
python3 -m src.evaluation.run_evaluation --dataset auto_eval.jsonl 2>&1 || {
    echo "[eval-on-deploy] WARNING: evaluation failed but continuing"
}

echo "[eval-on-deploy] Evaluation complete. Exiting."
exit 0