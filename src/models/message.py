import uuid
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Index, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.db.base import Base
from .enums import MessageRole


class Message(Base):
    __tablename__ = "message"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversation.id"), nullable=False)

    role = Column(Enum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)

    intent = Column(String)
    is_fallback = Column(Boolean, default=False)
    citations_json = Column(JSON, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")
    chunks_used = relationship("MessageChunkUsage", back_populates="message")

    __table_args__ = (
        Index("idx_message_conversation_id", "conversation_id"),
        Index("idx_message_intent", "intent"),
        Index("idx_message_is_fallback", "is_fallback"),
        Index("idx_message_created_at", "created_at"),
    )
