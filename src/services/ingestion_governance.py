from enum import Enum


class ReviewStatus(str, Enum):
    RAW = "RAW"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    VERIFIED = "VERIFIED"
    PROMOTED = "PROMOTED"
    IMPORTED = "IMPORTED"
    HISTORICAL_ONLY = "HISTORICAL_ONLY"
    BLOCKED = "BLOCKED"


class FieldStatus(str, Enum):
    MATCHED = "MATCHED"
    MISMATCH = "MISMATCH"
    AMBIGUOUS = "AMBIGUOUS"
    MISSING_SOURCE = "MISSING_SOURCE"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    HISTORICAL_ONLY = "HISTORICAL_ONLY"
    BLOCKED = "BLOCKED"


REVIEW_STATUS_ALIASES = {
    "raw": ReviewStatus.RAW,
    "review_required": ReviewStatus.REVIEW_REQUIRED,
    "review-required": ReviewStatus.REVIEW_REQUIRED,
    "needs_review": ReviewStatus.REVIEW_REQUIRED,
    "needs-review": ReviewStatus.REVIEW_REQUIRED,
    "verified": ReviewStatus.VERIFIED,
    "promoted": ReviewStatus.PROMOTED,
    "imported": ReviewStatus.IMPORTED,
    "historical_only": ReviewStatus.HISTORICAL_ONLY,
    "historical-only": ReviewStatus.HISTORICAL_ONLY,
    "blocked": ReviewStatus.BLOCKED,
}

FIELD_STATUS_ALIASES = {
    "matched": FieldStatus.MATCHED,
    "match": FieldStatus.MATCHED,
    "mismatch": FieldStatus.MISMATCH,
    "ambiguous": FieldStatus.AMBIGUOUS,
    "missing_source": FieldStatus.MISSING_SOURCE,
    "missing-source": FieldStatus.MISSING_SOURCE,
    "not_applicable": FieldStatus.NOT_APPLICABLE,
    "not-applicable": FieldStatus.NOT_APPLICABLE,
    "n/a": FieldStatus.NOT_APPLICABLE,
    "historical_only": FieldStatus.HISTORICAL_ONLY,
    "historical-only": FieldStatus.HISTORICAL_ONLY,
    "blocked": FieldStatus.BLOCKED,
}

BLOCKING_FIELD_STATUSES = {
    FieldStatus.MISMATCH,
    FieldStatus.AMBIGUOUS,
    FieldStatus.MISSING_SOURCE,
    FieldStatus.BLOCKED,
}


def normalize_review_status(value: str | None) -> ReviewStatus:
    key = _normalize_key(value)
    if key not in REVIEW_STATUS_ALIASES:
        raise ValueError(f"Unknown review status: {value!r}")
    return REVIEW_STATUS_ALIASES[key]


def normalize_field_status(value: str | None) -> FieldStatus:
    key = _normalize_key(value)
    if key not in FIELD_STATUS_ALIASES:
        raise ValueError(f"Unknown field status: {value!r}")
    return FIELD_STATUS_ALIASES[key]


def is_blocking_field_status(value: str | None) -> bool:
    return normalize_field_status(value) in BLOCKING_FIELD_STATUSES


def _normalize_key(value: str | None) -> str:
    if value is None:
        raise ValueError("Status value is required")
    return value.strip().lower().replace(" ", "_")
