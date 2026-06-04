# Database Test Report

**Date:** 2026-05-17
**Test Suite:** `tests/test_database.py`
**Environment:** Production API (`https://a20-app-165-production.up.railway.app`)

## Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | 10 |
| **Passed** | 6 |
| **Failed** | 2 |
| **Error** | 2 |
| **Pass Rate** | 60% |

## Test Results

### Lead CRUD (`TestLeadCRUD`)

| Test | Status | Description |
|------|--------|-------------|
| `test_create_lead` | FAIL | Email mismatch - returns existing bench@test.com |
| `test_get_lead` | PASS | Lead retrieval working |
| `test_lead_email_uniqueness` | FAIL | Duplicate email creates new lead |

### Conversation Storage (`TestConversationStorage`)

| Test | Status | Description |
|------|--------|-------------|
| `test_store_message` | PASS | Message storage working |
| `test_get_conversation` | PASS | Conversation retrieval working |
| `test_conversation_ordering` | PASS | Messages ordered by timestamp |

### Message Persistence (`TestMessagePersistence`)

| Test | Status | Description |
|------|--------|-------------|
| `test_assistant_response_stored` | ERROR | KeyError: 'lead_id' in fixture |
| `test_sources_metadata_stored` | ERROR | KeyError: 'lead_id' in fixture |

## Failed Tests Analysis

### 1. `test_create_lead`

**Issue:** When creating a lead with a unique email, the API returns an existing lead (`bench@test.com`) instead of creating a new one.

**Root Cause:** Likely a bug in the lead creation logic that uses a hardcoded email or incorrectly retrieves existing leads.

### 2. `test_lead_email_uniqueness`

**Issue:** Creating two leads with the same email returns different lead_ids instead of the same lead.

**Root Cause:** Email uniqueness constraint not enforced - new lead created on each request.

### Error Analysis

The `KeyError: 'lead_id'` errors indicate issues with test fixtures where the lead creation is failing. This is likely related to the same root cause as the failed tests.

## Recommendations

1. **Fix email uniqueness logic** - Check for existing email before creating new lead
2. **Add database constraints** - Enforce email uniqueness at database level
3. **Add logging** - Log all lead creation attempts for debugging
4. **Fix test fixtures** - Ensure test setup properly handles lead creation errors
5. **Add email normalization** - Normalize emails (lowercase, trim) before checking duplicates
