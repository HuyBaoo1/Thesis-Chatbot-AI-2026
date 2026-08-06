import logging
import re
from collections.abc import Mapping
from typing import Any


REDACTED = "[REDACTED]"

_SENSITIVE_FIELD_NAMES = {
    "access_token",
    "authorization",
    "cookie",
    "firecrawl_api_key",
    "openai_api_key",
    "password",
    "refresh_token",
    "r2_secret_access_key",
    "secret_key",
    "set-cookie",
    "telegram_bot_token",
    "token",
}

_SENSITIVE_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"(?i)(authorization:\s*bearer\s+)[A-Za-z0-9._~+/=%-]+"),
        rf"\1{REDACTED}",
    ),
    (
        re.compile(r"(?i)(bearer\s+)eyJ[A-Za-z0-9._~+/=%-]+"),
        rf"\1{REDACTED}",
    ),
    (
        re.compile(
            r"(?i)([?&](?:access_token|refresh_token|token|conversation_token|api_key|jwt)=)[^&\s]+"
        ),
        rf"\1{REDACTED}",
    ),
    (
        re.compile(
            r"(?i)(\b(?:access_token|refresh_token|token|conversation_token|api_key|jwt)=)[^;&\s]+"
        ),
        rf"\1{REDACTED}",
    ),
    (
        re.compile(
            r"(?i)(\b(?:password|openai_api_key|firecrawl_api_key|telegram_bot_token|secret_key|r2_secret_access_key)\b\s*[:=]\s*)([\"']?)[^\"'\s,;&}]+([\"']?)"
        ),
        rf"\1\2{REDACTED}\3",
    ),
    (
        re.compile(
            r"(?i)([\"'](?:password|openai_api_key|firecrawl_api_key|telegram_bot_token|secret_key|r2_secret_access_key)[\"']\s*:\s*[\"'])[^\"']+([\"'])"
        ),
        rf"\1{REDACTED}\2",
    ),
    (re.compile(r"\beyJ[A-Za-z0-9._-]{20,}\b"), REDACTED),
    (re.compile(r"\bsk-[A-Za-z0-9_-]{16,}\b"), REDACTED),
    (re.compile(r"\bfc-[A-Za-z0-9_-]{16,}\b"), REDACTED),
    (re.compile(r"\b\d{8,}:[A-Za-z0-9_-]{20,}\b"), REDACTED),
)

_ORIGINAL_LOG_RECORD_FACTORY = logging.getLogRecordFactory()
_LOG_RECORD_FACTORY_CONFIGURED = False


def redact_sensitive_text(value: str) -> str:
    redacted = value
    for pattern, replacement in _SENSITIVE_PATTERNS:
        redacted = pattern.sub(replacement, redacted)
    return redacted


class SensitiveDataRedactionFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        _redact_log_record(record)
        return True


def configure_sensitive_log_redaction() -> None:
    global _LOG_RECORD_FACTORY_CONFIGURED

    if not _LOG_RECORD_FACTORY_CONFIGURED:
        logging.setLogRecordFactory(_redacting_log_record_factory)
        _LOG_RECORD_FACTORY_CONFIGURED = True

    redaction_filter = SensitiveDataRedactionFilter()
    for logger_name in ("", "uvicorn", "uvicorn.access", "uvicorn.error"):
        target_logger = logging.getLogger(logger_name)
        if not any(isinstance(item, SensitiveDataRedactionFilter) for item in target_logger.filters):
            target_logger.addFilter(redaction_filter)
        for handler in target_logger.handlers:
            if not any(isinstance(item, SensitiveDataRedactionFilter) for item in handler.filters):
                handler.addFilter(redaction_filter)


def _redacting_log_record_factory(*args: Any, **kwargs: Any) -> logging.LogRecord:
    record = _ORIGINAL_LOG_RECORD_FACTORY(*args, **kwargs)
    _redact_log_record(record)
    return record


def _redact_log_record(record: logging.LogRecord) -> None:
    if isinstance(record.msg, str):
        record.msg = redact_sensitive_text(record.msg)
    record.args = _redact_log_args(record.args)


def _redact_log_args(args: Any) -> Any:
    if isinstance(args, str):
        return redact_sensitive_text(args)
    if isinstance(args, BaseException):
        return redact_sensitive_text(str(args))
    if isinstance(args, tuple):
        return tuple(_redact_log_args(item) for item in args)
    if isinstance(args, list):
        return [_redact_log_args(item) for item in args]
    if isinstance(args, Mapping):
        return {
            key: REDACTED if _is_sensitive_key(key) else _redact_log_args(value)
            for key, value in args.items()
        }
    return args


def _is_sensitive_key(key: Any) -> bool:
    normalized = str(key).strip().lower().replace("-", "_")
    return normalized in {item.replace("-", "_") for item in _SENSITIVE_FIELD_NAMES}
