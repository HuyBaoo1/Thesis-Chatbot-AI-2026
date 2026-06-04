import asyncio
import logging

from src.core.config import settings
from src.services.semantic_answer_cache_cleanup_service import (
    cleanup_expired_semantic_answer_cache_points,
)

logger = logging.getLogger(__name__)


async def run_semantic_answer_cache_cleanup_scheduler() -> None:
    if not settings.SEMANTIC_ANSWER_CACHE_CLEANUP_ENABLED:
        logger.info("semantic_answer_cache_cleanup_scheduler_disabled")
        return

    interval_seconds = max(30.0, settings.SEMANTIC_ANSWER_CACHE_CLEANUP_INTERVAL_SECONDS)
    logger.info(
        "semantic_answer_cache_cleanup_scheduler_started interval_seconds=%s batch_size=%s max_batches=%s",
        interval_seconds,
        settings.SEMANTIC_ANSWER_CACHE_CLEANUP_BATCH_SIZE,
        settings.SEMANTIC_ANSWER_CACHE_CLEANUP_MAX_BATCHES,
    )

    consecutive_errors = 0
    while True:
        try:
            result = await asyncio.to_thread(
                cleanup_expired_semantic_answer_cache_points,
                batch_size=settings.SEMANTIC_ANSWER_CACHE_CLEANUP_BATCH_SIZE,
                max_batches=settings.SEMANTIC_ANSWER_CACHE_CLEANUP_MAX_BATCHES,
            )
            deleted = int(result.get("deleted") or 0)
            if deleted:
                logger.info(
                    "semantic_answer_cache_cleanup_scheduler_deleted points=%s batches=%s",
                    deleted,
                    result.get("batches"),
                )
            consecutive_errors = 0
        except asyncio.CancelledError:
            raise
        except Exception:
            consecutive_errors += 1
            logger.exception("semantic_answer_cache_cleanup_scheduler_cycle_failed")
            if consecutive_errors >= 3:
                backoff = min(interval_seconds * 2, 300)
                logger.warning(
                    "semantic_answer_cache_cleanup_scheduler_backing_off seconds=%s",
                    backoff,
                )
                await asyncio.sleep(backoff)
                consecutive_errors = 0
                continue

        await asyncio.sleep(interval_seconds)
