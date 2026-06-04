import asyncio
import logging
import threading
import time as _time
from enum import Enum
from pathlib import Path

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


def _get_telegram_api_base() -> str:
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")
    return f"https://api.telegram.org/bot{token}"


logger = logging.getLogger(__name__)

_telegram_http_client: httpx.Client | None = None
_client_lock = threading.Lock()


def _get_http_client() -> httpx.Client:
    """Get or create a singleton HTTP client for Telegram API calls."""
    global _telegram_http_client
    if _telegram_http_client is None:
        with _client_lock:
            if _telegram_http_client is None:
                _telegram_http_client = httpx.Client(
                    timeout=30,
                    limits=httpx.Limits(
                        max_keepalive_connections=10,
                        max_connections=20,
                    ),
                )
    return _telegram_http_client


def close_http_client() -> None:
    """Close the singleton HTTP client to prevent resource leaks."""
    global _telegram_http_client
    with _client_lock:
        if _telegram_http_client is not None:
            _telegram_http_client.close()
            _telegram_http_client = None


class TelegramUserState(str, Enum):
    NEW = "new"
    AWAITING_CONTACT = "awaiting_contact"


_telegram_user_states: dict[str, TelegramUserState] = {}
_telegram_state_lock = threading.Lock()
_telegram_state_timestamps: dict[str, float] = {}
_STATE_EXPIRE_SECONDS = 3600
_MAX_ONBOARDING_STATES = 10_000
_CLEANUP_INTERVAL_SECONDS = 60
_last_cleanup_time: float = 0.0


def _cleanup_expired_states(force: bool = False) -> None:
    """Remove stale onboarding states to prevent memory leak."""
    global _last_cleanup_time
    now = _time.time()

    if not force and (now - _last_cleanup_time) < _CLEANUP_INTERVAL_SECONDS:
        return
    _last_cleanup_time = now

    with _telegram_state_lock:
        expired_keys = [
            cid
            for cid, ts in _telegram_state_timestamps.items()
            if now - ts > _STATE_EXPIRE_SECONDS
        ]
        for chat_id in expired_keys:
            _telegram_user_states.pop(chat_id, None)
            _telegram_state_timestamps.pop(chat_id, None)

        overflow = len(_telegram_state_timestamps) - _MAX_ONBOARDING_STATES
        if overflow > 0:
            oldest = sorted(
                _telegram_state_timestamps,
                key=_telegram_state_timestamps.get,
            )[:overflow]
            for chat_id in oldest:
                _telegram_user_states.pop(chat_id, None)
                _telegram_state_timestamps.pop(chat_id, None)


def send_message(
    chat_id: int | str,
    text: str,
    reply_markup: dict | None = None,
) -> dict:
    """Send a message via Telegram Bot API."""
    url = f"{_get_telegram_api_base()}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup
    client = _get_http_client()
    resp = client.post(url, json=payload)
    resp.raise_for_status()
    return resp.json()


def answer_callback_query(callback_query_id: str, text: str = "") -> dict:
    """Answer a callback query from inline button press."""
    url = f"{_get_telegram_api_base()}/answerCallbackQuery"
    payload = {"callback_query_id": callback_query_id, "text": text}
    client = _get_http_client()
    resp = client.post(url, json=payload)
    resp.raise_for_status()
    return resp.json()


def _build_reply_text(
    answer: str,
    suggestions: list[str] | None = None,
) -> str:
    """Format bot reply with optional follow-up suggestions for Telegram HTML."""
    text = answer
    if suggestions:
        suggestion_lines = [
            f"{index}. {item.strip()}"
            for index, item in enumerate(suggestions[:3], 1)
            if item and item.strip()
        ]
        if suggestion_lines:
            text += "\n\n<b>Bạn muốn biết thêm gì về:</b>\n" + "\n".join(suggestion_lines)
    if len(text) > 4096:
        truncated = text[:4090]
        last_open = truncated.rfind("<")
        last_close = truncated.rfind(">")
        if last_open > last_close:
            cutoff = truncated.rfind(" ", 0, 4090)
            text = (truncated[:cutoff] if cutoff > 4000 else truncated) + "..."
        else:
            text = truncated + "..."
    return text


def _build_profile_name(message: dict) -> str:
    user = message.get("from") or {}
    first_name = str(user.get("first_name") or "").strip()
    last_name = str(user.get("last_name") or "").strip()
    full_name = " ".join(part for part in [first_name, last_name] if part).strip()
    if full_name:
        return full_name
    username = str(user.get("username") or "").strip()
    if username:
        return username
    return "Bạn"


def _build_contact_reply_markup() -> dict:
    return {
        "keyboard": [
            [
                {
                    "text": "Chia sẻ số điện thoại",
                    "request_contact": True,
                }
            ]
        ],
        "resize_keyboard": True,
        "one_time_keyboard": True,
    }


def _ask_for_contact(
    chat_id: int | str,
    name: str,
    include_intro: bool = False,
) -> None:
    """Send message asking for email or phone after using Telegram profile name."""
    if include_intro:
        msg = (
            f"Xin chào {name}!\n\n"
            "Mình là trợ lý tư vấn tuyển sinh của VinUniversity. "
            "Bạn có thể hỏi mình về:\n\n"
            "- Chương trình đào tạo\n"
            "- Học phí, học bổng và hỗ trợ tài chính\n"
            "- Quy trình tuyển sinh\n"
            "- Điều kiện đầu vào của từng ngành\n\n"
            "Để hỗ trợ bạn tốt hơn, bạn vui lòng cung cấp thêm ít nhất một trong hai thông tin sau:\n\n"
            "Email: <b>email@example.com</b>\n"
            "Số điện thoại: <b>0912345678</b>\n\n"
            "Bạn chỉ cần cung cấp một trong hai thông tin là được. "
            "Nếu muốn chia sẻ số điện thoại nhanh hơn, bạn có thể bấm nút bên dưới.\n\n"
            "Nếu cần bắt đầu lại, bạn có thể nhấn /start."
        )
        send_message(chat_id, msg, reply_markup=_build_contact_reply_markup())
        return

    msg = (
        f"Xin chào {name}!\n\n"
        "Để hỗ trợ bạn tốt hơn, bạn vui lòng cung cấp thêm ít nhất một trong hai thông tin sau:\n\n"
        "Email: <b>email@example.com</b>\n"
        "Số điện thoại: <b>0912345678</b>\n\n"
        "Bạn chỉ cần cung cấp một trong hai thông tin là được. "
        "Nếu muốn chia sẻ số điện thoại nhanh hơn, bạn có thể bấm nút bên dưới."
    )
    send_message(chat_id, msg, reply_markup=_build_contact_reply_markup())


def _confirm_registration(
    chat_id: int | str,
    name: str,
    contact: str,
    is_email: bool,
) -> None:
    """Confirm user registration and invite them to ask questions."""
    contact_type = "email" if is_email else "so dien thoai"
    msg = (
        "Hoàn tất!\n\n"
        f"Tên: <b>{name}</b>\n"
        f"{contact_type.title()}: <b>{contact}</b>\n\n"
        "Bạn đã sẵn sàng sử dụng hệ thống tư vấn tuyển sinh VinUniversity.\n"
        "Bạn có thể hỏi mình về:\n\n"
        "- Chương trình đào tạo\n"
        "- Học phí và học bổng\n"
        "- Quy trình tuyển sinh\n"
        "- Điều kiện đầu vào"
    )
    send_message(chat_id, msg, reply_markup={"remove_keyboard": True})


def _process_telegram_message(
    chat_id: int | str,
    text: str,
    profile_name: str,
    db: Session,
) -> bool:
    """
    Process a Telegram onboarding message.
    Returns True if a reply was sent, False otherwise.
    """
    chat_id_str = str(chat_id)
    now = _time.time()

    with _telegram_state_lock:
        state = _telegram_user_states.get(chat_id_str, TelegramUserState.NEW)

    if state == TelegramUserState.NEW:
        with _telegram_state_lock:
            _telegram_user_states[chat_id_str] = TelegramUserState.AWAITING_CONTACT
            _telegram_state_timestamps[chat_id_str] = now
        _ask_for_contact(chat_id, profile_name)
        return True

    if state == TelegramUserState.AWAITING_CONTACT:
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
                "Email: <b>email@example.com</b>\n"
                "Số điện thoại: <b>0912345678</b>",
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
        lead.telegram_chat_id = str(chat_id)
        if email and not lead.email:
            lead.email = email
        if phone and not lead.phone:
            lead.phone = phone
        db.commit()

        with _telegram_state_lock:
            _telegram_user_states.pop(chat_id_str, None)
            _telegram_state_timestamps.pop(chat_id_str, None)

        _confirm_registration(chat_id, profile_name, text_stripped, is_email)
        return True

    return False


async def start_polling():
    """
    Start long polling using getUpdates.
    Runs in background and processes updates as they come.
    """
    global _polling_active, _polling_offset
    with _polling_lock:
        _polling_active = True
        if _polling_offset is None:
            _polling_offset = _load_polling_offset()
    logger.info("Telegram polling: starting getUpdates loop (offset=%s)", _polling_offset)

    while True:
        with _polling_lock:
            if not _polling_active:
                break
        try:
            await _poll_once()
        except asyncio.CancelledError:
            logger.info("Telegram polling: cancelled")
            break
        except Exception as e:
            logger.error("Telegram polling error: %s", e)
            await asyncio.sleep(5)

    logger.info("Telegram polling: loop ended")


async def _poll_once():
    """Fetch and process one batch of Telegram updates."""
    global _polling_offset

    url = f"{_get_telegram_api_base()}/getUpdates"
    params = {"timeout": 30}
    with _polling_lock:
        offset_val = _polling_offset
    if offset_val is not None:
        params["offset"] = offset_val

    async with httpx.AsyncClient(timeout=45) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.warning("Telegram getUpdates request failed: %s", e)
            await asyncio.sleep(2)
            return

    if not data.get("ok"):
        logger.warning("Telegram API error: %s", data)
        return

    updates = data.get("result", [])
    _cleanup_expired_states()
    if not updates:
        return

    for update in updates:
        new_offset = update["update_id"] + 1
        with _polling_lock:
            _polling_offset = new_offset
            if _polling_offset is not None:
                _save_polling_offset(_polling_offset)
        await asyncio.get_event_loop().run_in_executor(None, _process_update_sync, update)


async def handle_webhook_update(update: dict) -> None:
    """
    Process a Telegram update delivered via webhook.
    Runs update processing in a thread so the webhook can respond quickly.
    """
    _cleanup_expired_states()
    await asyncio.get_event_loop().run_in_executor(None, _process_update_sync, update)


def _process_update_sync(update: dict) -> None:
    """Process a single Telegram update synchronously. Creates its own DB session."""
    _cleanup_expired_states()
    db_gen = get_db()
    db = next(db_gen)
    try:
        callback_query = update.get("callback_query")
        message = (
            callback_query.get("message")
            if callback_query
            else update.get("message") or update.get("edited_message")
        )
        callback_query_id = callback_query.get("id") if callback_query else None

        if callback_query_id and not message:
            try:
                answer_callback_query(callback_query_id, "")
            except Exception:
                pass
            return

        if not message:
            return

        chat_id = message["chat"]["id"]
        text = message.get("text", "").strip()
        profile_name = _build_profile_name(message)

        if text.startswith("/start"):
            now = _time.time()
            with _telegram_state_lock:
                _telegram_user_states[str(chat_id)] = TelegramUserState.AWAITING_CONTACT
                _telegram_state_timestamps[str(chat_id)] = now
            try:
                _ask_for_contact(chat_id, profile_name, include_intro=True)
            except Exception as e:
                logger.error("Failed to send welcome: %s", e)
            return

        contact = message.get("contact")
        if contact:
            phone = contact.get("phone_number")
            first_name = contact.get("first_name", "")
            last_name = contact.get("last_name", "")
            name = f"{first_name} {last_name}".strip() or profile_name

            try:
                lead, _created = create_or_get_lead_by_contact(
                    db,
                    full_name=name,
                    email=None,
                    phone=phone,
                    auto_commit=True,
                )
                if not lead.telegram_chat_id:
                    lead.telegram_chat_id = str(chat_id)
                    db.commit()

                with _telegram_state_lock:
                    _telegram_user_states.pop(str(chat_id), None)
                    _telegram_state_timestamps.pop(str(chat_id), None)

                send_message(
                    chat_id,
                    f"Cảm ơn {name}! Mình đã nhận được thông tin liên hệ của bạn. "
                    "Bây giờ bạn có thể hỏi mình về VinUniversity nhé!",
                    reply_markup={"remove_keyboard": True},
                )
            except Exception as e:
                logger.error("Failed to process contact: %s", e)
            return

        existing_lead = (
            db.query(Lead).filter(Lead.telegram_chat_id == str(chat_id)).first()
        )

        if existing_lead:
            _handle_existing_lead(existing_lead, chat_id, text, db)
        else:
            replied = _process_telegram_message(chat_id, text, profile_name, db)
            if not replied:
                _ask_for_contact(chat_id, profile_name)
    finally:
        db.rollback()


def _handle_existing_lead(lead: Lead, chat_id: int | str, text: str, db: Session) -> None:
    """Handle message from an existing lead with RAG pipeline."""
    conv = (
        db.query(Conversation)
        .filter(
            Conversation.lead_id == lead.id,
            Conversation.status == ConversationStatus.OPEN,
            Conversation.channel == Channel.TELEGRAM,
        )
        .order_by(Conversation.created_at.desc())
        .first()
    )

    if not conv:
        conv = create_conversation(db, lead_id=lead.id, auto_commit=False)
        conv.channel = Channel.TELEGRAM
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
        logger.error("RAG pipeline error for Telegram: %s", e)
        answer = "Xin lỗi, đã có lỗi xảy ra trong quá trình xử lý. Bạn vui lòng thử lại sau."
        suggestions = []

    try:
        reply_text = _build_reply_text(answer, suggestions)
        send_message(chat_id, reply_text)
    except Exception as e:
        logger.error("Failed to send Telegram reply: %s", e)


_OFFSET_FILE = Path(__file__).resolve().parents[2] / ".telegram_polling_offset"
_polling_offset: int | None = None
_polling_active = False
_polling_lock = threading.Lock()


def _load_polling_offset() -> int | None:
    """Load persisted polling offset from disk (survives restarts)."""
    try:
        if _OFFSET_FILE.exists():
            text = _OFFSET_FILE.read_text().strip()
            return int(text) if text else None
    except (ValueError, OSError) as e:
        logger.warning("Failed to load polling offset: %s", e)
    return None


def _save_polling_offset(offset: int) -> None:
    """Persist polling offset atomically (write-tmp + rename)."""
    try:
        tmp = _OFFSET_FILE.with_suffix(".tmp")
        tmp.write_text(str(offset))
        tmp.rename(_OFFSET_FILE)
    except OSError as e:
        logger.warning("Failed to save polling offset: %s", e)


async def stop_polling():
    """Signal the polling loop to stop."""
    global _polling_active
    with _polling_lock:
        _polling_active = False
    logger.info("Telegram polling: stop signal sent")
