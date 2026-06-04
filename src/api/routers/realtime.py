import logging
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from src.core.config import settings
from src.core.security import decode_token, get_password_fingerprint
from src.db.session import SessionLocal
from src.models.conversation import Conversation
from src.models.staff import Staff
from src.services.conversation_service import (
    can_access_conversation,
    is_valid_conversation_access_token,
)
from src.services.realtime import RealtimeClient, realtime_manager

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/realtime", tags=["Realtime"])


@router.websocket("/ws")
async def staff_realtime_ws(websocket: WebSocket):
    if not _validate_origin(websocket):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    client = _authenticate_staff_websocket(websocket)
    if client is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await realtime_manager.connect(websocket, client)
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        realtime_manager.disconnect(websocket)


@router.websocket("/conversations/{conversation_id}/ws")
async def conversation_realtime_ws(websocket: WebSocket, conversation_id: UUID):
    if not _validate_origin(websocket):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    client = _authenticate_conversation_websocket(websocket, conversation_id)
    if client is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await realtime_manager.connect(
        websocket,
        client,
    )
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        realtime_manager.disconnect(websocket)


def _validate_origin(websocket: WebSocket) -> bool:
    origin = websocket.headers.get("origin", "")
    if not origin:
        return True
    allowed = settings.cors_allow_origins
    if "*" in allowed:
        logger.warning("realtime_ws_origin_check_bypassed wildcard_cors")
        return True
    if origin in allowed:
        return True
    logger.warning("realtime_ws_origin_rejected origin=%s", origin)
    return False


def _authenticate_conversation_websocket(
    websocket: WebSocket,
    conversation_id: UUID,
) -> RealtimeClient | None:
    staff_client = _authenticate_staff_websocket(websocket)
    if staff_client is not None:
        with SessionLocal() as db:
            if can_access_conversation(
                db,
                conversation_id=conversation_id,
                requester_role=staff_client.role,
                requester_staff_id=staff_client.user_id,
            ):
                return RealtimeClient(
                    user_id=staff_client.user_id,
                    role=staff_client.role,
                    conversation_id=str(conversation_id),
                )

    conversation_token = websocket.query_params.get("conversation_token")
    if not conversation_token:
        return None

    with SessionLocal() as db:
        conversation = db.get(Conversation, conversation_id)
        if conversation is None:
            return None
        if not is_valid_conversation_access_token(
            conversation,
            conversation_token,
        ):
            return None

    return RealtimeClient(role="LEAD", conversation_id=str(conversation_id))


def _authenticate_staff_websocket(websocket: WebSocket) -> RealtimeClient | None:
    token = websocket.cookies.get("access_token") or websocket.query_params.get("token")
    if not token:
        return None

    payload = decode_token(token)
    if not payload or payload.get("token_type") != "access":
        return None

    # SQLAlchemy 2.0 sessionmaker supports context manager (calls close on exit)
    with SessionLocal() as db:
        user = db.get(Staff, payload.get("sub"))
        if not user or not user.is_active:
            return None
        if payload.get("pwd") != get_password_fingerprint(user.password):
            return None
        return RealtimeClient(user_id=str(user.id), role=str(user.role.value))
