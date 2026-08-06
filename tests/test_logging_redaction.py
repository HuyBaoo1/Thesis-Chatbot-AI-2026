import logging
from io import StringIO

from src.core.logging_redaction import (
    SensitiveDataRedactionFilter,
    configure_sensitive_log_redaction,
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


def test_redacts_lowercase_authorization_header():
    token = "eyJhbGciOiJIUzI1NiJ9.fakepayload.fakesignature"

    redacted = redact_sensitive_text(f"authorization: bearer {token}")

    assert token not in redacted
    assert redacted == "authorization: bearer [REDACTED]"


def test_redacts_query_refresh_token_and_url_encoded_token():
    token = "eyJhbGciOiJIUzI1NiJ9%2Efakepayload%2Efakesignature"

    redacted = redact_sensitive_text(f"GET /callback?refresh_token={token}&ok=1")

    assert token not in redacted
    assert "refresh_token=[REDACTED]" in redacted
    assert "ok=1" in redacted


def test_redacts_cookies_and_set_cookie_headers():
    access_token = "synthetic-access-token-value"
    refresh_token = "synthetic-refresh-token-value"
    value = (
        f"Cookie: access_token={access_token}; refresh_token={refresh_token}\n"
        f"Set-Cookie: access_token={access_token}; Path=/"
    )

    redacted = redact_sensitive_text(value)

    assert access_token not in redacted
    assert refresh_token not in redacted
    assert "access_token=[REDACTED]" in redacted
    assert "refresh_token=[REDACTED]" in redacted


def test_redacts_provider_keys_and_password_assignments():
    openai_key = "sk-" + "syntheticOpenAIKeyForRedactionOnly"
    firecrawl_key = "fc-" + "syntheticFirecrawlKeyForRedactionOnly"
    telegram_token = "123456789" + ":syntheticTelegramTokenForRedaction"
    password = "synthetic-password-value"
    value = (
        f"OPENAI_API_KEY={openai_key}\n"
        f"FIRECRAWL_API_KEY={firecrawl_key}\n"
        f"TELEGRAM_BOT_TOKEN={telegram_token}\n"
        f"password={password}"
    )

    redacted = redact_sensitive_text(value)

    for secret in (openai_key, firecrawl_key, telegram_token, password):
        assert secret not in redacted
    assert redacted.count("[REDACTED]") == 4


def test_logging_filter_redacts_nested_payload_by_key():
    secret = "synthetic-password-value"
    record = logging.LogRecord(
        name="src.services.example",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="%s",
        args=({"payload": {"password": secret, "safe": "kept"}},),
        exc_info=None,
    )

    SensitiveDataRedactionFilter().filter(record)

    assert record.args["payload"]["password"] == "[REDACTED]"
    assert record.args["payload"]["safe"] == "kept"


def test_logging_filter_redacts_exception_message():
    secret = "synthetic-password-value"
    record = logging.LogRecord(
        name="src.services.example",
        level=logging.ERROR,
        pathname=__file__,
        lineno=1,
        msg="provider failed: %s",
        args=(RuntimeError(f"password={secret}"),),
        exc_info=None,
    )

    SensitiveDataRedactionFilter().filter(record)

    assert secret not in record.args[0]
    assert "password=[REDACTED]" in record.args[0]


def test_configured_factory_redacts_application_logger_output():
    secret = "synthetic-password-value"
    stream = StringIO()
    handler = logging.StreamHandler(stream)
    logger = logging.getLogger("src.services.synthetic_redaction_test")
    logger.handlers = [handler]
    logger.propagate = False
    logger.setLevel(logging.INFO)

    configure_sensitive_log_redaction()
    logger.info("nested=%s", {"password": secret, "safe": "kept"})

    output = stream.getvalue()
    assert secret not in output
    assert "[REDACTED]" in output
