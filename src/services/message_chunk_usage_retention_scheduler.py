import asyncio
import logging
from datetime import datetime, time, timedelta

from src.core.config import settings
from src.integrations.redis_client import get_redis_client
from src.services.queue_service import get_default_queue

logger = logging.getLogger(__name__)


async def run_message_chunk_usage_retention_scheduler() -> None:
    if not settings.MESSAGE_CHUNK_USAGE_RETENTION_ENABLED:
        logger.info("message_chunk_usage_retention_scheduler_disabled")
        return

    logger.info("message_chunk_usage_retention_scheduler_started")
    while True:
        await asyncio.sleep(_seconds_until_next_run())
        _enqueue_cleanup_once_per_day()


def _seconds_until_next_run() -> float:
    now = datetime.now().astimezone()
    run_hour = max(0, min(23, settings.MESSAGE_CHUNK_USAGE_RETENTION_RUN_HOUR))
    target = datetime.combine(now.date(), time(hour=run_hour), tzinfo=now.tzinfo)
    if target <= now:
        target += timedelta(days=1)
    return max(1.0, (target - now).total_seconds())


def _enqueue_cleanup_once_per_day() -> None:
    today = datetime.now().astimezone().date().isoformat()
    lock_key = f"message_chunk_usage_retention:{today}"

    try:
        lock_acquired = get_redis_client().set(lock_key, "1", nx=True, ex=90_000)
        if not lock_acquired:
            logger.info("message_chunk_usage_retention_already_enqueued")
            return

        get_default_queue().enqueue_call(
            func="rq_tasks.cleanup_message_chunk_usage",
            kwargs={
                "retention_days": settings.MESSAGE_CHUNK_USAGE_RETENTION_DAYS,
                "batch_size": settings.MESSAGE_CHUNK_USAGE_RETENTION_BATCH_SIZE,
                "max_batches": settings.MESSAGE_CHUNK_USAGE_RETENTION_MAX_BATCHES,
            },
            timeout=600,
            result_ttl=3600,
            failure_ttl=86400,
        )
        logger.info("message_chunk_usage_retention_enqueued")
    except Exception:
        logger.exception("message_chunk_usage_retention_enqueue_failed")
