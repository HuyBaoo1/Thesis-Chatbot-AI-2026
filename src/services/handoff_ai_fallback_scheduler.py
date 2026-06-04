import asyncio
import logging

from src.core.config import settings
from src.services.handoff_ai_fallback_service import (
    resume_expired_handoff_conversations,
)

logger = logging.getLogger(__name__)


async def run_handoff_ai_fallback_scheduler() -> None:
    if (
        not settings.HANDOFF_AI_FALLBACK_ENABLED
        or settings.HANDOFF_AI_FALLBACK_TIMEOUT_SECONDS <= 0
    ):
        logger.info("handoff_ai_fallback_scheduler_disabled")
        return

    interval_seconds = max(5.0, settings.HANDOFF_AI_FALLBACK_POLL_INTERVAL_SECONDS)
    logger.info(
        "handoff_ai_fallback_scheduler_started interval_seconds=%s timeout_seconds=%s",
        interval_seconds,
        settings.HANDOFF_AI_FALLBACK_TIMEOUT_SECONDS,
    )

    consecutive_errors = 0
    while True:
        try:
            resumed_count = await asyncio.to_thread(
                resume_expired_handoff_conversations
            )
            if resumed_count:
                logger.info(
                    "handoff_ai_fallback_scheduler_resumed conversations=%s",
                    resumed_count,
                )
            consecutive_errors = 0
        except asyncio.CancelledError:
            raise
        except Exception:
            consecutive_errors += 1
            logger.exception("handoff_ai_fallback_scheduler_cycle_failed")
            if consecutive_errors >= 3:
                backoff = min(interval_seconds * 2, 300)
                logger.warning(
                    "handoff_ai_fallback_scheduler_backing_off seconds=%s",
                    backoff,
                )
                await asyncio.sleep(backoff)
                consecutive_errors = 0
                continue

        await asyncio.sleep(interval_seconds)
