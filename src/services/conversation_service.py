from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, update

from src.core.config import settings
from src.core.security import create_conversation_access_token, decode_token
from src.models.conversation import Conversation
from src.models.lead import Lead
from src.models.enums import Channel, ConversationStatus, StaffRole
from src.models.message import Message
from src.models.staff import Staff
from src.services.lead_service import get_lead_or_404
from src.services.notification_service import create_staff_contact_request_notification_if_missing


def get_conversation_or_404(db, conversation_id: UUID) -> Conversation:
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


def schedule_conversation_ai_fallback(conversation: Conversation) -> Conversation:
    timeout_seconds = max(0, settings.HANDOFF_AI_FALLBACK_TIMEOUT_SECONDS)
    if (
        conversation.status != ConversationStatus.HANDOFF
        or not settings.HANDOFF_AI_FALLBACK_ENABLED
        or timeout_seconds <= 0
    ):
        conversation.ai_fallback_deadline_at = None
        return conversation

    conversation.ai_fallback_deadline_at = datetime.now(timezone.utc) + timedelta(
        seconds=timeout_seconds
    )
    return conversation


def clear_conversation_ai_fallback_deadline(conversation: Conversation) -> Conversation:
    conversation.ai_fallback_deadline_at = None
    return conversation


def create_conversation(
    db,
    *,
    lead_id: UUID | None = None,
    auto_commit: bool = True,
    source_domain: str | None = None,
) -> Conversation:
    lead = get_lead_or_404(db, lead_id)
    conv = Conversation(
        lead_id=lead.id,
        channel=Channel.WEB,
        status=ConversationStatus.OPEN,
        source_domain=source_domain,
    )
    db.add(conv)
    if auto_commit:
        db.commit()
        db.refresh(conv)
    else:
        db.flush()
    return conv


def ensure_conversation(
    db,
    *,
    lead_id: UUID | None,
    conversation_id: UUID | None,
    auto_commit: bool = True,
    source_domain: str | None = None,
) -> Conversation:
    if conversation_id:
        conv = get_conversation_or_404(db, conversation_id)
        if lead_id and conv.lead_id != lead_id:
            raise HTTPException(status_code=403, detail="Conversation does not belong to this lead")
        # Backfill source_domain atomically — using UPDATE ... WHERE avoids a
        # read-check-write race when two concurrent requests see NULL.
        if source_domain and not conv.source_domain:
            db.execute(
                update(Conversation)
                .where(Conversation.id == conv.id, Conversation.source_domain.is_(None))
                .values(source_domain=source_domain)
            )
            if auto_commit:
                db.commit()
            # refresh to sync the in-memory object with the UPDATE result
            db.refresh(conv)
        return conv
    return create_conversation(
        db, lead_id=lead_id, auto_commit=auto_commit, source_domain=source_domain
    )


def get_conversation_detail(db, conversation_id: UUID) -> dict:
    conv = get_conversation_or_404(db, conversation_id)
    return serialize_conversation(db, conv)


def issue_conversation_access_token(conversation: Conversation) -> str:
    return create_conversation_access_token(
        {
            "conversation_id": str(conversation.id),
            "lead_id": str(conversation.lead_id),
        }
    )


def is_valid_conversation_access_token(
    conversation: Conversation,
    token: str | None,
) -> bool:
    if not token:
        return False

    payload = decode_token(token)
    if not payload or payload.get("token_type") != "conversation_access":
        return False

    return (
        payload.get("conversation_id") == str(conversation.id)
        and payload.get("lead_id") == str(conversation.lead_id)
    )


def can_access_conversation(
    db,
    *,
    conversation_id: UUID,
    requester_role: StaffRole | str | None,
    requester_staff_id: UUID | str | None,
) -> bool:
    if requester_role in (StaffRole.ADMIN, StaffRole.ADMIN.value):
        return True

    if requester_staff_id is None:
        return False

    conv = db.get(Conversation, conversation_id)
    if conv is None:
        return False

    if conv.staff_id is None:
        return requester_role in (
            StaffRole.COUNSELOR,
            StaffRole.COUNSELOR.value,
        ) and conv.status == ConversationStatus.HANDOFF

    return str(conv.staff_id) == str(requester_staff_id)


def update_conversation_status(
    db,
    *,
    conversation_id: UUID,
    status: ConversationStatus,
) -> dict:
    conv = get_conversation_or_404(db, conversation_id)
    conv.status = status
    if status == ConversationStatus.HANDOFF and conv.staff_id is None:
        auto_assign_conversation_staff(db, conversation=conv, auto_commit=False)
    clear_conversation_ai_fallback_deadline(conv)

    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conv)
    return serialize_conversation(db, conv)


def request_staff_contact(
    db,
    *,
    conversation_id: UUID,
) -> dict:
    conv = get_conversation_or_404(db, conversation_id)
    if conv.status == ConversationStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Conversation is closed")
    if conv.status == ConversationStatus.HANDOFF:
        return serialize_conversation(db, conv)

    staff = db.get(Staff, conv.staff_id) if conv.staff_id else None
    if staff is not None and not staff.is_active:
        staff = None
    if staff is None:
        staff = (
            _select_least_busy_staff(db, StaffRole.COUNSELOR)
            or _select_least_busy_staff(db, StaffRole.ADMIN)
        )
    if not staff:
        raise HTTPException(
            status_code=409,
            detail="No active staff available for contact request",
        )

    conv.staff_id = staff.id
    conv.updated_at = datetime.now(timezone.utc)
    _sync_lead_staff_assignment(db, conv, staff.id)

    lead_name = conv.lead.full_name if conv.lead else "Lead"
    create_staff_contact_request_notification_if_missing(
        db,
        lead_id=conv.lead_id,
        conversation_id=conv.id,
        staff_id=staff.id,
        content=f"{lead_name} đang yêu cầu được tư vấn. Hãy liên hệ ngay.",
        auto_commit=False,
    )

    db.commit()
    db.refresh(conv)
    return serialize_conversation(db, conv)


def auto_assign_conversation_staff(
    db,
    *,
    conversation: Conversation,
    auto_commit: bool = True,
) -> Conversation:
    if conversation.staff_id is not None:
        _sync_lead_staff_assignment(db, conversation, conversation.staff_id)
        if auto_commit:
            db.commit()
            db.refresh(conversation)
        else:
            db.flush()
        return conversation

    staff = (
        _select_least_busy_staff(db, StaffRole.COUNSELOR)
        or _select_least_busy_staff(db, StaffRole.ADMIN)
    )
    if not staff:
        raise HTTPException(
            status_code=409,
            detail="No active staff available for handoff",
        )

    conversation.staff_id = staff.id
    conversation.updated_at = datetime.now(timezone.utc)
    _sync_lead_staff_assignment(db, conversation, staff.id)
    if auto_commit:
        db.commit()
        db.refresh(conversation)
    else:
        db.flush()
    return conversation


def _select_least_busy_staff(db, role: StaffRole) -> Staff | None:
    row = (
        db.query(Staff, func.count(Conversation.id).label("active_conversation_count"))
        .outerjoin(
            Conversation,
            and_(
                Conversation.staff_id == Staff.id,
                Conversation.status.in_([ConversationStatus.OPEN, ConversationStatus.HANDOFF]),
            ),
        )
        .filter(
            Staff.is_active.is_(True),
            Staff.role == role,
        )
        .group_by(Staff.id)
        .order_by(func.count(Conversation.id).asc(), Staff.created_at.asc())
        .first()
    )
    return row[0] if row else None


def _sync_lead_staff_assignment(db, conversation: Conversation, staff_id: UUID) -> None:
    lead = get_lead_or_404(db, conversation.lead_id)
    if lead.assigned_staff_id is None:
        lead.assigned_staff_id = staff_id


def list_lead_conversations(
    db,
    *,
    lead_id: UUID,
    limit: int = 20,
    before: str | None = None,
) -> dict:
    get_lead_or_404(db, lead_id)

    normalized_limit = max(1, min(limit, 100))
    query = db.query(Conversation).filter(Conversation.lead_id == lead_id)
    total = query.count()

    if before:
        before_updated_at, before_id = _parse_conversation_cursor(before)
        query = query.filter(
            or_(
                Conversation.updated_at < before_updated_at,
                and_(
                    Conversation.updated_at == before_updated_at,
                    Conversation.id < before_id,
                ),
            )
        )

    conversations = (
        query
        .order_by(Conversation.updated_at.desc(), Conversation.id.desc())
        .limit(normalized_limit + 1)
        .all()
    )

    has_more = len(conversations) > normalized_limit
    conversations = conversations[:normalized_limit]
    items = [serialize_conversation(db, conv) for conv in conversations]
    last_conv = conversations[-1] if conversations else None
    next_before = (
        _build_conversation_cursor(last_conv) if has_more and last_conv is not None else None
    )

    return {
        "lead_id": lead_id,
        "items": items,
        "total": total,
        "limit": normalized_limit,
        "before": before,
        "next_before": next_before,
        "has_more": has_more,
    }


def list_conversations(
    db,
    *,
    limit: int = 20,
    before: str | None = None,
    status: ConversationStatus | None = None,
    channel: Channel | None = None,
    staff_id: UUID | None = None,
    assigned: bool | None = None,
    q: str | None = None,
    requester_role: StaffRole | str | None = None,
    requester_staff_id: UUID | None = None,
) -> dict:
    normalized_limit = max(1, min(limit, 100))

    is_admin = requester_role in (StaffRole.ADMIN, StaffRole.ADMIN.value)
    effective_staff_id = staff_id
    if not is_admin and requester_staff_id is not None:
        if effective_staff_id is not None and effective_staff_id != requester_staff_id:
            raise HTTPException(status_code=403, detail="You can only access conversations assigned to you")
        effective_staff_id = requester_staff_id

    query = db.query(Conversation).join(Lead, Conversation.lead_id == Lead.id)

    if status is not None:
        query = query.filter(Conversation.status == status)
    if channel is not None:
        query = query.filter(Conversation.channel == channel)
    if effective_staff_id is not None:
        query = query.filter(Conversation.staff_id == effective_staff_id)
    if assigned is not None:
        if assigned:
            query = query.filter(Conversation.staff_id.isnot(None))
        else:
            query = query.filter(Conversation.staff_id.is_(None))
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Lead.full_name.ilike(pattern),
                Lead.email.ilike(pattern),
                Lead.phone.ilike(pattern),
                Conversation.summary.ilike(pattern),
            )
        )

    total = query.count()

    if before:
        before_updated_at, before_id = _parse_conversation_cursor(before)
        query = query.filter(
            or_(
                Conversation.updated_at < before_updated_at,
                and_(
                    Conversation.updated_at == before_updated_at,
                    Conversation.id < before_id,
                ),
            )
        )

    conversations = (
        query
        .order_by(Conversation.updated_at.desc(), Conversation.id.desc())
        .limit(normalized_limit + 1)
        .all()
    )

    has_more = len(conversations) > normalized_limit
    conversations = conversations[:normalized_limit]
    items = [serialize_conversation(db, conv) for conv in conversations]
    last_conv = conversations[-1] if conversations else None
    next_before = (
        _build_conversation_cursor(last_conv) if has_more and last_conv is not None else None
    )
    return {
        "items": items,
        "total": total,
        "limit": normalized_limit,
        "before": before,
        "next_before": next_before,
        "has_more": has_more,
    }


def serialize_conversation(
    db,
    conv: Conversation,
    *,
    conversation_token: str | None = None,
    hide_pii: bool = False,
) -> dict:
    message_count = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .count()
    )
    last_message = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .first()
    )
    return {
        "id": conv.id,
        "conversation_token": conversation_token,
        "lead_id": conv.lead_id,
        "lead_full_name": conv.lead.full_name if conv.lead else None,
        "lead_email": None if hide_pii else (conv.lead.email if conv.lead else None),
        "lead_phone": None if hide_pii else (conv.lead.phone if conv.lead else None),
        "lead_temperature": conv.lead.temperature if conv.lead else None,
        "lead_score": conv.lead.score if conv.lead else None,
        "staff_id": conv.staff_id,
        "staff_name": conv.staff.name if conv.staff else None,
        "channel": conv.channel,
        "status": conv.status,
        "summary": conv.summary,
        "source_domain": conv.source_domain,
        "last_message": last_message.content if last_message else None,
        "last_message_at": last_message.created_at if last_message else None,
        "message_count": message_count,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
    }


def _build_conversation_cursor(conversation: Conversation) -> str:
    updated_at = conversation.updated_at or conversation.created_at
    if updated_at is None:
        raise HTTPException(status_code=500, detail="Conversation cursor is unavailable")
    return f"{updated_at.isoformat()}|{conversation.id}"


def _parse_conversation_cursor(cursor: str) -> tuple[datetime, UUID]:
    try:
        raw_updated_at, raw_id = cursor.split("|", 1)
        updated_at = datetime.fromisoformat(raw_updated_at)
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)
        return updated_at, UUID(raw_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid conversation cursor") from exc
