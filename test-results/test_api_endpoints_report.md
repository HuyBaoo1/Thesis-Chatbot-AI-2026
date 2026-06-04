# API Endpoints Test Report

**Date:** 2026-05-17
**Test Suite:** `tests/test_api_endpoints.py`
**Environment:** Production API (`https://a20-app-165-production.up.railway.app`)

## Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | 12 |
| **Passed** | 10 |
| **Failed** | 2 |
| **Pass Rate** | 83.3% |

## Test Results

### Chat Query Endpoint (`TestChatQueryEndpoint`)

| Test | Status | Description |
|------|--------|-------------|
| `test_chat_query_success` | PASS | Successful chat query with tuition question |
| `test_chat_query_without_lead` | PASS | Query without lead_id returns 422 |
| `test_chat_query_invalid_lead` | PASS | Invalid lead_id format returns 422 |
| `test_chat_query_empty_query` | PASS | Empty query handled (200 or 422) |
| `test_chat_query_csrf_rejection` | PASS | Invalid origin rejected with 403 |

### Init Lead Endpoint (`TestInitLeadEndpoint`)

| Test | Status | Description |
|------|--------|-------------|
| `test_init_lead_success` | PASS | Successfully creates new lead |
| `test_init_lead_duplicate_email` | FAIL | API returns new lead instead of existing |
| `test_init_lead_missing_fields` | PASS | Missing fields return 422 |
| `test_init_lead_invalid_email` | FAIL | Invalid email returns 500 instead of 422 |

### CORS Configuration (`TestCORs`)

| Test | Status | Description |
|------|--------|-------------|
| `test_cors_allowed_origin` | PASS | admin.vinunits.cloud allowed |
| `test_cors_rejected_origin` | PASS | Unknown origin rejected with 403 |

### Rate Limiting (`TestRateLimiting`)

| Test | Status | Description |
|------|--------|-------------|
| `test_rate_limit_on_query` | PASS | Rate limit check (variable limit) |

## Failed Tests Analysis

### 1. `test_init_lead_duplicate_email`

**Expected:** Creating a lead with duplicate email returns the existing lead (same `lead_id`)
**Actual:** API returns a new lead with different `lead_id`

**Issue:** The `/api/chat/init-lead` endpoint does not check for existing email before creating a new lead.

### 2. `test_init_lead_invalid_email`

**Expected:** Invalid email format returns 422 validation error
**Actual:** API returns 500 Internal Server Error

**Issue:** The email validation is not properly implemented on the server side, causing an unhandled exception.

## Recommendations

1. **Add email uniqueness check** in `init-lead` endpoint to return existing lead on duplicate email
2. **Add proper email validation** to return 422 instead of 500 for invalid email formats
3. Consider adding email normalization (lowercase, trim) before validation
