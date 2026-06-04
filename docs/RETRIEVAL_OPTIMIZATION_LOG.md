# RAG Retrieval Optimization Log

**Date:** 2026-05-17
**Goal:** Improve Context Precision and Context Recall

---

## Baseline Results

| Version | Samples | Faithfulness | Answer Relevancy | Context Precision | Context Recall | Overall |
|---------|---------|--------------|-------------------|------------------|---------------|---------|
| v2 (baseline) | 20 | 1.00 | 1.00 | 1.00 | 0.83 | **0.96** |
| v3 (baseline) | 87 | 0.72 | 0.79 | 0.56 | 0.48 | **0.64** |
| v4 (Railway 30 samples) | 29 | 0.88 | 0.96 | 0.77 | 0.65 | **0.81** |

---

## Optimization Plan

| # | Step | Time | Expected Impact |
|---|------|------|----------------|
| 1 | Score threshold + Top_k tuning | 5 min | High |
| 2 | Better chunking | 2-3 hours | Very High |
| 3 | Query expansion | 30 min | Medium |
| 4 | Reranking | 1 hour | Medium |

---

## Experiment Results

### Experiment 1: Baseline (v3)
- **Date:** 2026-05-17
- **Samples:** 87
- **Results:** F=0.72, AR=0.79, CP=0.56, CR=0.48, Overall=0.64
- **Changes:** None (current production)
- **Status:** BASELINE

### Experiment 2: Railway Baseline (v4)
- **Date:** 2026-05-17
- **Samples:** 29/30 (1 rate limit error)
- **Changes:** None - established baseline on production Railway
- **Results:** F=0.88, AR=0.96, CP=0.77, CR=0.65, Overall=0.81
- **Status:** BASELINE (new)

### Experiment 3: Score Threshold (0.5) + Top_k (30)
- **Date:** 2026-05-17
- **Samples:** 2/89 (FAILED - rate limited)
- **Changes:**
  - Added score threshold 0.5 in `_select_top_candidates`
  - Changed default top_k from 10 to 30 in retrieval_orchestrator
- **Results:** FAILED - rate limit too aggressive, couldn't get enough samples
- **Status:** REVERTED

---

## Current Settings (before changes)

```python
# retrieval_paths.py
top_k = 20  # in pipeline.py
HYBRID_RRF_K = 25
```

---

## Notes

- Score threshold for Qdrant: cosine similarity typically 0.7-0.8
- Top_k too low → miss relevant info (low recall)
- Top_k too high → too much noise (low precision)
- Chunk size: aim for 500-1000 tokens with semantic boundaries
