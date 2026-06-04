import asyncio
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from src.api.deps import require_role
from src.db import session
from src.models.enums import StaffRole
from src.services.telegram_service import handle_webhook_update, send_message as tg_send_message

router = APIRouter(prefix="/telegram", tags=["Telegram"])

# Semaphore to limit concurrent webhook processing
_webhook_semaphore = asyncio.Semaphore(5)


class TelegramWebhookRequest(BaseModel):
    update_id: int
    message: dict | None = None
    edited_message: dict | None = None
    callback_query: dict | None = None


@router.post("/webhook")
async def telegram_webhook(request: Request, db=Depends(session.get_db)):
    """
    Webhook endpoint for Telegram Bot API (optional - long polling runs by default).
    Receives updates from Telegram when webhook is configured.
    """
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid JSON"})

    if "update_id" not in body:
        return JSONResponse(status_code=400, content={"error": "Not a Telegram update"})

    # Process asynchronously with rate limiting so Telegram gets a fast 200 OK.
    # IMPORTANT: Do not run getUpdates polling in multiple processes (causes 409 conflicts).
    asyncio.create_task(_run_webhook_safe(body))
    return {"ok": True}


async def _run_webhook_safe(body: dict) -> None:
    """Run webhook with semaphore to limit concurrency."""
    async with _webhook_semaphore:
        await handle_webhook_update(body)


staff_required = require_role([StaffRole.ADMIN, StaffRole.COUNSELOR])

@router.post("/send")
async def send_telegram_message(
    chat_id: int,
    text: str,
    user: dict = Depends(staff_required),
    db=Depends(session.get_db),
):
    """
    Send a message to a specific Telegram chat.
    Used by counselors to reply from the dashboard.
    """
    try:
        result = tg_send_message(chat_id, text)
        return result
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("Failed to send Telegram message: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})
