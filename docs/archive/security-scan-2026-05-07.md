# Security Scan Report

**Project:** A20-App-165 (vinai)
**Branch:** `fix/ui-a11y-improvements`
**Scanned:** 2026-05-07
**Type:** Python (backend) + Node.js/Vite (frontend)

---

## Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Secrets | 1 | 1 | 0 | 0 |
| Code | 0 | 1 | 1 | 0 |
| Dependencies | 0 | 6 | 6 | 0 |
| .env Exposure | 0 | 0 | 0 | 0 |

---

## Findings

### CRITICAL

**1. [SECRET] Redis credentials hardcoded in source code**

- `worker/start.py:13` — Redis URL with embedded password (`redis://default:***@switchyard.proxy.rlwy.net:16890`)
- `worker/railway.toml:5` — Same Redis URL in deploy start command

The Redis connection password is embedded directly in source files. Anyone with access to the repo can read it. This is a production Redis instance on Railway (switchyard.proxy.rlwy.net).
- **Fix**: Move to environment variables (`REDIS_URL`). `start.py` already checks `os.environ.get('REDIS_URL')` as a fallback — remove the hardcoded default. Use Railway environment variables for the deploy command.

---

### HIGH

**2. [SECRET] Default bootstrap admin password weak and hardcoded**

- `src/services/bootstrap_service.py:14` — `DEFAULT_BOOTSTRAP_PASSWORD = "Admin@123456"`

This is a weak, guessable default password stored in plaintext in the repository. If the bootstrap admin is ever accidentally enabled in production, an attacker could trivially login.
- **Fix**: Require the password to come from an environment variable; never set a default in code. If a default is absolutely necessary for local dev, use a cryptographically random value generated per-install.

**3. [CODE] `eval()` on user-supplied input**

- `src/tools.py:17` — `result = eval(expression, {"__builtins__": {}})`

The `calculate()` tool evaluates arbitrary mathematical expressions using `eval()`. While `__builtins__` is emptied, Python's `eval()` can still be exploited — for example, expressions like `9**9**9` can cause CPU exhaustion (DoS). If this tool is exposed to users, it's a security risk.
- **Fix**: Use a safe expression evaluator like `ast.literal_eval()` (for literals), `numexpr`, or a dedicated math parser. At minimum, validate input length and add a timeout.

**4-9. [DEPS] 6 high-severity npm vulnerabilities (vite-app/)**

| Package | Severity | Issue |
|---------|----------|-------|
| `minimatch` | HIGH | ReDoS (3 CVEs, up to CVSS 7.5) |
| `path-to-regexp` | HIGH | Backtracking ReDoS (CVSS 7.5) |
| `undici` | HIGH | WebSocket buffer overflow, CRLF injection, excessive memory |
| `@vercel/node` | HIGH | Transitive via minimatch/undici |
| `@vercel/build-utils` | HIGH | Transitive via minimatch |
| `@vercel/python-analysis` | HIGH | Transitive via minimatch |

- **Fix**: Update `@vercel/node` to v4.0.0 (major, requires migration). Alternatively, run `npm update` for transitive deps.

---

### MEDIUM

**10. [CODE] `dangerouslySetInnerHTML` in chart components**

- `designfe/logintemplate/components/ui/chart.tsx:83`
- `designfe/b_EFrIFqQFwWe/components/ui/chart.tsx:83`

Used to inject CSS custom properties for chart theming. Content is generated from `Object.entries(THEMES)` and static color config — no user input involved. Likely false positive.

**11-16. [DEPS] 6 moderate-severity npm vulnerabilities**

| Package | Issue |
|---------|-------|
| `ajv` | ReDoS via `$data` option |
| `hono` | bodyLimit bypass (CVSS 6.5), JSX HTML injection (CVSS 4.7) |
| `ip-address` | XSS in Address6 HTML methods |
| `smol-toml` | DoS via commented lines |
| `undici` | Multiple moderate CVEs (insufficient randomness, resource exhaustion, HTTP smuggling) |

---

### PASSED (No Issues Found)

- **No AWS, GitHub, Stripe, Slack, GCP, or Anthropic keys** in source
- **No private key files** found
- **No .env files tracked by git**
- **`.gitignore` covers `.env` and `.env*.local`**
- **No SQL injection patterns** detected
- **No command injection patterns** detected
- **No disabled TLS verification** detected
- **No insecure deserialization** detected
- **No logging of sensitive data** detected

---

## Recommendations (Priority Order)

1. **Immediately rotate the Railway Redis password** — it's committed to the repo. Revoke the current one via Railway dashboard and set the new one via `REDIS_URL` env var only. Remove hardcoded fallbacks from `worker/start.py:13` and `worker/railway.toml:5`.

2. **Remove `DEFAULT_BOOTSTRAP_PASSWORD`** from `src/services/bootstrap_service.py:14` — require env var, with no default.

3. **Replace `eval()` in `src/tools.py:17`** with a safe math parser.

4. **Run `npm update` in vite-app/** to pull in patched transitive dependencies, especially `minimatch` and `undici`. Consider upgrading `@vercel/node` to v4.x.
