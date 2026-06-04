import asyncio
import logging
import secrets

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import JSONResponse

from src.api.deps import require_role
from src.core.config import settings
from src.db import session
from src.models.enums import StaffRole
from src.services.zalo_service import handle_webhook_update, send_message as zalo_send_message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/zalo", tags=["Zalo"])

# Limit concurrent webhook processing.
_webhook_semaphore = asyncio.Semaphore(5)


@router.post("/webhook")
async def zalo_webhook(
    request: Request,
    x_bot_api_secret_token: str | None = Header(default=None),
):
    """Webhook endpoint for the Zalo Bot API.

    Zalo attaches the secret configured via ``setWebhook`` in the
    ``X-Bot-Api-Secret-Token`` header on every request. When
    ``ZALO_WEBHOOK_SECRET`` is set we verify it (timing-safe); otherwise the
    endpoint is open (handy for local testing).
    """
    secret = settings.ZALO_WEBHOOK_SECRET
    if secret:
        if not x_bot_api_secret_token or not secrets.compare_digest(
            x_bot_api_secret_token, secret
        ):
            return JSONResponse(status_code=403, content={"error": "Invalid secret token"})

    try:
        body = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid JSON"})

    # Respond fast; process off-request so Zalo isn't kept waiting.
    asyncio.create_task(_run_webhook_safe(body))
    return {"ok": True}


async def _run_webhook_safe(body: dict) -> None:
    async with _webhook_semaphore:
        try:
            await handle_webhook_update(body)
        except Exception as e:
            logger.error("Zalo webhook processing failed: %s", e)


staff_required = require_role([StaffRole.ADMIN, StaffRole.COUNSELOR])


@router.post("/send")
async def send_zalo_message(
    chat_id: str,
    text: str,
    user: dict = Depends(staff_required),
    db=Depends(session.get_db),
):
    """Send a message to a Zalo chat. Used by counselors to reply from the dashboard."""
    try:
        return zalo_send_message(chat_id, text)
    except Exception as e:
        logger.error("Failed to send Zalo message: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})
