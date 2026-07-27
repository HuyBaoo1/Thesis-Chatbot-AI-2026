import logging

from src.core.logging_redaction import (
    SensitiveDataRedactionFilter,
    redact_sensitive_text,
)


def test_redacts_jwt_from_websocket_url():
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fakepayload.fakesignature"
    value = f'WebSocket /api/realtime/ws?token={token}&x=1'

    redacted = redact_sensitive_text(value)

    assert token not in redacted
    assert "token=[REDACTED]" in redacted
    assert "x=1" in redacted


def test_redacts_authorization_header():
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fakepayload.fakesignature"

    redacted = redact_sensitive_text(f"Authorization: Bearer {token}")

    assert token not in redacted
    assert redacted == "Authorization: Bearer [REDACTED]"


def test_logging_filter_redacts_record_args():
    token = "fake-local-access-token-value"
    record = logging.LogRecord(
        name="uvicorn.access",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="%s",
        args=(f"GET /?access_token={token}",),
        exc_info=None,
    )

    SensitiveDataRedactionFilter().filter(record)

    assert token not in record.args[0]
    assert "access_token=[REDACTED]" in record.args[0]
