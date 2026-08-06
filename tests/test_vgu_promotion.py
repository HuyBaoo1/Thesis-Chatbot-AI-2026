import hashlib
import json

import pytest

from src.services.vgu_crawl_artifact_service import promote_reviewed_document


VERIFIED_MARKDOWN = """# Verified VGU Tuition

## Verification record

- Primary source URL: https://vgu.edu.vn/tuition-fees/for-bachelor-programs
- Canonical slug: bachelor_tuition_2026
- Source scope: bachelor_tuition
- Expected effective context: 2026 intake
- Source raw file: {raw_file}
- Reviewed by: admissions-owner
- Reviewed at: 2026-07-28T10:00:00+07:00
- Approval method: manual_source_check
- Review status: VERIFIED

## Field-level review checklist

| Field | Extracted value | Official source | Effective date/intake | Match status | Action |
|---|---|---|---|---|---|
| Tuition | Verified | Official source | 2026 intake | MATCHED | Approved. |
| Scholarship | Not applicable | Official source | 2026 intake | NOT_APPLICABLE | Not part of this tuition document. |

## Reviewed crawler content

Official verified VGU tuition content.
"""


RAW_MARKDOWN = """# Raw Firecrawl Snapshot - Bachelor programs

## Snapshot metadata

- Source URL: https://vgu.edu.vn/tuition-fees/for-bachelor-programs

## Raw crawler content

Official VGU raw tuition content.
"""


def _sha(content: str) -> str:
    return hashlib.sha256(content.replace("\r\n", "\n").replace("\r", "\n").strip().encode("utf-8")).hexdigest()


def _write_verified_fixture(tmp_path, *, promotion_allowed=True, diagnostic_only=False, field_status="MATCHED"):
    raw = tmp_path / "raw.md"
    reviewed = tmp_path / "reviewed.md"
    raw.write_text(RAW_MARKDOWN, encoding="utf-8")
    content = VERIFIED_MARKDOWN.format(raw_file=raw.as_posix())
    content = content.replace("| Tuition | Verified | Official source | 2026 intake | MATCHED | Approved. |", f"| Tuition | Verified | Official source | 2026 intake | {field_status} | Approved. |")
    reviewed.write_text(content, encoding="utf-8")
    raw_manifest = tmp_path / "raw_manifest.json"
    raw_manifest.write_text(
        json.dumps(
            {
                "sources": [
                    {
                        "source_url": "https://vgu.edu.vn/tuition-fees/for-bachelor-programs",
                        "canonical_url": "https://vgu.edu.vn/tuition-fees/for-bachelor-programs",
                        "canonical_slug": "bachelor_tuition_2026",
                        "source_scope": "bachelor_tuition",
                        "expected_effective_context": "2026 intake",
                        "raw_file": raw.as_posix(),
                        "reviewed_file": reviewed.as_posix(),
                        "raw_content_hash": _sha("Official VGU raw tuition content."),
                        "reviewed_content_hash": _sha(content),
                        "review_status": "VERIFIED",
                        "promotion_allowed": promotion_allowed,
                        "diagnostic_only": diagnostic_only,
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    return reviewed, raw_manifest


def test_promote_verified_document_updates_import_and_manifest(tmp_path):
    import_dir = tmp_path / "import"
    manifest = import_dir / "crawl_sources.json"
    reviewed, raw_manifest = _write_verified_fixture(tmp_path)

    result = promote_reviewed_document(
        reviewed,
        import_dir=import_dir,
        target_name="03_hoc_phi_cu_nhan_2026.md",
        sources_manifest_path=manifest,
        raw_manifest_path=raw_manifest,
    )

    promoted = import_dir / "03_hoc_phi_cu_nhan_2026.md"
    assert promoted.exists()
    assert result["status"] == "verified_promoted"
    data = json.loads(manifest.read_text(encoding="utf-8"))
    assert data["sources"][0]["review_status"] == "verified"
    assert data["sources"][0]["url"] == "https://vgu.edu.vn/tuition-fees/for-bachelor-programs"


def test_promote_blocks_needs_review_document(tmp_path):
    reviewed, raw_manifest = _write_verified_fixture(tmp_path)
    reviewed.write_text(reviewed.read_text(encoding="utf-8").replace("Review status: VERIFIED", "Review status: needs_review"), encoding="utf-8")

    with pytest.raises(ValueError, match="VERIFIED"):
        promote_reviewed_document(reviewed, import_dir=tmp_path / "import", raw_manifest_path=raw_manifest)


def test_promote_blocks_text_only_verified_without_trusted_manifest(tmp_path):
    reviewed = tmp_path / "reviewed.md"
    raw_manifest = tmp_path / "raw_manifest.json"
    reviewed.write_text(VERIFIED_MARKDOWN.format(raw_file=(tmp_path / "raw.md").as_posix()), encoding="utf-8")
    raw_manifest.write_text(json.dumps({"sources": []}), encoding="utf-8")

    with pytest.raises(ValueError, match="lineage manifest entry not found"):
        promote_reviewed_document(reviewed, import_dir=tmp_path / "import", raw_manifest_path=raw_manifest)


def test_promote_blocks_legacy_vinuni_content(tmp_path):
    reviewed, raw_manifest = _write_verified_fixture(tmp_path)
    content = reviewed.read_text(encoding="utf-8") + "\nLegacy VinUni sentence.\n"
    reviewed.write_text(content, encoding="utf-8")
    data = json.loads(raw_manifest.read_text(encoding="utf-8"))
    data["sources"][0]["reviewed_content_hash"] = _sha(content)
    raw_manifest.write_text(json.dumps(data), encoding="utf-8")

    with pytest.raises(ValueError, match="VinUni"):
        promote_reviewed_document(reviewed, import_dir=tmp_path / "import", raw_manifest_path=raw_manifest)


def test_promote_blocks_diagnostic_lineage(tmp_path):
    reviewed, raw_manifest = _write_verified_fixture(tmp_path, diagnostic_only=True, promotion_allowed=False)

    with pytest.raises(ValueError, match="Diagnostic"):
        promote_reviewed_document(reviewed, import_dir=tmp_path / "import", raw_manifest_path=raw_manifest)


def test_promote_blocks_field_status_mismatch(tmp_path):
    reviewed, raw_manifest = _write_verified_fixture(tmp_path, field_status="MISMATCH")

    with pytest.raises(ValueError, match="Field-level"):
        promote_reviewed_document(reviewed, import_dir=tmp_path / "import", raw_manifest_path=raw_manifest)
