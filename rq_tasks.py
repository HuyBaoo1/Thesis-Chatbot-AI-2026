from uuid import UUID

from src.db.session import SessionLocal
from src.services.chat_pipeline.conversation_summary import maybe_update_conversation_summary
from src.services.conversation_service import (
    get_conversation_or_404,
    serialize_conversation,
)
from src.services.daily_analytic_service import (
    increment_fallbacks,
    increment_total_chats,
    track_intent,
)
from src.services.faq_analytics_service import track_question
from src.services.lead_major_interest_service import upsert_major_interest_from_query
from src.services.lead_service import mark_lead_interacted, recompute_lead_scoring
from src.services.message_chunk_usage_retention_service import (
    cleanup_old_message_chunk_usages,
)
from src.services.notification_service import (
    create_hot_lead_notification_if_missing,
    serialize_notification,
)
from src.services.realtime import publish_realtime_event


def process_chat_turn_side_effects(
    *,
    conversation_id: str,
    lead_id: str,
    query: str,
    intent: str,
    answer_mode: str,
    confidence: float,
    blocked: bool = False,
    track_faq: bool = True,
    track_intent_metric: bool = True,
    user_message_id: str | None = None,
    assistant_message_id: str | None = None,
) -> None:
    db = SessionLocal()
    try:
        lead_uuid = UUID(str(lead_id))
        conversation_uuid = UUID(str(conversation_id))
        user_message_uuid = UUID(str(user_message_id)) if user_message_id else None
        assistant_message_uuid = (
            UUID(str(assistant_message_id)) if assistant_message_id else None
        )
        is_fallback = confidence < 0.4
        notification = None

        increment_total_chats(db, amount=1, auto_commit=False)
        mark_lead_interacted(db, lead_id=lead_uuid, auto_commit=False)
        if not blocked:
            upsert_major_interest_from_query(
                db,
                lead_id=lead_uuid,
                query=query,
                auto_commit=False,
            )

        if blocked:
            increment_fallbacks(db, amount=1, auto_commit=False)
        else:
            if track_intent_metric:
                track_intent(db, intent, auto_commit=False)
            if is_fallback:
                increment_fallbacks(db, amount=1, auto_commit=False)
            if track_faq and answer_mode not in {"direct", "history"}:
                track_question(
                    db,
                    question=query,
                    intent=intent,
                    is_fallback=is_fallback,
                    conversation_id=conversation_uuid,
                    user_message_id=user_message_uuid,
                    assistant_message_id=assistant_message_uuid,
                    auto_commit=False,
                )

        lead_after = recompute_lead_scoring(db, lead_id=lead_uuid, auto_commit=False)
        if getattr(lead_after.temperature, "value", lead_after.temperature) == "HOT":
            notification = create_hot_lead_notification_if_missing(
                db,
                lead_id=lead_uuid,
                content="Lead đạt mức HOT, cần ưu tiên tư vấn ngay.",
                auto_commit=False,
            )

        db.commit()
        conversation = get_conversation_or_404(db, conversation_uuid)
        publish_realtime_event(
            "chat.conversation.updated",
            {
                "conversation_id": conversation.id,
                "lead_id": conversation.lead_id,
                "staff_id": conversation.staff_id,
                "conversation": serialize_conversation(db, conversation),
            },
        )
        if notification is not None:
            publish_realtime_event(
                "notification.changed",
                {
                    "notification": serialize_notification(notification),
                    "conversation_id": str(conversation_uuid),
                    "lead_id": notification.lead_id,
                    "staff_id": notification.staff_id,
                    "target": notification.target,
                },
            )
        maybe_update_conversation_summary(db, conversation_id=conversation_uuid)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def cleanup_message_chunk_usage(
    *,
    retention_days: int = 60,
    batch_size: int = 1000,
    max_batches: int = 100,
) -> dict:
    db = SessionLocal()
    try:
        result = cleanup_old_message_chunk_usages(
            db,
            retention_days=retention_days,
            batch_size=batch_size,
            max_batches=max_batches,
        )
        return result
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


__all__ = ["process_chat_turn_side_effects", "cleanup_message_chunk_usage"]
