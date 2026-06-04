import uuid
from sqlalchemy import Column, Index, String, DateTime, Enum, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.db.base import Base
from .enums import NotificationType, NotificationTarget, NotificationStatus


class Notification(Base):
    __tablename__ = "notification"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    lead_id = Column(UUID(as_uuid=True), ForeignKey("lead.id"), nullable=False)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversation.id"))
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"))

    type = Column(Enum(NotificationType), nullable=False)
    target = Column(Enum(NotificationTarget), nullable=False)
    content = Column(String, nullable=False)

    is_read = Column(Boolean, default=False)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.PENDING)

    created_at = Column(DateTime, server_default=func.now())
    sent_at = Column(DateTime)

    lead = relationship("Lead", back_populates="notifications")
    conversation = relationship("Conversation", back_populates="notifications")
    staff = relationship("Staff", back_populates="notifications")

    __table_args__ = (
        Index("idx_notification_lead_id", "lead_id"),
        Index("idx_notification_conversation_id", "conversation_id"),
        Index("idx_notification_staff_id", "staff_id"),
        Index("idx_notification_type", "type"),
        Index("idx_notification_status", "status"),
        Index("idx_notification_created_at", "created_at"),
        Index("idx_notification_target", "target"),
    )
