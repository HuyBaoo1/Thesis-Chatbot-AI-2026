# Load/Stress Test Report

**Date:** 2026-05-17
**Test Suite:** `tests/test_load_stress.py`
**Environment:** Production API (`https://a20-app-165-production.up.railway.app`)

## Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | 7 |
| **Passed** | 2 |
| **Failed** | 5 |
| **Pass Rate** | 28.6% |

## Test Results

### Concurrent Users (`TestConcurrentUsers`)

| Test | Status | Description |
|------|--------|-------------|
| `test_concurrent_chat_requests` | FAIL | All 8 concurrent requests failed |
| `test_concurrent_same_lead_requests` | FAIL | KeyError: 'lead_id' in fixture |
| `test_concurrent_different_lead_requests` | PASS | Different leads handled concurrently |

### Throughput (`TestThroughput`)

| Test | Status | Description |
|------|--------|-------------|
| `test_sustained_request_rate` | FAIL | Only 6.67% success rate at 1.49 req/s |

### Latency (`TestLatency`)

| Test | Status | Description |
|------|--------|-------------|
| `test_p50_latency` | PASS | P50 latency within acceptable range |
| `test_p95_latency` | PASS | P95 latency within acceptable range |

### Resource Limits (`TestResourceLimits`)

| Test | Status | Description |
|------|--------|-------------|
| `test_large_conversation_history` | FAIL | 429 Too Many Requests |
| `test_rapid_fire_requests` | FAIL | Only 11/20 succeeded (55%) |

## Performance Analysis

### Concurrent Request Handling
The system struggles with concurrent requests from the same lead, suggesting:
- Possible race conditions
- Session management issues
- Rate limiting too aggressive

### Throughput
At sustained load, success rate drops significantly (6.67%), indicating:
- Rate limits being triggered
- Resource exhaustion
- Possible connection pool limits

### Latency
P50 and P95 latencies are within acceptable ranges, suggesting the core processing is performant but capacity is limited.

### Resource Limits
Rate limiting kicks in aggressively for:
- Large conversation histories
- Rapid fire requests

## Recommendations

1. **Increase rate limits** - Adjust limits for production capacity
2. **Add request queuing** - Queue excess requests instead of rejecting
3. **Implement exponential backoff** - Client-side retry with backoff
4. **Scale horizontally** - Add more instances to handle load
5. **Optimize connection pooling** - Increase connection pool size
6. **Add load shedding** - Gracefully shed load under extreme pressure
