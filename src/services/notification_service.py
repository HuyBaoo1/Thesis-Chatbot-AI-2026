from uuid import UUID

from fastapi import HTTPException

from src.models.enums import NotificationStatus, NotificationTarget, NotificationType
from src.models.notification import Notification
from src.services.realtime import publish_realtime_event


def create_notification(
    db,
    *,
    lead_id: UUID,
    conversation_id: UUID | None = None,
    staff_id: UUID | None = None,
    content: str,
    type: NotificationType = NotificationType.HOT_LEAD,
    target: NotificationTarget = NotificationTarget.ADMIN,
    auto_commit: bool = True,
) -> Notification:
    item = Notification(
        lead_id=lead_id,
        conversation_id=conversation_id,
        staff_id=staff_id,
        type=type,
        target=target,
        content=content,
        status=NotificationStatus.PENDING,
    )
    db.add(item)
    if auto_commit:
        db.commit()
        db.refresh(item)
        publish_realtime_event(
            "notification.changed",
            {
                "notification": serialize_notification(item),
                "conversation_id": item.conversation_id,
                "lead_id": item.lead_id,
                "staff_id": item.staff_id,
                "target": item.target,
            },
        )
    else:
        db.flush()
    return item


def serialize_notification(item: Notification) -> dict:
    return {
        "id": item.id,
        "lead_id": item.lead_id,
        "conversation_id": item.conversation_id,
        "staff_id": item.staff_id,
        "type": item.type,
        "target": item.target,
        "content": item.content,
        "is_read": item.is_read,
        "status": item.status,
        "created_at": item.created_at,
        "sent_at": item.sent_at,
    }


def create_hot_lead_notification_if_missing(
    db,
    *,
    lead_id: UUID,
    content: str,
    target: NotificationTarget = NotificationTarget.ADMIN,
    auto_commit: bool = True,
) -> Notification:
    existing = (
        db.query(Notification)
        .filter(
            Notification.lead_id == lead_id,
            Notification.type == NotificationType.HOT_LEAD,
            Notification.target == target,
            Notification.is_read.is_(False),
        )
        .order_by(Notification.created_at.desc())
        .first()
    )
    if existing:
        return existing

    return create_notification(
        db,
        lead_id=lead_id,
        content=content,
        type=NotificationType.HOT_LEAD,
        target=target,
        auto_commit=auto_commit,
    )


def create_staff_contact_request_notification_if_missing(
    db,
    *,
    lead_id: UUID,
    conversation_id: UUID,
    staff_id: UUID,
    content: str,
    auto_commit: bool = True,
) -> Notification:
    existing = (
        db.query(Notification)
        .filter(
            Notification.lead_id == lead_id,
            Notification.conversation_id == conversation_id,
            Notification.staff_id == staff_id,
            Notification.type == NotificationType.FOLLOW_UP,
            Notification.target == NotificationTarget.STAFF,
            Notification.is_read.is_(False),
        )
        .order_by(Notification.created_at.desc())
        .first()
    )
    if existing:
        return existing

    return create_notification(
        db,
        lead_id=lead_id,
        conversation_id=conversation_id,
        staff_id=staff_id,
        content=content,
        type=NotificationType.FOLLOW_UP,
        target=NotificationTarget.STAFF,
        auto_commit=auto_commit,
    )


def get_notification_or_404(db, notification_id: UUID) -> Notification:
    item = db.get(Notification, notification_id)
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found")
    return item


def list_notifications(
    db,
    *,
    limit: int = 20,
    offset: int = 0,
    is_read: bool | None = None,
    target: NotificationTarget | None = None,
    status: NotificationStatus | None = None,
    lead_id: UUID | None = None,
    conversation_id: UUID | None = None,
    staff_id: UUID | None = None,
) -> dict:
    normalized_limit = max(1, min(limit, 100))
    normalized_offset = max(0, offset)
    query = db.query(Notification)

    if is_read is not None:
        query = query.filter(Notification.is_read.is_(is_read))
    if target is not None:
        query = query.filter(Notification.target == target)
    if status is not None:
        query = query.filter(Notification.status == status)
    if lead_id is not None:
        query = query.filter(Notification.lead_id == lead_id)
    if conversation_id is not None:
        query = query.filter(Notification.conversation_id == conversation_id)
    if staff_id is not None:
        query = query.filter(Notification.staff_id == staff_id)

    total = query.count()
    rows = (
        query
        .order_by(Notification.created_at.desc())
        .offset(normalized_offset)
        .limit(normalized_limit)
        .all()
    )
    return {
        "items": rows,
        "total": total,
        "limit": normalized_limit,
        "offset": normalized_offset,
        "has_more": normalized_offset + len(rows) < total,
    }


def get_unread_count(
    db,
    *,
    target: NotificationTarget | None = None,
    staff_id: UUID | None = None,
) -> int:
    query = db.query(Notification).filter(Notification.is_read.is_(False))
    if target is not None:
        query = query.filter(Notification.target == target)
    if staff_id is not None:
        query = query.filter(Notification.staff_id == staff_id)
    return query.count()


def mark_notification_read(
    db,
    notification_id: UUID,
    *,
    requester_staff_id: UUID | None = None,
    is_admin: bool = False,
) -> Notification:
    item = get_notification_or_404(db, notification_id)
    if not is_admin and item.staff_id != requester_staff_id:
        raise HTTPException(status_code=403, detail="You can only update your notifications")
    item.is_read = True
    db.commit()
    db.refresh(item)
    return item


def mark_all_notifications_read(
    db,
    *,
    target: NotificationTarget | None = None,
    staff_id: UUID | None = None,
) -> dict:
    query = db.query(Notification).filter(Notification.is_read.is_(False))
    if target is not None:
        query = query.filter(Notification.target == target)
    if staff_id is not None:
        query = query.filter(Notification.staff_id == staff_id)

    rows = query.all()
    for item in rows:
        item.is_read = True
    db.commit()
    return {"updated": len(rows)}


def delete_notification(
    db,
    notification_id: UUID,
    *,
    requester_staff_id: UUID | None = None,
    is_admin: bool = False,
) -> dict:
    item = get_notification_or_404(db, notification_id)
    if not is_admin and item.staff_id != requester_staff_id:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your notifications",
        )

    db.delete(item)
    db.commit()
    return {"message": "Notification deleted successfully"}
