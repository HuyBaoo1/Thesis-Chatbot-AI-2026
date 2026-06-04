from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from src.api.deps import require_role
from src.db import session
from src.models.enums import NotificationStatus, NotificationTarget, StaffRole
from src.schemas.notification import (
    NotificationListOut,
    NotificationOut,
    UnreadNotificationCountOut,
)
from src.services import notification_service
from src.services.realtime import broadcast_realtime_event


router = APIRouter(prefix="/notifications", tags=["Notification"])
staff_required = require_role([StaffRole.ADMIN, StaffRole.COUNSELOR])


@router.get("", response_model=NotificationListOut)
def list_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    is_read: bool | None = Query(default=None),
    target: NotificationTarget | None = Query(default=None),
    status: NotificationStatus | None = Query(default=None),
    lead_id: UUID | None = Query(default=None),
    conversation_id: UUID | None = Query(default=None),
    staff_id: UUID | None = Query(default=None),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    effective_staff_id = _resolve_notification_staff_filter(user, staff_id)
    return notification_service.list_notifications(
        db,
        limit=limit,
        offset=offset,
        is_read=is_read,
        target=target,
        status=status,
        lead_id=lead_id,
        conversation_id=conversation_id,
        staff_id=effective_staff_id,
    )


@router.get("/unread-count", response_model=UnreadNotificationCountOut)
def get_unread_notification_count(
    target: NotificationTarget | None = Query(default=None),
    staff_id: UUID | None = Query(default=None),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    effective_staff_id = _resolve_notification_staff_filter(user, staff_id)
    return {
        "unread_count": notification_service.get_unread_count(
            db,
            target=target,
            staff_id=effective_staff_id,
        )
    }


@router.patch("/read-all")
def mark_all_notifications_read(
    background_tasks: BackgroundTasks,
    target: NotificationTarget | None = Query(default=None),
    staff_id: UUID | None = Query(default=None),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    effective_staff_id = _resolve_notification_staff_filter(user, staff_id)
    result = notification_service.mark_all_notifications_read(
        db,
        target=target,
        staff_id=effective_staff_id,
    )
    background_tasks.add_task(
        broadcast_realtime_event,
        "notification.changed",
        {
            "staff_id": effective_staff_id,
            "target": target,
            "read_all": True,
        },
    )
    return result


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: UUID,
    background_tasks: BackgroundTasks,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    notification = notification_service.mark_notification_read(
        db,
        notification_id,
        requester_staff_id=UUID(user["sub"]),
        is_admin=user.get("role") in (StaffRole.ADMIN, StaffRole.ADMIN.value),
    )
    background_tasks.add_task(
        broadcast_realtime_event,
        "notification.changed",
        {
            "notification": notification_service.serialize_notification(notification),
            "conversation_id": notification.conversation_id,
            "lead_id": notification.lead_id,
            "staff_id": notification.staff_id,
            "target": notification.target,
        },
    )
    return notification


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: UUID,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return notification_service.delete_notification(
        db,
        notification_id,
        requester_staff_id=UUID(user["sub"]),
        is_admin=user.get("role") in (StaffRole.ADMIN, StaffRole.ADMIN.value),
    )


def _resolve_notification_staff_filter(
    user: dict,
    requested_staff_id: UUID | None,
) -> UUID | None:
    if user.get("role") in (StaffRole.ADMIN, StaffRole.ADMIN.value):
        return requested_staff_id
    current_staff_id = UUID(user["sub"])
    if requested_staff_id is not None and requested_staff_id != current_staff_id:
        raise HTTPException(status_code=403, detail="You can only access your notifications")
    return current_staff_id
