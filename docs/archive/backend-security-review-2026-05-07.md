# Backend Security Review Report

**Project:** A20-App-165  
**Scanned:** 2026-05-07  
**Reviewer:** Security Engineer  
**Files reviewed:** 25 core backend files (auth, services, routers, models, config)

## Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Auth/Access Control | 0 | 1 | 1 | 1 |
| Input Validation | 0 | 0 | 0 | 0 |
| CSRF/Host Headers | 0 | 1 | 0 | 0 |
| Rate Limiting | 0 | 0 | 0 | 1 |
| PII/Data | 0 | 0 | 0 | 1 |
| SQL Injection | 0 | 0 | 0 | 0 |
| **TOTAL** | **0** | **2** | **1** | **3** |

## Strengths (What's Done Well)

- **JWT auth**: Proper signing with `jose`, token type enforcement (access/refresh/conversation_access), refresh rotation, password fingerprint invalidation
- **Password hashing**: bcrypt via passlib, proper truncation at 72 chars
- **HttpOnly cookies**: XSS-resistant token storage with SameSite logic
- **CSRF middleware**: Custom Origin-header validation on all state-changing requests when `COOKIE_SECURE=True`
- **SQLAlchemy ORM**: All queries parameterized — zero raw SQL found
- **Input validation**: Pydantic models with strict constraints and business validators
- **Rate limiting**: Redis-based multi-window limits on chat/init endpoints
- **File upload**: Magic byte validation, size caps, proper content-type handling
- **Content guardrails**: Keyword blocklist for harmful prompts (self-harm, violence, hacking)
- **Firecrawl SSRF**: Proper URL scheme/host filtering, no internal network access

---

## Findings

### HIGH — 2 issues

**1. Unauthenticated Telegram send endpoint**  
`src/api/routers/telegram.py:48-54`

The `/api/telegram/send` POST endpoint has NO authentication dependency — no `Depends(get_current_user)` and no `Depends(require_role(...))`. Anyone can send arbitrary messages to any Telegram chat ID:

```python
@router.post("/send")
async def send_telegram_message(
    chat_id: int,
    text: str,
    db=Depends(session.get_db),
):
```

**Risk**: An attacker could spam Telegram users, send phishing links, or impersonate the admissions bot.  
**Fix**: Add `user: dict = Depends(staff_required)` or at minimum `Depends(get_current_user)`.

**2. TrustedHostMiddleware wildcard**  
`src/main.py:89`

```python
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
```

**Risk**: Accepts any `Host` header, enabling host header injection (cache poisoning, password reset poisoning).  
**Fix**: Set to the specific Railway app domain, e.g., `["a20-app-165.up.railway.app"]`, and read from env for flexibility.

---

### MEDIUM — 1 issue

**3. No rate limiting on `/auth/login`**  
`src/api/routers/auth.py:12-18`

Unlike the chat endpoints which have comprehensive Redis-based rate limiting, the login endpoint has none. The password field only requires `min_length=6`, so brute force is feasible.

**Risk**: Credential stuffing / brute force against the single login endpoint.  
**Fix**: Add `check_rate_limit` on the login endpoint keyed by IP (or email+IP), e.g., 5 attempts per minute per IP.

---

### LOW — 3 issues

**4. Password policy is minimal**  
`src/schemas/auth.py:9-10`

Only `min_length=6` is enforced. No complexity requirements (uppercase, digits, special characters).

**Fix**: Add Pydantic field validators or regex constraints.

**5. No account lockout mechanism**  
`src/services/auth_service.py:60-72`

Failed logins don't increment any counter or trigger lockout. The only protection is the absence of rate limiting on the endpoint (covered by #3 above).

**6. PII returned in conversation API responses**  
`src/services/conversation_service.py:412-430`

`serialize_conversation()` always includes `lead_email` and `lead_phone` in responses. While this is needed for counselors, the endpoint is also accessible via `conversation_token` (lead-side access) without stripping PII.

**Fix**: Strip email/phone from the response when the requester is authenticated via `conversation_token` rather than staff JWT.

---

## Verified Secure

| Area | Status | Notes |
|------|--------|-------|
| SQL Injection | ✅ Clean | 100% SQLAlchemy ORM, no raw SQL |
| XSS (reflected/stored) | ✅ Clean | Pydantic validation, Response with proper media types |
| Command Injection | ✅ Clean | No shell execution in codebase |
| SSRF (Firecrawl) | ✅ Clean | URL scheme/host filtering, no internal IP access |
| JWT Implementation | ✅ Clean | jose library, algorithm enforced, type checking |
| Cookie Security | ✅ Clean | HttpOnly, SameSite logic, Secure in production |
| CSRF | ✅ Clean | Custom Origin header middleware |
| File Upload | ✅ Clean | Magic byte check, size limit, type validation |
| Dependency Eval | ✅ Clean | AST-whitelist safe eval (fixed in prior review) |
| Secrets in Code | ✅ Clean | No hardcoded credentials (fixed in prior review) |
