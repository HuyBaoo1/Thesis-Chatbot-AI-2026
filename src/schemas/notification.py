from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from src.models.enums import NotificationStatus, NotificationTarget, NotificationType


class NotificationOut(BaseModel):
    id: UUID
    lead_id: UUID
    conversation_id: UUID | None = None
    staff_id: UUID | None = None
    type: NotificationType
    target: NotificationTarget
    content: str
    is_read: bool
    status: NotificationStatus
    created_at: datetime | None = None
    sent_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class NotificationListOut(BaseModel):
    items: list[NotificationOut]
    total: int
    limit: int
    offset: int
    has_more: bool


class UnreadNotificationCountOut(BaseModel):
    unread_count: int
