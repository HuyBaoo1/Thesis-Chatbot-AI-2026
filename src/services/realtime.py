import asyncio
import json
import logging
from dataclasses import dataclass
from datetime import date, datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from fastapi import WebSocket

from src.integrations.redis_client import get_redis_client

logger = logging.getLogger(__name__)

REALTIME_CHANNEL = "a20:realtime-events"


@dataclass(frozen=True)
class RealtimeClient:
    user_id: str | None = None
    role: str | None = None
    conversation_id: str | None = None


def _json_safe(value: Any) -> Any:
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(item) for item in value]
    return value


def build_event(event_type: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "id": str(uuid4()),
        "type": event_type,
        "payload": _json_safe(payload or {}),
        "created_at": datetime.utcnow().isoformat(),
    }


def _publish_event(event: dict[str, Any]) -> None:
    try:
        get_redis_client().publish(REALTIME_CHANNEL, json.dumps(event))
    except Exception:
        logger.exception("realtime_event_publish_failed")


def publish_realtime_event(
    event_type: str,
    payload: dict[str, Any] | None = None,
) -> None:
    _publish_event(build_event(event_type, payload))


class RealtimeConnectionManager:
    def __init__(self) -> None:
        self._clients: dict[WebSocket, RealtimeClient] = {}

    async def connect(self, websocket: WebSocket, client: RealtimeClient) -> None:
        await websocket.accept()
        self._clients[websocket] = client

    def disconnect(self, websocket: WebSocket) -> None:
        self._clients.pop(websocket, None)

    async def broadcast_event(self, event: dict[str, Any]) -> None:
        dead_connections: list[WebSocket] = []
        for websocket, client in list(self._clients.items()):
            if not _client_can_receive(client, event):
                continue
            try:
                await websocket.send_json(event)
            except Exception:
                dead_connections.append(websocket)

        for websocket in dead_connections:
            self.disconnect(websocket)


def _client_can_receive(client: RealtimeClient, event: dict[str, Any]) -> bool:
    payload = event.get("payload") or {}
    event_conversation_id = payload.get("conversation_id")
    event_type = str(event.get("type") or "")

    if client.conversation_id is not None:
        if event_conversation_id != client.conversation_id:
            return False
        # Also enforce user-level access control for conversation clients
        if client.user_id is not None:
            staff_id = payload.get("staff_id")
            if staff_id and client.role != "ADMIN" and str(staff_id) != client.user_id:
                return False
        return True

    if client.user_id is None:
        return False

    if event_type.startswith("notification."):
        target = payload.get("target")
        staff_id = payload.get("staff_id")
        if target == "ADMIN":
            return client.role == "ADMIN"
        if staff_id and client.role != "ADMIN" and staff_id != client.user_id:
            return False

    if event_type.startswith("chat."):
        staff_id = payload.get("staff_id")
        if staff_id and client.role != "ADMIN" and staff_id != client.user_id:
            return False

    return True


async def broadcast_realtime_event(
    event_type: str,
    payload: dict[str, Any] | None = None,
) -> None:
    event = build_event(event_type, payload)
    await realtime_manager.broadcast_event(event)
    _publish_event(event)


async def run_redis_realtime_listener() -> None:
    while True:
        pubsub = None
        try:
            pubsub = get_redis_client().pubsub()
            pubsub.subscribe(REALTIME_CHANNEL)
            logger.info("Realtime Redis listener subscribed")

            while True:
                message = await asyncio.to_thread(
                    pubsub.get_message,
                    ignore_subscribe_messages=True,
                    timeout=1.0,
                )
                if not message:
                    await asyncio.sleep(0.05)
                    continue

                raw_data = message.get("data")
                if isinstance(raw_data, bytes):
                    raw_data = raw_data.decode("utf-8")
                event = json.loads(raw_data)
                await realtime_manager.broadcast_event(event)
        except asyncio.CancelledError:
            if pubsub is not None:
                pubsub.close()
            raise
        except Exception:
            logger.exception("realtime_redis_listener_failed")
            if pubsub is not None:
                pubsub.close()
            await asyncio.sleep(5)


realtime_manager = RealtimeConnectionManager()
