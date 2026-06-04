import logging

from src.services.queue_service import get_default_queue

logger = logging.getLogger(__name__)


def enqueue_chat_turn_side_effects(
    *,
    conversation_id,
    lead_id,
    query: str,
    intent: str,
    answer_mode: str,
    confidence: float,
    blocked: bool = False,
    track_faq: bool = True,
    track_intent_metric: bool = True,
    user_message_id=None,
    assistant_message_id=None,
) -> None:
    try:
        get_default_queue().enqueue_call(
            func="rq_tasks.process_chat_turn_side_effects",
            kwargs={
                "conversation_id": str(conversation_id),
                "lead_id": str(lead_id),
                "query": query,
                "intent": intent,
                "answer_mode": answer_mode,
                "confidence": float(confidence or 0.0),
                "blocked": bool(blocked),
                "track_faq": bool(track_faq),
                "track_intent_metric": bool(track_intent_metric),
                "user_message_id": str(user_message_id) if user_message_id else None,
                "assistant_message_id": (
                    str(assistant_message_id)
                    if assistant_message_id
                    else None
                ),
            },
            timeout=300,
            result_ttl=3600,
            failure_ttl=86400,
        )
    except Exception:
        logger.exception("chat_turn_side_effect_enqueue_failed")
