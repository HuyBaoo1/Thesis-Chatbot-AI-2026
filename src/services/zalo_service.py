"""Zalo Bot integration (official Zalo Bot API).

Mirrors ``telegram_service.py`` but targets the official Zalo Bot API
(https://bot.zapps.me/docs). Key differences from Telegram that are handled here:

* Endpoint shape: ``https://bot-api.zaloplatforms.com/bot<TOKEN>/<method>`` (all POST).
* ``sendMessage`` accepts only ``chat_id`` + ``text`` — plain text, max 2000 chars.
  No HTML ``parse_mode`` and no ``reply_markup`` / keyboards.
* ``getUpdates`` has no ``offset`` parameter (the server advances its own cursor),
  so de-duplication is done by ``message_id`` instead of an offset file. It also
  stops returning updates once a webhook is configured.
* Update payload differs: there is no ``update_id``; the event is
  ``{"message": {...}, "event_name": "message.text.received"}`` where the message
  carries ``from.id`` / ``from.display_name`` / ``chat.id`` / ``text`` / ``message_id``.
"""

import asyncio
import logging
import threading
import time as _time
from enum import Enum

import httpx
from sqlalchemy.orm import Session

from src.core.config import settings
from src.db.session import get_db
from src.models.conversation import Conversation
from src.models.enums import Channel, ConversationStatus
from src.models.lead import Lead
from src.schemas.chat_pipeline import ChatQueryRequest
from src.services.chat_pipeline import run_chat_pipeline
from src.services.conversation_service import create_conversation
from src.services.lead_service import create_or_get_lead_by_contact

logger = logging.getLogger(__name__)

# Zalo sendMessage hard limit (1..2000 characters).
_MAX_MESSAGE_LEN = 2000


def _get_zalo_api_base() -> str:
    token = settings.ZALO_BOT_TOKEN
    if not token:
        raise RuntimeError("ZALO_BOT_TOKEN is not set")
    return f"https://bot-api.zaloplatforms.com/bot{token}"


_zalo_http_client: httpx.Client | None = None
_client_lock = threading.Lock()


def _get_http_client() -> httpx.Client:
    """Get or create a singleton HTTP client for Zalo Bot API calls."""
    global _zalo_http_client
    if _zalo_http_client is None:
        with _client_lock:
            if _zalo_http_client is None:
                _zalo_http_client = httpx.Client(
                    timeout=30,
                    limits=httpx.Limits(
                        max_keepalive_connections=10,
                        max_connections=20,
                    ),
                )
    return _zalo_http_client


def close_http_client() -> None:
    """Close the singleton HTTP client to prevent resource leaks."""
    global _zalo_http_client
    with _client_lock:
        if _zalo_http_client is not None:
            _zalo_http_client.close()
            _zalo_http_client = None


class ZaloUserState(str, Enum):
    NEW = "new"
    AWAITING_CONTACT = "awaiting_contact"


_zalo_user_states: dict[str, ZaloUserState] = {}
_zalo_state_lock = threading.Lock()
_zalo_state_timestamps: dict[str, float] = {}
_STATE_EXPIRE_SECONDS = 3600
_MAX_ONBOARDING_STATES = 10_000

# De-duplication of processed messages (getUpdates has no offset to acknowledge).
_processed_message_ids: dict[str, float] = {}
_processed_lock = threading.Lock()
_PROCESSED_EXPIRE_SECONDS = 3600
_MAX_PROCESSED_IDS = 50_000

_CLEANUP_INTERVAL_SECONDS = 60
_last_cleanup_time: float = 0.0


def _cleanup_expired_states(force: bool = False) -> None:
    """Remove stale onboarding states and processed-id markers to bound memory."""
    global _last_cleanup_time
    now = _time.time()

    if not force and (now - _last_cleanup_time) < _CLEANUP_INTERVAL_SECONDS:
        return
    _last_cleanup_time = now

    with _zalo_state_lock:
        expired = [
            uid
            for uid, ts in _zalo_state_timestamps.items()
            if now - ts > _STATE_EXPIRE_SECONDS
        ]
        for uid in expired:
            _zalo_user_states.pop(uid, None)
            _zalo_state_timestamps.pop(uid, None)

        overflow = len(_zalo_state_timestamps) - _MAX_ONBOARDING_STATES
        if overflow > 0:
            oldest = sorted(
                _zalo_state_timestamps, key=_zalo_state_timestamps.get
            )[:overflow]
            for uid in oldest:
                _zalo_user_states.pop(uid, None)
                _zalo_state_timestamps.pop(uid, None)

    with _processed_lock:
        expired_ids = [
            mid
            for mid, ts in _processed_message_ids.items()
            if now - ts > _PROCESSED_EXPIRE_SECONDS
        ]
        for mid in expired_ids:
            _processed_message_ids.pop(mid, None)

        overflow = len(_processed_message_ids) - _MAX_PROCESSED_IDS
        if overflow > 0:
            oldest = sorted(
                _processed_message_ids, key=_processed_message_ids.get
            )[:overflow]
            for mid in oldest:
                _processed_message_ids.pop(mid, None)


def _already_processed(message_id: str | None) -> bool:
    """Return True if this message_id was already handled; otherwise record it."""
    if not message_id:
        return False
    now = _time.time()
    with _processed_lock:
        if message_id in _processed_message_ids:
            return True
        _processed_message_ids[message_id] = now
    return False


def _split_text(text: str, limit: int = _MAX_MESSAGE_LEN) -> list[str]:
    """Split text into chunks no longer than ``limit`` (Zalo caps at 2000 chars)."""
    text = text or ""
    if len(text) <= limit:
        return [text] if text else [""]
    chunks: list[str] = []
    remaining = text
    while len(remaining) > limit:
        cut = remaining.rfind("\n", 0, limit)
        if cut < limit // 2:
            cut = remaining.rfind(" ", 0, limit)
        if cut < limit // 2:
            cut = limit
        chunks.append(remaining[:cut].rstrip())
        remaining = remaining[cut:].lstrip()
    if remaining:
        chunks.append(remaining)
    return chunks


def send_message(chat_id: int | str, text: str) -> dict:
    """Send a plain-text message via the Zalo Bot API.

    Zalo only supports plain text up to 2000 characters and offers no inline
    keyboards, so long replies are split across multiple messages.
    """
    url = f"{_get_zalo_api_base()}/sendMessage"
    client = _get_http_client()
    last: dict = {}
    for chunk in _split_text(text):
        if not chunk:
            continue
        resp = client.post(url, json={"chat_id": str(chat_id), "text": chunk})
        resp.raise_for_status()
        last = resp.json()
    return last


def get_me() -> dict:
    """Call getMe — handy for verifying the token / connectivity."""
    url = f"{_get_zalo_api_base()}/getMe"
    client = _get_http_client()
    resp = client.post(url)
    resp.raise_for_status()
    return resp.json()


def _build_reply_text(answer: str, suggestions: list[str] | None = None) -> str:
    """Format the bot reply (plain text) with optional follow-up suggestions."""
    text = answer or ""
    if suggestions:
        suggestion_lines = [
            f"{index}. {item.strip()}"
            for index, item in enumerate(suggestions[:3], 1)
            if item and item.strip()
        ]
        if suggestion_lines:
            text += "\n\nBạn muốn biết thêm gì về:\n" + "\n".join(suggestion_lines)
    if len(text) > _MAX_MESSAGE_LEN:
        cutoff = text.rfind(" ", 0, _MAX_MESSAGE_LEN - 3)
        text = (text[:cutoff] if cutoff > _MAX_MESSAGE_LEN // 2 else text[: _MAX_MESSAGE_LEN - 3]) + "..."
    return text


def _build_profile_name(message: dict) -> str:
    user = message.get("from") or {}
    display_name = str(user.get("display_name") or "").strip()
    return display_name or "Bạn"


def _ask_for_contact(chat_id: int | str, name: str, include_intro: bool = False) -> None:
    """Ask the user for an email or phone number (plain text — Zalo has no buttons)."""
    if include_intro:
        msg = (
            f"Xin chào {name}!\n\n"
            "Mình là trợ lý tư vấn tuyển sinh của VinUniversity. "
            "Bạn có thể hỏi mình về:\n\n"
            "- Chương trình đào tạo\n"
            "- Học phí, học bổng và hỗ trợ tài chính\n"
            "- Quy trình tuyển sinh\n"
            "- Điều kiện đầu vào của từng ngành\n\n"
            "Để hỗ trợ bạn tốt hơn, bạn vui lòng cung cấp thêm ít nhất một trong "
            "hai thông tin sau:\n\n"
            "Email: email@example.com\n"
            "Số điện thoại: 0912345678\n\n"
            "Bạn chỉ cần cung cấp một trong hai thông tin là được."
        )
    else:
        msg = (
            f"Xin chào {name}!\n\n"
            "Để hỗ trợ bạn tốt hơn, bạn vui lòng cung cấp thêm ít nhất một trong "
            "hai thông tin sau:\n\n"
            "Email: email@example.com\n"
            "Số điện thoại: 0912345678\n\n"
            "Bạn chỉ cần cung cấp một trong hai thông tin là được."
        )
    send_message(chat_id, msg)


def _confirm_registration(chat_id: int | str, name: str, contact: str, is_email: bool) -> None:
    """Confirm registration and invite the user to start asking questions."""
    contact_type = "Email" if is_email else "Số điện thoại"
    msg = (
        "Hoàn tất!\n\n"
        f"Tên: {name}\n"
        f"{contact_type}: {contact}\n\n"
        "Bạn đã sẵn sàng sử dụng hệ thống tư vấn tuyển sinh VinUniversity.\n"
        "Bạn có thể hỏi mình về:\n\n"
        "- Chương trình đào tạo\n"
        "- Học phí và học bổng\n"
        "- Quy trình tuyển sinh\n"
        "- Điều kiện đầu vào"
    )
    send_message(chat_id, msg)


def _process_zalo_onboarding(
    chat_id: int | str,
    user_id: str,
    text: str,
    profile_name: str,
    db: Session,
) -> bool:
    """Drive the email/phone onboarding state machine. Returns True if handled."""
    now = _time.time()
    with _zalo_state_lock:
        state = _zalo_user_states.get(user_id, ZaloUserState.NEW)

    if state == ZaloUserState.NEW:
        with _zalo_state_lock:
            _zalo_user_states[user_id] = ZaloUserState.AWAITING_CONTACT
            _zalo_state_timestamps[user_id] = now
        # Zalo has no "/start" button, so greet on the first message.
        _ask_for_contact(chat_id, profile_name, include_intro=True)
        return True

    if state == ZaloUserState.AWAITING_CONTACT:
        text_stripped = text.strip()
        is_email = "@" in text_stripped and "." in text_stripped
        is_phone = (
            text_stripped.replace(" ", "").replace("+", "").isdigit()
            and len(text_stripped) >= 10
        )

        if not (is_email or is_phone):
            send_message(
                chat_id,
                "Định dạng chưa hợp lệ. Bạn vui lòng nhập theo một trong hai mẫu sau:\n\n"
                "Email: email@example.com\n"
                "Số điện thoại: 0912345678",
            )
            return True

        email = text_stripped if is_email else None
        phone = text_stripped if is_phone else None

        lead, _created = create_or_get_lead_by_contact(
            db,
            full_name=profile_name,
            email=email,
            phone=phone,
            auto_commit=True,
        )
        lead.zalo_user_id = user_id
        if email and not lead.email:
            lead.email = email
        if phone and not lead.phone:
            lead.phone = phone
        db.commit()

        with _zalo_state_lock:
            _zalo_user_states.pop(user_id, None)
            _zalo_state_timestamps.pop(user_id, None)

        _confirm_registration(chat_id, profile_name, text_stripped, is_email)
        return True

    return False


def _handle_existing_lead(lead: Lead, chat_id: int | str, text: str, db: Session) -> None:
    """Answer an existing lead's question through the RAG pipeline."""
    conv = (
        db.query(Conversation)
        .filter(
            Conversation.lead_id == lead.id,
            Conversation.status == ConversationStatus.OPEN,
            Conversation.channel == Channel.ZALO,
        )
        .order_by(Conversation.created_at.desc())
        .first()
    )

    if not conv:
        conv = create_conversation(db, lead_id=lead.id, auto_commit=False)
        conv.channel = Channel.ZALO
        conv.external_id = str(chat_id)

    try:
        result = run_chat_pipeline(
            ChatQueryRequest(lead_id=lead.id, query=text, conversation_id=conv.id),
            db,
        )
        answer = result.get(
            "answer",
            "Xin lỗi, hiện tại mình chưa có câu trả lời phù hợp cho bạn.",
        )
        suggestions = result.get("follow_up_suggestions", [])
    except Exception as e:
        logger.error("RAG pipeline error for Zalo: %s", e)
        answer = "Xin lỗi, đã có lỗi xảy ra trong quá trình xử lý. Bạn vui lòng thử lại sau."
        suggestions = []

    try:
        send_message(chat_id, _build_reply_text(answer, suggestions))
    except Exception as e:
        logger.error("Failed to send Zalo reply: %s", e)


def _iter_events(payload: dict) -> list[dict]:
    """Normalize a getUpdates response OR a webhook body into a list of events.

    Both shapes carry ``{"message": {...}, "event_name": "..."}``; getUpdates
    wraps it in ``result`` (often a list), the webhook may post it directly.
    """
    if not isinstance(payload, dict):
        return []
    result = payload.get("result", payload)
    if isinstance(result, list):
        return [e for e in result if isinstance(e, dict)]
    if isinstance(result, dict):
        return [result]
    return []


def _process_update_sync(event: dict) -> None:
    """Process a single Zalo update synchronously. Creates its own DB session."""
    _cleanup_expired_states()

    message = event.get("message") or {}
    if not message and ("text" in event or "chat" in event):
        message = event  # event itself is the message
    event_name = event.get("event_name") or ""

    chat = message.get("chat") or {}
    sender = message.get("from") or {}
    chat_id = chat.get("id") or sender.get("id")
    user_id = str(sender.get("id") or chat.get("id") or "")
    if not chat_id or not user_id:
        return

    message_id = message.get("message_id")
    if _already_processed(message_id):
        return

    text = (message.get("text") or "").strip()
    profile_name = _build_profile_name(message)

    # Zalo only lets us reply with text — politely decline non-text events.
    is_text_event = event_name == "message.text.received" or bool(text)
    if not is_text_event:
        try:
            send_message(
                chat_id,
                "Hiện mình chỉ hỗ trợ tin nhắn văn bản. "
                "Bạn vui lòng nhập câu hỏi bằng chữ giúp mình nhé!",
            )
        except Exception as e:
            logger.error("Failed to send Zalo non-text reply: %s", e)
        return

    db_gen = get_db()
    db = next(db_gen)
    try:
        existing_lead = (
            db.query(Lead).filter(Lead.zalo_user_id == user_id).first()
        )
        if existing_lead:
            _handle_existing_lead(existing_lead, chat_id, text, db)
        else:
            _process_zalo_onboarding(chat_id, user_id, text, profile_name, db)
    finally:
        db.rollback()


async def handle_webhook_update(payload: dict) -> None:
    """Process a Zalo update delivered via webhook (off the event loop)."""
    _cleanup_expired_states()
    loop = asyncio.get_event_loop()
    for event in _iter_events(payload):
        await loop.run_in_executor(None, _process_update_sync, event)


# --- Long-polling (getUpdates) -------------------------------------------------
# Zalo getUpdates has no offset; the server advances its own cursor and stops
# returning updates entirely once a webhook is set. De-dup is by message_id.

_polling_active = False
_polling_lock = threading.Lock()


async def start_polling() -> None:
    """Start the getUpdates long-polling loop (for local/dev use)."""
    global _polling_active
    with _polling_lock:
        _polling_active = True
    logger.info("Zalo polling: starting getUpdates loop")

    while True:
        with _polling_lock:
            if not _polling_active:
                break
        try:
            await _poll_once()
        except asyncio.CancelledError:
            logger.info("Zalo polling: cancelled")
            break
        except Exception as e:
            logger.error("Zalo polling error: %s", e)
            await asyncio.sleep(5)

    logger.info("Zalo polling: loop ended")


async def _poll_once() -> None:
    """Fetch and process one batch of Zalo updates via getUpdates."""
    url = f"{_get_zalo_api_base()}/getUpdates"
    async with httpx.AsyncClient(timeout=45) as client:
        try:
            resp = await client.post(url, json={"timeout": 30})
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.warning("Zalo getUpdates request failed: %s", e)
            await asyncio.sleep(2)
            return

    if not data.get("ok"):
        # getUpdates returns an error while a webhook is configured — back off.
        logger.warning("Zalo API error on getUpdates: %s", data)
        await asyncio.sleep(5)
        return

    events = _iter_events(data)
    _cleanup_expired_states()
    if not events:
        return

    loop = asyncio.get_event_loop()
    for event in events:
        await loop.run_in_executor(None, _process_update_sync, event)
    # Small breather so we don't hammer the API if the cursor doesn't advance.
    await asyncio.sleep(0.5)


async def stop_polling() -> None:
    """Signal the polling loop to stop."""
    global _polling_active
    with _polling_lock:
        _polling_active = False
    logger.info("Zalo polling: stop signal sent")
