import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from src.db.base import Base


class FAQAnalytics(Base):
    __tablename__ = "faq_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    question = Column(String, nullable=False)
    normalized = Column(String, unique=True, nullable=False)
    intent = Column(String)

    count = Column(Integer, default=1)
    is_fallback = Column(Boolean, default=False)

    last_conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversation.id", ondelete="SET NULL"),
    )
    last_user_message_id = Column(
        UUID(as_uuid=True),
        ForeignKey("message.id", ondelete="SET NULL"),
    )
    last_assistant_message_id = Column(
        UUID(as_uuid=True),
        ForeignKey("message.id", ondelete="SET NULL"),
    )

    last_asked_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_faq_intent", "intent"),
        Index("idx_faq_count", "count"),
        Index("idx_faq_last_asked_at", "last_asked_at"),
        Index("idx_faq_last_conversation_id", "last_conversation_id"),
        Index("idx_faq_last_user_message_id", "last_user_message_id"),
        Index("idx_faq_last_assistant_message_id", "last_assistant_message_id"),
    )
