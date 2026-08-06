import pytest

from src.services.ingestion_governance import (
    FieldStatus,
    ReviewStatus,
    normalize_field_status,
    normalize_review_status,
)


def test_review_status_aliases_are_normalized():
    assert normalize_review_status("needs_review") == ReviewStatus.REVIEW_REQUIRED
    assert normalize_review_status("review-required") == ReviewStatus.REVIEW_REQUIRED
    assert normalize_review_status("verified") == ReviewStatus.VERIFIED
    assert normalize_review_status("historical_only") == ReviewStatus.HISTORICAL_ONLY


def test_unknown_review_status_is_rejected():
    with pytest.raises(ValueError, match="Unknown review status"):
        normalize_review_status("verifed")


def test_field_status_aliases_are_normalized():
    assert normalize_field_status("MATCHED") == FieldStatus.MATCHED
    assert normalize_field_status("not applicable") == FieldStatus.NOT_APPLICABLE
    assert normalize_field_status("missing-source") == FieldStatus.MISSING_SOURCE


def test_unknown_field_status_is_rejected():
    with pytest.raises(ValueError, match="Unknown field status"):
        normalize_field_status("verified-ish")
