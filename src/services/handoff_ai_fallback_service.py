import logging
from datetime import datetime, timezone

from src.core.config import settings
from src.db.session import SessionLocal
from src.models.conversation import Conversation
from src.models.enums import ConversationStatus
from src.models.message import Message
from src.services.conversation_service import serialize_conversation
from src.services.message_service import create_assistant_message, serialize_message
from src.services.realtime import publish_realtime_event

logger = logging.getLogger(__name__)

_HANDOFF_TIMEOUT_NOTICE = (
    "Nhân viên đang có việc bận. AI sẽ tiếp tục hỗ trợ bạn. "
    "Bạn có thể nhắn thêm câu hỏi để mình hỗ trợ ngay."
)


def resume_expired_handoff_conversations() -> int:
    batch_size = max(1, settings.HANDOFF_AI_FALLBACK_BATCH_SIZE)
    if (
        not settings.HANDOFF_AI_FALLBACK_ENABLED
        or settings.HANDOFF_AI_FALLBACK_TIMEOUT_SECONDS <= 0
    ):
        return 0

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        conversations = (
            db.query(Conversation)
            .filter(
                Conversation.status == ConversationStatus.HANDOFF,
                Conversation.ai_fallback_deadline_at.isnot(None),
                Conversation.ai_fallback_deadline_at <= now,
            )
            .order_by(
                Conversation.ai_fallback_deadline_at.asc(),
                Conversation.id.asc(),
            )
            .with_for_update(skip_locked=True)
            .limit(batch_size)
            .all()
        )

        if not conversations:
            db.rollback()
            return 0

        payloads: list[tuple[Conversation, Message]] = []
        for conversation in conversations:
            conversation.status = ConversationStatus.OPEN
            conversation.ai_fallback_deadline_at = None
            conversation.updated_at = now
            message = create_assistant_message(
                db,
                conversation_id=conversation.id,
                content=_HANDOFF_TIMEOUT_NOTICE,
                intent="handoff_timeout",
                is_fallback=False,
                auto_commit=False,
            )
            payloads.append((conversation, message))

        db.commit()

        for conversation, message in payloads:
            publish_realtime_event(
                "chat.message.created",
                {
                    "conversation_id": conversation.id,
                    "lead_id": conversation.lead_id,
                    "staff_id": conversation.staff_id,
                    "conversation": serialize_conversation(db, conversation),
                    "messages": [serialize_message(message)],
                },
            )

        logger.info(
            "handoff_ai_fallback_resumed conversations=%s",
            len(payloads),
        )
        return len(payloads)
    except Exception:
        db.rollback()
        logger.exception("handoff_ai_fallback_resume_failed")
        raise
    finally:
        db.close()
