from types import SimpleNamespace

from src.api.routers import realtime
from src.api.routers.realtime import _authenticate_staff_websocket


class _FakeWebSocket:
    def __init__(self, *, cookies=None, query_params=None, headers=None):
        self.cookies = cookies or {}
        self.query_params = query_params or {}
        self.headers = headers or {}


class _FakeSession:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def get(self, model, key):
        return SimpleNamespace(
            id=key,
            is_active=True,
            role=SimpleNamespace(value="ADMIN"),
            password="hashed-password",
        )


def test_unauthenticated_staff_websocket_is_rejected():
    websocket = _FakeWebSocket()

    assert _authenticate_staff_websocket(websocket) is None


def test_staff_websocket_authenticates_with_access_cookie(monkeypatch):
    monkeypatch.setattr(
        realtime,
        "decode_token",
        lambda token: {
            "sub": "staff-id",
            "role": "ADMIN",
            "token_type": "access",
            "pwd": "fingerprint",
        },
    )
    monkeypatch.setattr(realtime, "SessionLocal", lambda: _FakeSession())
    monkeypatch.setattr(
        realtime,
        "get_password_fingerprint",
        lambda hashed_password: "fingerprint",
    )

    client = _authenticate_staff_websocket(
        _FakeWebSocket(cookies={"access_token": "synthetic-access-token"})
    )

    assert client is not None
    assert client.user_id == "staff-id"
    assert client.role == "ADMIN"


def test_staff_websocket_rejects_invalid_access_cookie(monkeypatch):
    monkeypatch.setattr(realtime, "decode_token", lambda token: None)

    client = _authenticate_staff_websocket(
        _FakeWebSocket(cookies={"access_token": "synthetic-invalid-token"})
    )

    assert client is None
