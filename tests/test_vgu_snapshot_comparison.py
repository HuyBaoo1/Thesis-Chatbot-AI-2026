from src.services.vgu_snapshot_comparison_service import (
    CONTENT_CHANGED_REVIEW_REQUIRED,
    CONTENT_UNCHANGED,
    NO_ACTIVE_COMPARISON_DOCUMENT,
    compare_snapshot_to_active_import,
)


def test_snapshot_comparison_detects_unchanged_content(tmp_path):
    raw = tmp_path / "raw.md"
    active = tmp_path / "active.md"
    raw.write_text("# Raw\n\n## Raw crawler content\n\n# Tuition\n\nSame content\n", encoding="utf-8")
    active.write_text("# Tuition\n\nSame content\n", encoding="utf-8")

    result = compare_snapshot_to_active_import(raw, active)

    assert result.status == CONTENT_UNCHANGED


def test_snapshot_comparison_detects_changed_content(tmp_path):
    raw = tmp_path / "raw.md"
    active = tmp_path / "active.md"
    raw.write_text("# Raw\n\n## Raw crawler content\n\n# Tuition\n\nNew content\n", encoding="utf-8")
    active.write_text("# Tuition\n\nOld content\n", encoding="utf-8")

    result = compare_snapshot_to_active_import(raw, active)

    assert result.status == CONTENT_CHANGED_REVIEW_REQUIRED


def test_snapshot_comparison_handles_missing_active_doc(tmp_path):
    raw = tmp_path / "raw.md"
    raw.write_text("# Raw\n\n## Raw crawler content\n\n# Tuition\n\nNew content\n", encoding="utf-8")

    result = compare_snapshot_to_active_import(raw, tmp_path / "missing.md")

    assert result.status == NO_ACTIVE_COMPARISON_DOCUMENT
