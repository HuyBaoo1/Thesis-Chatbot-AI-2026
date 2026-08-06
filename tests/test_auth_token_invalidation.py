from datetime import datetime, timedelta, timezone
import os

import httpx
import pytest
from jose import jwt

from tests.config import origin_headers


def _synthetic_old_token() -> str:
    payload = {
        "sub": "synthetic-staff-id",
        "role": "ADMIN",
        "token_type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }
    return jwt.encode(payload, "synthetic-old-secret", algorithm="HS256")


def test_old_jwt_is_rejected(api_url):
    token = _synthetic_old_token()

    response = httpx.get(
        f"{api_url}/api/auth/me",
        headers={**origin_headers(), "Authorization": f"Bearer {token}"},
        timeout=10,
    )

    assert response.status_code == 401


def test_new_login_and_logout_invalidate_session(api_url):
    email = os.getenv("BACKEND_TEST_ADMIN_EMAIL")
    password = os.getenv("BACKEND_TEST_ADMIN_PASSWORD")
    if not email or not password:
        pytest.skip("Admin test credentials are not configured")

    with httpx.Client(base_url=api_url, headers=origin_headers(), timeout=10) as client:
        login_response = client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )
        assert login_response.status_code == 200
        login_payload = login_response.json()
        assert login_payload["user"]["role"] == "ADMIN"

        me_response = client.get("/api/auth/me")
        assert me_response.status_code == 200
        assert me_response.json()["role"] == "ADMIN"

        logout_response = client.post("/api/auth/logout")
        assert logout_response.status_code == 200

        after_logout_response = client.get("/api/auth/me")
        assert after_logout_response.status_code == 401
