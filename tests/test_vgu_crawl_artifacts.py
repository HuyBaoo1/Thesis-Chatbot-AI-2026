import json

import pytest

from src.services import vgu_crawl_artifact_service


def test_successful_crawl_saves_raw_snapshot_and_review_draft(monkeypatch, tmp_path):
    raw_dir = tmp_path / "raw"
    reviewed_dir = tmp_path / "reviewed"
    report_path = tmp_path / "field_review.md"
    monkeypatch.setattr(vgu_crawl_artifact_service.settings, "VGU_AUTO_SAVE_RAW", True)
    monkeypatch.setattr(vgu_crawl_artifact_service.settings, "VGU_AUTO_CREATE_REVIEW_DRAFT", True)
    monkeypatch.setattr(vgu_crawl_artifact_service.settings, "VGU_RAW_CRAWL_DIR", str(raw_dir))
    monkeypatch.setattr(vgu_crawl_artifact_service.settings, "VGU_REVIEWED_CRAWL_DIR", str(reviewed_dir))
    monkeypatch.setattr(vgu_crawl_artifact_service.settings, "VGU_FIELD_REVIEW_REPORT_PATH", str(report_path))

    refs = vgu_crawl_artifact_service.save_successful_crawl_artifacts(
        source_url="https://vgu.edu.vn/admission",
        title="Admission - Vietnamese-German University",
        markdown="# Admission\n\n" + "Official VGU admissions content. " * 8,
        crawl_session_id="session-id",
        page_job_id="12345678-aaaa",
        page_index=0,
        firecrawl_metadata={"sourceURL": "https://vgu.edu.vn/admission", "firecrawl_proxy": "basic"},
    )

    assert refs is not None
    raw_file = raw_dir / refs["raw_file"].split("/")[-1]
    reviewed_file = reviewed_dir / refs["reviewed_file"].split("/")[-1]
    assert raw_file.exists()
    assert reviewed_file.exists()
    reviewed_content = reviewed_file.read_text(encoding="utf-8")
    assert "Review status: REVIEW_REQUIRED" in reviewed_content
    assert "Diagnostic only: true" in reviewed_content
    assert "Field-level review checklist" in reviewed_file.read_text(encoding="utf-8")
    assert report_path.exists()

    manifest = json.loads((raw_dir / "raw_crawl_manifest.json").read_text(encoding="utf-8"))
    assert manifest["sources"][0]["source_url"] == "https://vgu.edu.vn/admission"
    assert manifest["sources"][0]["canonical_slug"] == "admission_overview"
    assert manifest["sources"][0]["review_status"] == "REVIEW_REQUIRED"
    assert manifest["sources"][0]["diagnostic_only"] is True
    assert manifest["sources"][0]["promotion_allowed"] is False
    assert manifest["sources"][0]["raw_file"].endswith("_raw.md")
    assert manifest["sources"][0]["reviewed_file"].endswith("_review_required.md")


def test_raw_snapshot_rejects_too_short_markdown(monkeypatch, tmp_path):
    monkeypatch.setattr(vgu_crawl_artifact_service.settings, "VGU_AUTO_SAVE_RAW", True)
    monkeypatch.setattr(vgu_crawl_artifact_service.settings, "VGU_RAW_CRAWL_DIR", str(tmp_path))

    with pytest.raises(ValueError, match="too short"):
        vgu_crawl_artifact_service.save_successful_crawl_artifacts(
            source_url="https://vgu.edu.vn/admission",
            title="Admission",
            markdown="# Empty",
            crawl_session_id="session-id",
            page_job_id="page-job-id",
            page_index=0,
        )
