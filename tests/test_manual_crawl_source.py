import uuid
from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from src.api.deps import get_current_user
from src.db import session
from src.main import app
from src.models.crawl_page_job import CrawlPageJob
from src.models.crawl_session import CrawlSession
from src.models.enums import StaffRole
from src.schemas.crawl_page_job import CrawlManualSourceCreate
from src.services import crawl_service, ocr_temp_storage
from src.services.crawl_service import create_manual_source_page_job, read_markdown_content


class FakeDb:
    def __init__(self):
        self.objects = []
        self.commits = 0

    def add(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = uuid.uuid4()
        if isinstance(obj, CrawlPageJob) and getattr(obj, "crawl_session_id", None) is None:
            obj.crawl_session_id = self.objects[0].id
        self.objects.append(obj)

    def flush(self):
        pass

    def commit(self):
        self.commits += 1

    def refresh(self, obj):
        pass


def test_manual_source_creates_completed_page_job_and_persistent_artifact(monkeypatch, tmp_path):
    monkeypatch.setattr(ocr_temp_storage.settings, "OCR_TEMP_DIR", str(tmp_path))

    db = FakeDb()
    page_job = create_manual_source_page_job(
        CrawlManualSourceCreate(
            source_url="https://vgu.edu.vn/admission",
            source_title="VGU Admissions Overview",
            reviewed_markdown="# VGU Admissions Overview\n\nOfficial admissions navigation.",
            source_scope="general admissions overview",
            review_status="verified",
            effective_context="not intake-specific",
        ),
        db,
        created_by="admin-id",
    )

    sessions = [item for item in db.objects if isinstance(item, CrawlSession)]
    assert len(sessions) == 1
    assert sessions[0].status.value == "COMPLETED"
    assert sessions[0].total_pages == 1
    assert sessions[0].completed_pages == 1
    assert page_job.status == "completed"
    assert page_job.source_url == "https://vgu.edu.vn/admission"
    assert page_job.md_r2_key.startswith("local://")
    assert str(tmp_path) in page_job.md_r2_key
    assert read_markdown_content(page_job.md_r2_key).startswith("# VGU Admissions Overview")
    assert page_job.firecrawl_data["metadata"]["acquisition_method"] == "manual_verified"
    assert page_job.firecrawl_data["metadata"]["review_status"] == "verified"


def test_manual_source_rejects_needs_review_markdown():
    with pytest.raises(ValueError):
        CrawlManualSourceCreate(
            source_url="https://vgu.edu.vn/admission",
            source_title="VGU Admissions Overview",
            reviewed_markdown="# Draft\n\nstatus: needs_review",
            source_scope="general admissions overview",
            review_status="verified",
            effective_context="not intake-specific",
        )


def test_manual_source_api_requires_authentication():
    client = TestClient(app, base_url="http://localhost")
    response = client.post(
        "/api/crawl/manual-sources/",
        json={
            "source_url": "https://vgu.edu.vn/admission",
            "source_title": "VGU Admissions Overview",
            "reviewed_markdown": "# VGU Admissions Overview",
            "source_scope": "general admissions overview",
            "review_status": "verified",
            "effective_context": "not intake-specific",
        },
    )

    assert response.status_code == 401


def test_manual_source_api_denies_non_admin(monkeypatch):
    client = TestClient(app, base_url="http://localhost")
    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "counselor-id",
        "role": StaffRole.COUNSELOR,
    }
    try:
        response = client.post(
            "/api/crawl/manual-sources/",
            json={
                "source_url": "https://vgu.edu.vn/admission",
                "source_title": "VGU Admissions Overview",
                "reviewed_markdown": "# VGU Admissions Overview",
                "source_scope": "general admissions overview",
                "review_status": "verified",
                "effective_context": "not intake-specific",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403


def test_manual_source_api_allows_admin(monkeypatch):
    def fake_get_db():
        yield object()

    def fake_create_manual_source_page_job(data, db, *, created_by=None):
        return SimpleNamespace(
            id=uuid.uuid4(),
            crawl_session_id=uuid.uuid4(),
            source_url=data.source_url,
            detected_title=data.source_title,
            page_index=0,
            md_r2_key="local:///app/data/runtime/admissions-ocr/crawl-output/source.md",
            content_hash="hash",
            status="completed",
            suggested_metadata={"acquisition_method": "manual_verified"},
            error_message=None,
            title=None,
            category=None,
            year=None,
            version_start=None,
            sent_to_kb=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    monkeypatch.setattr(
        crawl_service,
        "create_manual_source_page_job",
        fake_create_manual_source_page_job,
    )
    client = TestClient(app, base_url="http://localhost")
    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "admin-id",
        "role": StaffRole.ADMIN,
    }
    app.dependency_overrides[session.get_db] = fake_get_db
    try:
        response = client.post(
            "/api/crawl/manual-sources/",
            json={
                "source_url": "https://vgu.edu.vn/admission",
                "source_title": "VGU Admissions Overview",
                "reviewed_markdown": "# VGU Admissions Overview",
                "source_scope": "general admissions overview",
                "review_status": "verified",
                "effective_context": "not intake-specific",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    assert response.json()["status"] == "completed"
    assert response.json()["source_url"] == "https://vgu.edu.vn/admission"
