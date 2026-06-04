import json
import logging
from typing import Any

from redis.exceptions import RedisError

from src.integrations.redis_client import get_redis_client

logger = logging.getLogger(__name__)

ACTIVE_MAJORS_CACHE_KEY = "chat:majors:active:v1"
MAJOR_LIST_CACHE_PREFIX = "chat:majors:list:"
MAJOR_INFO_CACHE_PREFIX = "chat:majors:info:"
TUITION_BY_MAJOR_CACHE_PREFIX = "chat:tuition:major:"

ACTIVE_MAJORS_CACHE_TTL_SECONDS = 20 * 60
MAJOR_LIST_CACHE_TTL_SECONDS = 20 * 60
MAJOR_INFO_CACHE_TTL_SECONDS = 30 * 60
TUITION_BY_MAJOR_CACHE_TTL_SECONDS = 30 * 60


def build_major_list_cache_key(*, limit: int, major_type: str | None) -> str:
    safe_limit = _coerce_limit(limit)
    normalized_type = _normalize_major_type(major_type)
    return (
        f"{MAJOR_LIST_CACHE_PREFIX}"
        f"major_type:{normalized_type}:limit:{safe_limit}:v1"
    )


def get_cached_active_majors() -> list[dict[str, Any]] | None:
    payload = _get_json(ACTIVE_MAJORS_CACHE_KEY)
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    return None


def set_cached_active_majors(items: list[dict[str, Any]]) -> None:
    _set_json(
        ACTIVE_MAJORS_CACHE_KEY,
        items,
        ttl_seconds=ACTIVE_MAJORS_CACHE_TTL_SECONDS,
    )


def get_cached_major_list(cache_key: str) -> dict[str, Any] | None:
    payload = _get_json(cache_key)
    return payload if isinstance(payload, dict) else None


def set_cached_major_list(cache_key: str, payload: dict[str, Any]) -> None:
    _set_json(cache_key, payload, ttl_seconds=MAJOR_LIST_CACHE_TTL_SECONDS)


def build_major_info_cache_key(*, major_id: Any) -> str:
    return f"{MAJOR_INFO_CACHE_PREFIX}{_normalize_key_segment(major_id)}:v1"


def get_cached_major_info(cache_key: str) -> dict[str, Any] | None:
    payload = _get_json(cache_key)
    return payload if isinstance(payload, dict) else None


def set_cached_major_info(cache_key: str, payload: dict[str, Any]) -> None:
    _set_json(cache_key, payload, ttl_seconds=MAJOR_INFO_CACHE_TTL_SECONDS)


def build_tuition_by_major_cache_key(*, major_id: Any, year: int | None, limit: int) -> str:
    major_key = _normalize_key_segment(major_id)
    year_key = str(year) if year is not None else "all"
    safe_limit = _coerce_tuition_limit(limit)
    return (
        f"{TUITION_BY_MAJOR_CACHE_PREFIX}{major_key}:"
        f"year:{year_key}:limit:{safe_limit}:v1"
    )


def get_cached_tuition_by_major(cache_key: str) -> dict[str, Any] | None:
    payload = _get_json(cache_key)
    return payload if isinstance(payload, dict) else None


def set_cached_tuition_by_major(cache_key: str, payload: dict[str, Any]) -> None:
    _set_json(
        cache_key,
        payload,
        ttl_seconds=TUITION_BY_MAJOR_CACHE_TTL_SECONDS,
    )


def invalidate_major_caches() -> None:
    try:
        redis = get_redis_client()
        keys: list[Any] = [ACTIVE_MAJORS_CACHE_KEY]
        keys.extend(list(redis.scan_iter(match=f"{MAJOR_LIST_CACHE_PREFIX}*")))
        keys.extend(list(redis.scan_iter(match=f"{MAJOR_INFO_CACHE_PREFIX}*")))
        if not keys:
            return
        redis.delete(*keys)
    except RedisError:
        logger.exception("major_cache_invalidate_failed")


def invalidate_tuition_caches(*, major_id: Any | None = None) -> None:
    try:
        redis = get_redis_client()
        if major_id is None:
            keys = list(redis.scan_iter(match=f"{TUITION_BY_MAJOR_CACHE_PREFIX}*"))
        else:
            major_key = _normalize_key_segment(major_id)
            keys = list(redis.scan_iter(match=f"{TUITION_BY_MAJOR_CACHE_PREFIX}{major_key}:*"))
        if not keys:
            return
        redis.delete(*keys)
    except RedisError:
        logger.exception("major_cache_invalidate_tuition_failed major_id=%s", major_id)


def _get_json(key: str) -> Any:
    try:
        raw = get_redis_client().get(key)
    except RedisError:
        logger.exception("major_cache_get_failed key=%s", key)
        return None

    decoded = _decode_redis_payload(raw)
    if not decoded:
        return None

    try:
        return json.loads(decoded)
    except (json.JSONDecodeError, TypeError, ValueError):
        logger.warning("major_cache_invalid_json key=%s", key)
        return None


def _set_json(key: str, payload: Any, *, ttl_seconds: int) -> None:
    try:
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        get_redis_client().setex(key, max(1, int(ttl_seconds)), encoded)
    except (TypeError, ValueError):
        logger.warning("major_cache_encode_failed key=%s", key)
    except RedisError:
        logger.exception("major_cache_set_failed key=%s", key)


def _decode_redis_payload(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8")
        except UnicodeDecodeError:
            return None
    if isinstance(value, str):
        return value
    return str(value)


def _normalize_major_type(value: str | None) -> str:
    raw = str(value or "").strip().upper()
    if not raw:
        return "ALL"
    return "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in raw)


def _normalize_key_segment(value: Any) -> str:
    raw = str(value or "").strip().lower()
    if not raw:
        return "unknown"
    return "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in raw)


def _coerce_limit(limit: int) -> int:
    try:
        numeric = int(limit)
    except (TypeError, ValueError):
        return 20
    return max(1, min(numeric, 200))


def _coerce_tuition_limit(limit: int) -> int:
    try:
        numeric = int(limit)
    except (TypeError, ValueError):
        return 10
    return max(1, min(numeric, 50))
