import json

import pytest

from src.services.vgu_source_registry_service import (
    canonicalize_url,
    get_source_entry,
    is_official_vgu_url,
)


def test_canonicalize_url_removes_tracking_and_fragment():
    assert (
        canonicalize_url("http://www.vgu.edu.vn/admission/?utm_source=x&keep=1#top")
        == "https://www.vgu.edu.vn/admission?keep=1"
    )


def test_registry_resolves_trailing_slash_and_tracking_query(tmp_path):
    registry = tmp_path / "registry.json"
    registry.write_text(
        json.dumps(
            {
                "allowed_domains": ["vgu.edu.vn"],
                "sources": [
                    {
                        "source_url": "https://vgu.edu.vn/admission",
                        "canonical_url": "https://vgu.edu.vn/admission",
                        "document_index": 1,
                        "canonical_slug": "admission_overview",
                        "raw_filename_prefix": "01_admission_overview",
                        "reviewed_filename_prefix": "01_admission_overview",
                        "import_filename": "01_trang_chu_tuyen_sinh_vgu.md",
                        "document_title": "VGU Admissions Overview",
                        "source_scope": "admissions_overview",
                        "expected_effective_context": "general_admissions_current",
                        "promotion_policy": "manual_verified_only",
                        "existing_active_document": "vgu_admissions_import/01_trang_chu_tuyen_sinh_vgu.md",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    entry = get_source_entry("https://vgu.edu.vn/admission/?utm_medium=test", path=registry)

    assert entry.canonical_slug == "admission_overview"
    assert is_official_vgu_url("https://vgu.edu.vn/admission", path=registry)


def test_registry_rejects_unregistered_source(tmp_path):
    registry = tmp_path / "registry.json"
    registry.write_text(json.dumps({"allowed_domains": ["vgu.edu.vn"], "sources": []}), encoding="utf-8")

    with pytest.raises(ValueError, match="not registered"):
        get_source_entry("https://vgu.edu.vn/unknown", path=registry)
