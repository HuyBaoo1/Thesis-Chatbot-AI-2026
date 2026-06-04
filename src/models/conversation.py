import uuid
from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from src.db.base import Base
from .enums import Channel, ConversationStatus


class Conversation(Base):
    __tablename__ = "conversation"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    lead_id = Column(UUID(as_uuid=True), ForeignKey("lead.id"), nullable=False)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"))

    channel = Column(Enum(Channel), default=Channel.WEB)
    status = Column(Enum(ConversationStatus), default=ConversationStatus.OPEN)

    summary = Column(String)
    external_id = Column(String)
    source_domain = Column(String)  # e.g. "tuyensinh.vinuni.edu.vn" when embedded via widget
    ai_fallback_deadline_at = Column(DateTime)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    lead = relationship("Lead", back_populates="conversations")
    staff = relationship("Staff", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")
    notifications = relationship("Notification", back_populates="conversation")

    __table_args__ = (
        Index("idx_conversation_lead_id", "lead_id"),
        Index("idx_conversation_status", "status"),
        Index("idx_conversation_created_at", "created_at"),
        Index("idx_conversation_ai_fallback_deadline_at", "ai_fallback_deadline_at"),
    )
