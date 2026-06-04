import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func

from src.core.config import settings
from src.integrations.openai_client import get_openai_client
from src.models.conversation import Conversation
from src.models.message import Message
from src.services.message_service import get_recent_conversation_messages

logger = logging.getLogger(__name__)

SUMMARY_MIN_MESSAGES = 6
SUMMARY_REFRESH_EVERY_MESSAGES = 6
SUMMARY_RECENT_MESSAGE_LIMIT = 14
SUMMARY_MAX_CHARS = 1800


def maybe_update_conversation_summary(db, *, conversation_id: UUID) -> str | None:
    payload = _load_summary_payload(db, conversation_id=conversation_id)
    if payload is None:
        return None

    # End the read transaction before the LLM call so chat writes are not held open.
    db.commit()

    summary = _generate_rolling_summary(
        previous_summary=payload["previous_summary"],
        transcript=payload["transcript"],
    )
    if not summary:
        return payload["previous_summary"] or None

    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        return None

    conversation.summary = _trim_summary(summary)
    conversation.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conversation)
    return conversation.summary


def _load_summary_payload(db, *, conversation_id: UUID) -> dict[str, str] | None:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        return None

    message_count = _count_messages(db, conversation_id=conversation_id)
    previous_summary = (conversation.summary or "").strip()
    if not _should_refresh_summary(
        message_count=message_count,
        previous_summary=previous_summary,
    ):
        return None

    messages = get_recent_conversation_messages(
        db,
        conversation_id=conversation_id,
        limit=min(message_count, SUMMARY_RECENT_MESSAGE_LIMIT),
    )
    transcript = _format_transcript(messages)
    if not transcript:
        return None

    return {
        "previous_summary": previous_summary,
        "transcript": transcript,
    }


def _count_messages(db, *, conversation_id: UUID) -> int:
    value = (
        db.query(func.count(Message.id))
        .filter(Message.conversation_id == conversation_id)
        .scalar()
    )
    return int(value or 0)


def _should_refresh_summary(*, message_count: int, previous_summary: str) -> bool:
    if message_count < SUMMARY_MIN_MESSAGES:
        return False
    if not previous_summary:
        return True
    return message_count % SUMMARY_REFRESH_EVERY_MESSAGES == 0


def _generate_rolling_summary(*, previous_summary: str, transcript: str) -> str | None:
    client = get_openai_client()
    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _summary_system_prompt()},
                {
                    "role": "user",
                    "content": (
                        "Previous rolling summary:\n"
                        f"{previous_summary or 'No previous summary.'}\n\n"
                        "Recent transcript:\n"
                        f"{transcript}"
                    ),
                },
            ],
        )
        raw = response.choices[0].message.content or "{}"
        payload = _safe_load_json(raw)
        summary = str(payload.get("summary") or "").strip()
        return summary or None
    except Exception:
        logger.exception("conversation_summary_generation_failed")
        return None


def _summary_system_prompt() -> str:
    return (
        "You maintain rolling memory for a VinUniversity admissions chat assistant. "
        "Merge the previous summary with the recent transcript and return ONLY valid JSON "
        "with one key: summary. "
        "The summary should be concise, stable, and useful for future turns. "
        "Keep 5 to 8 short bullet lines, maximum 1200 characters. "
        "Preserve: user goal, programs or majors of interest, degree level, tuition or "
        "scholarship interest, admissions process questions, profile facts explicitly "
        "shared by the user, unresolved questions, and any handoff or staff follow-up. "
        "Do not store raw email addresses or phone numbers; only note that contact info "
        "was provided. "
        "Do not treat previously answered university facts as authoritative evidence; "
        "write that they were discussed instead. "
        "Remove stale, duplicate, or contradicted details. "
        "Never invent names, scores, schools, deadlines, tuition, scholarships, or policies. "
        "Use the same language as the conversation when possible."
    )


def _format_transcript(messages: list[Message]) -> str:
    lines: list[str] = []
    for item in messages:
        role = item.role.value.upper() if item.role else "USER"
        content = _compact_text(item.content or "", max_chars=700)
        if not content:
            continue
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


def _compact_text(value: str, *, max_chars: int) -> str:
    text = " ".join((value or "").split())
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3].rstrip() + "..."


def _trim_summary(summary: str) -> str:
    text = summary.strip()
    if len(text) <= SUMMARY_MAX_CHARS:
        return text

    clipped = text[:SUMMARY_MAX_CHARS].rstrip()
    newline_cut = clipped.rfind("\n")
    if newline_cut > SUMMARY_MAX_CHARS * 0.6:
        return clipped[:newline_cut].strip()

    word_cut = clipped.rfind(" ")
    if word_cut > SUMMARY_MAX_CHARS * 0.6:
        return clipped[:word_cut].strip()
    return clipped


def _safe_load_json(raw: str) -> dict[str, Any]:
    try:
        loaded = json.loads(raw)
        return loaded if isinstance(loaded, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}
