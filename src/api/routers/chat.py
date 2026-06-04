import asyncio
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request

from src.api.deps import get_optional_current_user, require_role
from src.core.config import settings
from src.db import session
from src.db.session import SessionLocal
from src.models.enums import Channel, ConversationStatus, StaffRole
from src.models.message import Message
from src.schemas.chat_pipeline import (
    ChatConversationsPageOut,
    ChatConversationOut,
    ChatConversationStatusUpdate,
    ChatMessageOut,
    ChatMessagesPageOut,
    ChatQueryRequest,
    ChatQueryResponse,
    LeadConversationsPageOut,
    LeadInitRequest,
    LeadInitResponse,
    MessageSourcesOut,
    StaffChatMessageCreate,
)
from src.services.chat_pipeline import run_chat_pipeline
from src.services import notification_service
from src.services.conversation_service import (
    can_access_conversation,
    get_conversation_or_404,
    get_conversation_detail,
    is_valid_conversation_access_token,
    issue_conversation_access_token,
    list_conversations,
    list_lead_conversations,
    request_staff_contact,
    serialize_conversation,
    update_conversation_status,
)
from src.services.lead_service import create_or_get_lead_by_contact
from src.services.daily_analytic_service import increment_new_leads
from src.services.message_chunk_usage_service import list_message_sources
from src.services.message_service import (
    create_staff_message,
    get_conversation_messages_page,
    serialize_message,
)
from src.services.rate_limit_service import check_multiple_rate_limits, check_rate_limit
from src.services.realtime import broadcast_realtime_event


router = APIRouter(prefix="/chat", tags=["Chat"])
staff_required = require_role([StaffRole.ADMIN, StaffRole.COUNSELOR])


@router.post("/init-lead", response_model=LeadInitResponse)
def init_lead(
    request: Request,
    data: LeadInitRequest,
    db: session = Depends(session.get_db),
):
    check_rate_limit(
        request=request,
        scope="chat:init_lead",
        identifier=None,
        limit=settings.CHAT_INIT_RATE_LIMIT_PER_MINUTE,
        window_seconds=60,
    )
    lead, created = create_or_get_lead_by_contact(
        db,
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
    )
    if created:
        increment_new_leads(db, amount=1)
    return {
        "lead_id": lead.id,
        "full_name": lead.full_name,
        "email": lead.email,
        "phone": lead.phone,
    }


def _run_pipeline_in_thread(data: ChatQueryRequest) -> dict:
    """Run chat pipeline with a dedicated session, safe for thread-pool use.

    SessionLocal is a sessionmaker factory — each call produces a new,
    independent SQLAlchemy session. The worker thread gets its own session
    while the main thread keeps the FastAPI-injected one for post-pipeline
    reads only. No shared session state crosses thread boundaries.
    """
    db = SessionLocal()
    try:
        result = run_chat_pipeline(data, db)
        return result
    finally:
        db.close()


@router.post("/query", response_model=ChatQueryResponse)
async def chat_query(
    request: Request,
    data: ChatQueryRequest,
    background_tasks: BackgroundTasks,
    db: session = Depends(session.get_db),
):
    check_multiple_rate_limits(
        request=request,
        scope="chat:query",
        identifier=f"lead:{data.lead_id}" if data.lead_id else None,
        rules=[
            (settings.CHAT_QUERY_RATE_LIMIT_PER_MINUTE, 60),
            (settings.CHAT_QUERY_RATE_LIMIT_PER_HOUR, 3600),
        ],
    )
    check_rate_limit(
        request=request,
        scope="chat:query:ip",
        identifier=None,
        limit=settings.CHAT_QUERY_IP_RATE_LIMIT_PER_MINUTE,
        window_seconds=60,
    )
    result = await asyncio.to_thread(_run_pipeline_in_thread, data)
    conversation = get_conversation_or_404(db, result["conversation_id"])
    result["conversation_token"] = _resolve_conversation_token(
        conversation,
        data.conversation_token,
    )
    background_tasks.add_task(
        broadcast_realtime_event,
        "chat.message.created",
        _build_chat_realtime_payload(
            db,
            conversation_id=result["conversation_id"],
            messages=_get_messages_by_ids(
                db,
                [
                    result["user_message_id"],
                    result["assistant_message_id"],
                ],
            ),
        ),
    )
    return result


@router.get(
    "/conversations",
    response_model=ChatConversationsPageOut,
)
def get_conversations(
    limit: int = Query(default=20, ge=1, le=100),
    before: str | None = Query(
        default=None,
        description="Load conversations older than this cursor. Use next_before from the previous response.",
    ),
    status: ConversationStatus | None = Query(default=None),
    channel: Channel | None = Query(default=None),
    staff_id: UUID | None = Query(default=None),
    assigned: bool | None = Query(default=None),
    q: str | None = Query(default=None, min_length=1),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return list_conversations(
        db,
        limit=limit,
        before=before,
        status=status,
        channel=channel,
        staff_id=staff_id,
        assigned=assigned,
        q=q,
        requester_role=user.get("role"),
        requester_staff_id=UUID(user["sub"]),
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ChatConversationOut,
)
def get_conversation(
    conversation_id: UUID,
    lead_id: UUID | None = Query(default=None),
    conversation_token: str | None = Query(default=None),
    user: dict | None = Depends(get_optional_current_user),
    db: session = Depends(session.get_db),
):
    conversation = _authorize_conversation_request(
        db,
        conversation_id=conversation_id,
        lead_id=lead_id,
        conversation_token=conversation_token,
        user=user,
    )
    return serialize_conversation(
        db,
        conversation,
        conversation_token=_resolve_conversation_token(
            conversation,
            conversation_token,
        ),
        hide_pii=user is None,
    )


@router.patch(
    "/conversations/{conversation_id}/status",
    response_model=ChatConversationOut,
)
def update_chat_conversation_status(
    conversation_id: UUID,
    data: ChatConversationStatusUpdate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    conversation = update_conversation_status(
        db,
        conversation_id=conversation_id,
        status=data.status,
    )
    background_tasks.add_task(
        broadcast_realtime_event,
        "chat.conversation.updated",
        _build_conversation_realtime_payload(conversation),
    )
    return conversation


@router.post(
    "/conversations/{conversation_id}/contact-staff-request",
    response_model=ChatConversationOut,
)
def request_conversation_staff_contact(
    request: Request,
    conversation_id: UUID,
    background_tasks: BackgroundTasks,
    lead_id: UUID | None = Query(default=None),
    conversation_token: str | None = Query(default=None),
    user: dict | None = Depends(get_optional_current_user),
    db: session = Depends(session.get_db),
):
    _authorize_conversation_request(
        db,
        conversation_id=conversation_id,
        lead_id=lead_id,
        conversation_token=conversation_token,
        user=user,
    )
    check_rate_limit(
        request=request,
        scope="chat:contact_staff_request",
        identifier=f"conversation:{conversation_id}",
        limit=3,
        window_seconds=3600,
    )
    conversation = request_staff_contact(db, conversation_id=conversation_id)
    latest_staff_notification = notification_service.list_notifications(
        db,
        limit=1,
        offset=0,
        lead_id=conversation["lead_id"],
        conversation_id=conversation["id"],
        staff_id=conversation["staff_id"],
    )["items"]

    notification_payload = {
        "conversation_id": conversation["id"],
        "lead_id": conversation["lead_id"],
        "staff_id": conversation["staff_id"],
        "target": "STAFF",
    }
    if latest_staff_notification:
        notification_payload["notification"] = notification_service.serialize_notification(
            latest_staff_notification[0]
        )
        notification_payload["target"] = latest_staff_notification[0].target

    background_tasks.add_task(
        broadcast_realtime_event,
        "chat.conversation.updated",
        _build_conversation_realtime_payload(conversation),
    )
    background_tasks.add_task(
        broadcast_realtime_event,
        "notification.changed",
        notification_payload,
    )
    return conversation


@router.post(
    "/conversations/{conversation_id}/staff-messages",
    response_model=ChatMessageOut,
)
def create_conversation_staff_message(
    conversation_id: UUID,
    data: StaffChatMessageCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    user_role = user.get("role")
    message = create_staff_message(
        db,
        conversation_id=conversation_id,
        staff_id=UUID(user["sub"]),
        content=data.content,
        is_admin=user_role in (StaffRole.ADMIN, StaffRole.ADMIN.value),
    )
    background_tasks.add_task(
        broadcast_realtime_event,
        "chat.message.created",
        _build_chat_realtime_payload(
            db,
            conversation_id=message.conversation_id,
            messages=[message],
        ),
    )
    return serialize_message(message)


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=ChatMessagesPageOut,
)
def get_conversation_messages(
    conversation_id: UUID,
    limit: int = Query(default=30, ge=1, le=100),
    before: datetime | None = Query(
        default=None,
        description="Load messages older than this timestamp. Use next_before from the previous response.",
    ),
    lead_id: UUID | None = Query(default=None),
    conversation_token: str | None = Query(default=None),
    user: dict | None = Depends(get_optional_current_user),
    db: session = Depends(session.get_db),
):
    _authorize_conversation_request(
        db,
        conversation_id=conversation_id,
        lead_id=lead_id,
        conversation_token=conversation_token,
        user=user,
    )
    return get_conversation_messages_page(
        db,
        conversation_id=conversation_id,
        limit=limit,
        before=before,
    )


@router.get(
    "/messages/{message_id}/sources",
    response_model=MessageSourcesOut,
)
def get_message_sources(
    message_id: UUID,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return list_message_sources(db, message_id=message_id)


@router.get(
    "/leads/{lead_id}/conversations",
    response_model=LeadConversationsPageOut,
)
def get_lead_conversations(
    lead_id: UUID,
    limit: int = Query(default=20, ge=1, le=100),
    before: str | None = Query(default=None),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return list_lead_conversations(
        db,
        lead_id=lead_id,
        limit=limit,
        before=before,
    )


def _get_messages_by_ids(db, message_ids: list[UUID | None]) -> list[Message]:
    messages: list[Message] = []
    for message_id in message_ids:
        if message_id is None:
            continue
        message = db.get(Message, message_id)
        if message is not None:
            messages.append(message)
    return messages


def _build_conversation_realtime_payload(conversation: dict) -> dict:
    return {
        "conversation_id": conversation["id"],
        "lead_id": conversation["lead_id"],
        "staff_id": conversation["staff_id"],
        "conversation": conversation,
    }


def _build_chat_realtime_payload(
    db,
    *,
    conversation_id: UUID,
    messages: list[Message],
) -> dict:
    conversation = get_conversation_detail(db, conversation_id)
    payload = _build_conversation_realtime_payload(conversation)
    payload["messages"] = [serialize_message(message) for message in messages]
    return payload


def _authorize_conversation_request(
    db,
    *,
    conversation_id: UUID,
    lead_id: UUID | None,
    conversation_token: str | None,
    user: dict | None,
):
    conversation = get_conversation_or_404(db, conversation_id)

    if user is not None and can_access_conversation(
        db,
        conversation_id=conversation_id,
        requester_role=user.get("role"),
        requester_staff_id=user.get("sub"),
    ):
        return conversation

    if lead_id is not None and conversation.lead_id == lead_id:
        return conversation

    if is_valid_conversation_access_token(conversation, conversation_token):
        return conversation

    raise HTTPException(status_code=403, detail="Conversation access denied")


def _resolve_conversation_token(
    conversation,
    conversation_token: str | None,
) -> str:
    if is_valid_conversation_access_token(conversation, conversation_token):
        return conversation_token

    return issue_conversation_access_token(conversation)
