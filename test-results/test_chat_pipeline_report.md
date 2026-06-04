# Chat Pipeline Test Report

**Date:** 2026-05-17
**Test Suite:** `tests/test_chat_pipeline.py`
**Environment:** Production API (`https://a20-app-165-production.up.railway.app`)

## Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | 10 |
| **Passed** | 10 |
| **Failed** | 0 |
| **Pass Rate** | 100% |

## Test Results

### Router Intent Classification (`TestRouterIntentClassification`)

| Test | Status | Intent Detected |
|------|--------|-----------------|
| `test_intent_tuition_lookup` | PASS | Tuition query handled |
| `test_intent_scholarship_lookup` | PASS | Scholarship query handled |
| `test_intent_admission_requirements` | PASS | Admission requirements handled |

### Clarify Mode (`TestClarifyMode`)

| Test | Status | Description |
|------|--------|-------------|
| `test_clarify_ambiguous_tuition` | PASS | Ambiguous tuition query triggers clarification |
| `test_clarify_missing_major_level` | PASS | Missing major level triggers clarification |

### Fallback Behavior (`TestFallbackBehavior`)

| Test | Status | Description |
|------|--------|-------------|
| `test_fallback_out_of_domain` | PASS | Out-of-domain query handled gracefully |
| `test_fallback_nonsense_query` | PASS | Nonsense query handled gracefully |

### Retrieval Modes (`TestRetrievalModes`)

| Test | Status | Description |
|------|--------|-------------|
| `test_hybrid_retrieval` | PASS | Hybrid search mode working |
| `test_vector_only_retrieval` | PASS | Vector-only retrieval working |
| `test_bm25_only_retrieval` | PASS | BM25-only retrieval working |

## Analysis

### Intent Classification
The router successfully classifies queries into the following intents:
- **tuition_lookup**: Query about tuition fees
- **scholarship_lookup**: Query about scholarships
- **admission_requirements**: Query about admission criteria

### Clarify Mode
The system correctly triggers clarification when:
- Query is ambiguous (e.g., "học phí" without specifying major)
- Required information is missing (e.g., major level not specified)

### Fallback Handling
The system gracefully handles:
- Out-of-domain queries (non-admissions topics)
- Nonsense or gibberish input

### Retrieval Performance
All three retrieval modes (hybrid, vector-only, BM25-only) are functioning correctly.

## Recommendations

1. **Monitor clarify mode accuracy** - Ensure clarification questions are helpful and not annoying
2. **Track fallback rate** - High fallback rate may indicate need for more training data
3. **A/B test retrieval modes** - Compare answer quality across different retrieval strategies
