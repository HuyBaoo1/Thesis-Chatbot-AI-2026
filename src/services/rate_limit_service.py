import logging
import time

from fastapi import HTTPException, Request
from redis.exceptions import RedisError

from src.integrations.redis_client import get_redis_client

logger = logging.getLogger(__name__)


def check_rate_limit(
    *,
    request: Request,
    scope: str,
    identifier: str | None,
    limit: int,
    window_seconds: int,
) -> None:
    if limit <= 0 or window_seconds <= 0:
        return

    key_identity = _clean_identifier(identifier) or _client_ip(request)
    now = int(time.time())
    window = now // window_seconds
    key = f"rate_limit:{scope}:{window_seconds}:{window}:{key_identity}"

    try:
        redis = get_redis_client()
        pipe = redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds + 5)
        current, _ = pipe.execute()
    except RedisError:
        logger.exception("rate_limit_redis_failed")
        return

    reset_at = ((window + 1) * window_seconds)
    if current <= limit:
        return

    retry_after = max(1, reset_at - now)
    raise HTTPException(
        status_code=429,
        detail="Too many requests. Please try again later.",
        headers={
            "Retry-After": str(retry_after),
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": str(reset_at),
        },
    )


def check_multiple_rate_limits(
    *,
    request: Request,
    scope: str,
    identifier: str | None,
    rules: list[tuple[int, int]],
) -> None:
    for limit, window_seconds in rules:
        check_rate_limit(
            request=request,
            scope=scope,
            identifier=identifier,
            limit=limit,
            window_seconds=window_seconds,
        )


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _clean_identifier(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip().lower()
    if not cleaned:
        return None
    return "".join(ch if ch.isalnum() or ch in {"-", "_", ":", "."} else "_" for ch in cleaned)
