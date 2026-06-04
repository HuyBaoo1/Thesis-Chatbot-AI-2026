# Railway Redis Connection Issue - Debug Log

**Date:** 2026-05-04
**Issue:** RQ Worker cannot connect to Redis on Railway
**Root Cause:** Multiple - DNS resolution failure + wrong service ID
**Status:** RESOLVED

---

## Symptoms

- RQ Worker container keeps crashing with status "Crashed · Initializing"
- Error: `ValueError: Redis URL must specify one of the following schemes (redis://, rediss://, unix://)`
- Worker cannot resolve `redis.railway.internal` hostname

---

## Root Causes Found

### 1. Railway Private DNS is Broken

```
$ nslookup redis.railway.internal
Server:		8.8.8.8
** server can't find redis.railway.internal: NXDOMAIN
```

The private hostname `redis.railway.internal` returns NXDOMAIN from Railway's DNS. This is a Railway infrastructure issue.

**Workaround:** Use Railway's TCP Proxy instead of private hostname.

### 2. Wrong Service ID in worker/.railway.json

```json
// OLD (wrong) - pointed to different service
{
  "serviceId": "23c34987-96f4-41bb-8ce4-7778857949cc"
}

// NEW (correct) - actual rq-worker service
{
  "serviceId": "93aa6f1e-31ea-419d-8546-651651aadadd"
}
```

This caused all `railway up` deployments from `worker/` directory to deploy to the wrong service.

---

## Solution Applied

### 1. Use TCP Proxy URL

Changed `REDIS_URL` from:
```
redis://default:password@redis.railway.internal:6379
```

To:
```
redis://default:password@switchyard.proxy.rlwy.net:16890
```

### 2. Fixed worker/.railway.json

Updated with correct service ID for rq-worker service.

### 3. Updated Worker Dockerfile

```dockerfile
ENTRYPOINT ["/bin/sh", "-c", "rq worker --url \"$REDIS_URL\" -v"]
```

Use shell form to properly expand `$REDIS_URL` environment variable.

---

## How to Check

### Verify RQ Worker Status

```bash
railway run rq info $REDIS_URL
```

Expected output:
```
default      | 0, 0 executing, N finished, M failed
1 queues, 0 jobs total
1 workers, 1 queues
```

### Check Redis Connection

```bash
railway run python -c "
from redis import Redis
import os
r = Redis.from_url(os.environ['REDIS_URL'])
print('Ping:', r.ping())
"
```

### Check Environment Variables

```bash
railway run printenv | grep REDIS
```

---

## Files Changed

| File | Change |
|------|--------|
| `worker/.railway.json` | Fixed service ID |
| `worker/Dockerfile` | Use $REDIS_URL env var |
| Railway variables | REDIS_URL points to TCP proxy |

---

## If Issue Recurs

1. **Check DNS resolution:**
   ```bash
   railway run nslookup redis.railway.internal
   ```

2. **Check REDIS_URL value:**
   ```bash
   railway run printenv | grep REDIS_URL
   ```

3. **If using private hostname fails**, change to TCP proxy:
   ```bash
   railway service rq-worker
   railway variables --set REDIS_URL="redis://default:PASSWORD@switchyard.proxy.rlwy.net:16890"
   railway up
   ```

4. **Verify service ID matches:**
   ```bash
   # CLI shows service ID
   railway services

   # Check worker/.railway.json
   cat worker/.railway.json
   ```

---

## Railway TCP Proxy Info

- **Private hostname:** `redis.railway.internal` (BROKEN)
- **TCP Proxy host:** `switchyard.proxy.rlwy.net`
- **TCP Proxy port:** 16890

Railway automatically creates these variables for Redis services:
- `REDIS_URL` - Points to private hostname (broken)
- `REDIS_PUBLIC_URL` - Points to TCP proxy (working)
- `REDIS_HOST` = `redis.railway.internal`
- `REDIS_PORT` = `6379`

---

## Alternative Solutions Considered

1. **Use public URL** - Security risk, exposes Redis publicly
2. **Add `?family=0` to URL** - Doesn't work with redis-py connection parameters
3. **Use socket.AF_UNSPEC** - redis-py doesn't support this parameter
4. **Switch to another platform** - Render.com or Fly.io (more work)

TCP Proxy is the simplest working solution.

---

**Last Updated:** 2026-05-04 22:24 UTC