# RQ Worker Fix - Debug Log

**Date:** 2026-05-05
**Issue:** RQ Worker container crashing with `ValueError: Redis URL must specify one of the following schemes (redis://, rediss://, unix://)`
**Status:** RESOLVED

---

## Root Cause

Railway auto-detects `rq` in `requirements.txt` and constructs a start command:
```
python -m rq.cli worker --url $REDIS_URL default
```
The `$REDIS_URL` shell expansion was corrupted, causing `parse_url()` to receive an invalid URL. All attempts to set `REDIS_URL`, `RQ_REDIS_URL`, `START_COMMAND` env vars, or CMD/ENTRYPOINT in Dockerfile were **ignored** — Railway overrides them entirely.

## Solution

### 1. Set REDIS_URL to TCP Proxy

Private DNS `redis.railway.internal` is broken. Use TCP proxy instead:

```bash
railway variables --set REDIS_URL="redis://default:<password>@switchyard.proxy.rlwy.net:16890" --service rq-worker
```

### 2. Override Start Command in Dashboard

Railway Dashboard → rq-worker → Settings → **Custom Start Command**:
```
rq worker --url 'redis://default:<password>@switchyard.proxy.rlwy.net:16890' default -v
```

Hardcoded URL with single quotes ensures no shell variable expansion issues.

### 3. Ensure Main App Unaffected

Dashboard → A20-App-165 → Settings → Custom Start Command:
```
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

Do NOT use `railway.toml` at project root — it would override both services.

## Key Files

| File | Purpose |
|------|---------|
| `Dockerfile.worker` | Actual Dockerfile used by rq-worker (not `worker/Dockerfile`) |
| `worker/start.py` | Custom worker launcher script (bypasses Click `--url` issues) |
| `railway.toml` | REMOVED — was a temporary workaround; use dashboard instead |

## Lessons Learned

1. Railway auto-detects Python worker libraries (rq, celery) and overrides CMD/ENTRYPOINT
2. `START_COMMAND` env var and Dockerfile CMD/ENTRYPOINT are ignored for auto-detected workers
3. Use **Custom Start Command** in dashboard to override auto-detection
4. Config-as-code (`railway.toml`) at root affects ALL services; use per-service dashboard settings instead
5. Private DNS (`redis.railway.internal`) is unreliable — always use TCP proxy URL
