from collections.abc import Iterable
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse
from uuid import UUID

from fastapi import HTTPException

from src.models.enums import ConversationStatus, MessageRole
from src.models.message import Message
from src.models.staff import Staff
from src.services.conversation_service import (
    clear_conversation_ai_fallback_deadline,
    get_conversation_or_404,
)
from src.services.lead_service import get_lead_or_404


MAX_MESSAGE_CITATIONS = 3


def build_message_citations_from_chunks(
    chunks: Iterable[dict[str, Any]],
) -> list[dict[str, str]]:
    citations: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    for item in chunks:
        raw_source = str(item.get("source") or "").strip()
        source_url = _extract_http_source_url(raw_source)
        if not source_url or source_url in seen_urls:
            continue
        seen_urls.add(source_url)
        citations.append({"url": source_url})
        if len(citations) >= MAX_MESSAGE_CITATIONS:
            break

    return citations


def create_user_message(
    db,
    *,
    conversation_id: UUID,
    content: str,
    lead_id: UUID | None = None,
    auto_commit: bool = True,
) -> Message:
    conversation = get_conversation_or_404(db, conversation_id)
    if lead_id is not None and conversation.lead_id != lead_id:
        raise HTTPException(status_code=403, detail="Conversation does not belong to this lead")
    if conversation.status == ConversationStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Conversation is closed")
    conversation.updated_at = datetime.now(timezone.utc)
    msg = Message(conversation_id=conversation_id, role=MessageRole.USER, content=content)
    db.add(msg)
    if auto_commit:
        db.commit()
        db.refresh(msg)
    else:
        db.flush()
    return msg


def create_assistant_message(
    db,
    *,
    conversation_id: UUID,
    content: str,
    intent: str,
    is_fallback: bool,
    citations: list[dict[str, str]] | None = None,
    auto_commit: bool = True,
) -> Message:
    conversation = get_conversation_or_404(db, conversation_id)
    conversation.updated_at = datetime.now(timezone.utc)
    msg = Message(
        conversation_id=conversation_id,
        role=MessageRole.ASSISTANT,
        content=content,
        intent=intent,
        is_fallback=is_fallback,
        citations_json=_normalize_message_citations(citations),
    )
    db.add(msg)
    if auto_commit:
        db.commit()
        db.refresh(msg)
    else:
        db.flush()
    return msg


def create_staff_message(
    db,
    *,
    conversation_id: UUID,
    staff_id: UUID,
    content: str,
    is_admin: bool = False,
) -> Message:
    conversation = get_conversation_or_404(db, conversation_id)
    if conversation.status == ConversationStatus.CLOSED:
        raise HTTPException(status_code=409, detail="Conversation is closed")

    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    if not staff.is_active:
        raise HTTPException(status_code=403, detail="Staff account is disabled")

    if conversation.staff_id is None:
        conversation.staff_id = staff_id
    elif conversation.staff_id != staff_id and not is_admin:
        raise HTTPException(status_code=403, detail="Conversation is assigned to another staff")

    if conversation.status == ConversationStatus.OPEN:
        conversation.status = ConversationStatus.HANDOFF

    clear_conversation_ai_fallback_deadline(conversation)

    lead = get_lead_or_404(db, conversation.lead_id)
    if lead.assigned_staff_id is None:
        lead.assigned_staff_id = conversation.staff_id

    return create_assistant_message(
        db,
        conversation_id=conversation_id,
        content=content.strip(),
        intent="staff_reply",
        is_fallback=False,
    )


def serialize_message(message: Message) -> dict:
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "role": message.role,
        "content": message.content,
        "intent": message.intent,
        "is_fallback": message.is_fallback,
        "citations": _normalize_message_citations(message.citations_json),
        "created_at": message.created_at,
    }


def get_recent_conversation_messages(
    db,
    *,
    conversation_id: UUID,
    limit: int = 10,
) -> list[Message]:
    rows = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(rows))


def get_conversation_messages_page(
    db,
    *,
    conversation_id: UUID,
    limit: int = 30,
    before: datetime | None = None,
) -> dict:
    get_conversation_or_404(db, conversation_id)

    normalized_limit = max(1, min(limit, 100))
    base_query = db.query(Message).filter(Message.conversation_id == conversation_id)
    total = base_query.count()

    page_query = base_query
    if before is not None:
        page_query = page_query.filter(Message.created_at < before)

    rows_desc = (
        page_query
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(normalized_limit + 1)
        .all()
    )
    has_more = len(rows_desc) > normalized_limit
    rows_desc = rows_desc[:normalized_limit]
    items = list(reversed(rows_desc))
    oldest = items[0].created_at if items else None

    return {
        "conversation_id": conversation_id,
        "items": [serialize_message(item) for item in items],
        "total": total,
        "limit": normalized_limit,
        "before": before,
        "next_before": oldest if has_more else None,
        "has_more": has_more,
    }


def _normalize_message_citations(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []

    citations: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    for item in value:
        if isinstance(item, str):
            source_url = _extract_http_source_url(item)
        elif isinstance(item, dict):
            source_url = _extract_http_source_url(str(item.get("url") or "").strip())
        else:
            source_url = None

        if not source_url or source_url in seen_urls:
            continue

        seen_urls.add(source_url)
        citations.append({"url": source_url})
        if len(citations) >= MAX_MESSAGE_CITATIONS:
            break

    return citations


def _extract_http_source_url(value: str) -> str | None:
    if not value:
        return None

    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    return value
