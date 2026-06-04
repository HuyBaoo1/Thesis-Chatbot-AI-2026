#!/bin/bash
# Wrapper script to run evaluation on deploy
# Runs in background, does not block API startup

LOG_FILE="/app/src/evaluation/logs/eval_on_deploy.log"
EVAL_LIMIT=${EVAL_LIMIT:-20}

mkdir -p /app/src/evaluation/logs

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting RAG evaluation on deploy..."

# Function to run evaluation
run_evaluation() {
    log "Running auto_label_dataset.py..."
    python scripts/auto_label_dataset.py --limit $EVAL_LIMIT --output /app/src/evaluation/datasets/auto_eval.jsonl 2>&1 | tee -a "$LOG_FILE" || {
        log "ERROR: auto_label_dataset.py failed"
        return 1
    }

    log "Running evaluation..."
    python3 -m src.evaluation.run_evaluation --dataset auto_eval.jsonl 2>&1 | tee -a "$LOG_FILE" || {
        log "ERROR: evaluation failed"
        return 1
    }

    log "Evaluation complete."
    return 0
}

# Run in background with nohup
nohup bash -c "run_evaluation" > /dev/null 2>&1 &
log "Evaluation started in background (PID: $!)"

# Exit immediately - API will start normally
exit 0