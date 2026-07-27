import logging
import re
from collections.abc import Mapping
from typing import Any


REDACTED = "[REDACTED]"

_SENSITIVE_PATTERNS = (
    re.compile(r"(?i)(authorization:\s*bearer\s+)[A-Za-z0-9._~+/=-]+"),
    re.compile(r"(?i)(bearer\s+)eyJ[A-Za-z0-9._-]+"),
    re.compile(r"(?i)([?&](?:access_token|refresh_token|token|conversation_token)=)[^&\s]+"),
    re.compile(r"(?i)(\b(?:access_token|refresh_token|token|conversation_token)=)[^;&\s]+"),
    re.compile(r"\beyJ[A-Za-z0-9._-]{20,}\b"),
    re.compile(r"\bsk-[A-Za-z0-9_-]{16,}\b"),
    re.compile(r"\bfc-[A-Za-z0-9_-]{16,}\b"),
    re.compile(r"\b\d{8,}:[A-Za-z0-9_-]{20,}\b"),
)


def redact_sensitive_text(value: str) -> str:
    redacted = value
    for pattern in _SENSITIVE_PATTERNS:
        redacted = pattern.sub(lambda match: _redacted_replacement(match), redacted)
    return redacted


def _redacted_replacement(match: re.Match[str]) -> str:
    if match.lastindex:
        return f"{match.group(1)}{REDACTED}"
    return REDACTED


class SensitiveDataRedactionFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_sensitive_text(record.msg)
        record.args = _redact_log_args(record.args)
        return True


def configure_sensitive_log_redaction() -> None:
    redaction_filter = SensitiveDataRedactionFilter()
    for logger_name in ("", "uvicorn", "uvicorn.access", "uvicorn.error"):
        target_logger = logging.getLogger(logger_name)
        if not any(isinstance(item, SensitiveDataRedactionFilter) for item in target_logger.filters):
            target_logger.addFilter(redaction_filter)


def _redact_log_args(args: Any) -> Any:
    if isinstance(args, str):
        return redact_sensitive_text(args)
    if isinstance(args, tuple):
        return tuple(_redact_log_args(item) for item in args)
    if isinstance(args, list):
        return [_redact_log_args(item) for item in args]
    if isinstance(args, Mapping):
        return {key: _redact_log_args(value) for key, value in args.items()}
    return args
