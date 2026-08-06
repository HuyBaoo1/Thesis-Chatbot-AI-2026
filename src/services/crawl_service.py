import hashlib
import logging
import re
from datetime import datetime
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.orm import Session

from src.models.crawl_page_job import CrawlPageJob, CrawlPageJobStatus
from src.models.crawl_session import CrawlSession, CrawlStatus
from src.models.enums import AdmissionCategory
from src.schemas.crawl_page_job import (
    CrawlManualSourceCreate,
    CrawlPageContentUpdateRequest,
    CrawlPageSendToKbRequest,
)
from src.schemas.crawl_session import CrawlSessionCreate
from src.services import (
    firecrawl_service,
    knowledge_chunk_service,
    metadata_extraction,
    r2_service,
    vgu_crawl_artifact_service,
)

logger = logging.getLogger(__name__)

CRAWL_OUTPUT_FOLDER = "crawl-output"


def get_crawl_session_or_404(crawl_id: UUID, db: Session) -> CrawlSession:
    crawl_session = db.query(CrawlSession).filter(CrawlSession.id == crawl_id).first()
    if not crawl_session:
        raise HTTPException(status_code=404, detail="Crawl session not found")
    return crawl_session


def get_crawl_page_job_or_404(page_job_id: UUID, db: Session) -> CrawlPageJob:
    page_job = db.query(CrawlPageJob).filter(CrawlPageJob.id == page_job_id).first()
    if not page_job:
        raise HTTPException(status_code=404, detail="Crawl page job not found")
    return page_job


def create_crawl_session(data: CrawlSessionCreate, db: Session) -> CrawlSession:
    crawl_session = CrawlSession(
        target_url=str(data.target_url),
        limit=data.limit,
        status=CrawlStatus.PENDING,
        total_pages=0,
        completed_pages=0,
        started_at=datetime.utcnow(),
    )
    db.add(crawl_session)
    db.commit()
    db.refresh(crawl_session)
    return crawl_session


def create_manual_source_page_job(
    data: CrawlManualSourceCreate,
    db: Session,
    *,
    created_by: str | None = None,
) -> CrawlPageJob:
    md_content = data.reviewed_markdown.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not md_content:
        raise HTTPException(status_code=400, detail="Reviewed markdown cannot be empty")

    now = datetime.utcnow()
    crawl_session = CrawlSession(
        target_url=data.source_url,
        limit=1,
        status=CrawlStatus.COMPLETED,
        total_pages=1,
        completed_pages=1,
        started_at=now,
        completed_at=now,
    )
    db.add(crawl_session)
    db.flush()

    page_job = CrawlPageJob(
        crawl_session_id=crawl_session.id,
        source_url=data.source_url,
        detected_title=data.source_title,
        page_index=0,
        status=CrawlPageJobStatus.COMPLETED.value,
        suggested_metadata={
            "category": None,
            "title": data.source_title,
            "year": None,
            "source": data.source_url,
            "acquisition_method": "manual_verified",
            "review_status": data.review_status,
            "source_scope": data.source_scope,
            "effective_context": data.effective_context,
        },
        firecrawl_data={
            "metadata": {
                "acquisition_method": "manual_verified",
                "review_status": data.review_status,
                "source_url": data.source_url,
                "source_title": data.source_title,
                "source_scope": data.source_scope,
                "effective_context": data.effective_context,
                "created_by": created_by,
            },
            "url": data.source_url,
        },
    )
    db.add(page_job)
    db.flush()

    persisted_markdown = persist_markdown_artifact(page_job_id=str(page_job.id), md_content=md_content)
    page_job.md_r2_key = persisted_markdown["key"]
    page_job.content_hash = _build_content_hash(md_content)
    db.commit()
    db.refresh(page_job)
    return page_job


def run_crawl_background(crawl_id: str | UUID) -> None:
    """Background task: crawl pages and persist one editable markdown artifact per page."""
    from src.db.session import SessionLocal
    crawl_id = UUID(str(crawl_id))

    db = SessionLocal()
    crawl_session: CrawlSession | None = None
    try:
        crawl_session = db.query(CrawlSession).filter(CrawlSession.id == crawl_id).first()
        if not crawl_session:
            logger.error("Crawl session %s not found in background task", crawl_id)
            return

        crawl_session.status = CrawlStatus.SCRAPING
        db.commit()

        result = firecrawl_service.crawl_sync(url=crawl_session.target_url, limit=crawl_session.limit)
        total_pages = result.get("total", 0)
        completed_pages = 0
        if result.get("success") and result.get("data"):
            completed_pages = _process_crawl_pages(
                crawl_session,
                result["data"],
                db,
                requested_urls=result.get("source_urls"),
            )

        crawl_session.status = CrawlStatus.COMPLETED if completed_pages > 0 else CrawlStatus.FAILED
        crawl_session.total_pages = total_pages
        crawl_session.completed_pages = completed_pages
        crawl_session.completed_at = datetime.utcnow()
        db.commit()
    except Exception:
        logger.exception("Background crawl failed for session %s", crawl_id)
        if crawl_session:
            crawl_session.status = CrawlStatus.FAILED
            crawl_session.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


def get_crawl_session(crawl_id: UUID, db: Session) -> CrawlSession:
    return get_crawl_session_or_404(crawl_id, db)


def list_crawl_sessions(
    db: Session,
    *,
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    normalized_limit = max(1, min(limit, 100))
    normalized_offset = max(0, offset)

    query = db.query(CrawlSession)
    if status:
        query = query.filter(CrawlSession.status == status)

    total = query.count()
    items = (
        query.order_by(CrawlSession.created_at.desc())
        .offset(normalized_offset)
        .limit(normalized_limit)
        .all()
    )
    return {
        "items": items,
        "total": total,
        "limit": normalized_limit,
        "offset": normalized_offset,
        "has_more": normalized_offset + len(items) < total,
    }


def poll_crawl_session(crawl_id: UUID, db: Session) -> dict:
    crawl_session = get_crawl_session_or_404(crawl_id, db)
    return {
        "id": crawl_session.id,
        "status": crawl_session.status.value,
        "completed": crawl_session.completed_pages,
        "total": crawl_session.total_pages,
    }


def _process_crawl_pages(
    crawl_session: CrawlSession,
    pages: list,
    db: Session,
    *,
    requested_urls: list[str] | None = None,
) -> int:
    completed_pages = 0
    for page_index, page in enumerate(pages):
        if not isinstance(page, dict):
            logger.warning("Skipping non-dict crawl page at index %s", page_index)
            continue

        requested_url = (
            requested_urls[page_index]
            if requested_urls and page_index < len(requested_urls)
            else None
        )
        page_url = _extract_page_url(page, fallback=requested_url)
        if not page_url:
            continue

        existing = (
            db.query(CrawlPageJob)
            .filter(CrawlPageJob.crawl_session_id == crawl_session.id)
            .filter(CrawlPageJob.source_url == page_url)
            .first()
        )
        if existing:
            continue

        try:
            _create_page_job_from_firecrawl_page(
                crawl_session=crawl_session,
                page=page,
                page_url=page_url,
                page_index=page_index,
                db=db,
            )
            completed_pages += 1
        except Exception as exc:
            logger.exception("Failed to persist crawled page %s", page_url)
            db.rollback()
            db.add(
                CrawlPageJob(
                    crawl_session_id=crawl_session.id,
                    source_url=page_url,
                    detected_title=page.get("metadata", {}).get("title"),
                    page_index=page_index,
                    status=CrawlPageJobStatus.FAILED.value,
                    suggested_metadata=_build_suggested_metadata(page_url, None, None),
                    firecrawl_data=_compact_firecrawl_data(page),
                    error_message=str(exc),
                )
            )
            db.commit()
    return completed_pages


def _create_page_job_from_firecrawl_page(
    *,
    crawl_session: CrawlSession,
    page: dict,
    page_url: str,
    page_index: int,
    db: Session,
) -> CrawlPageJob:
    title = page.get("metadata", {}).get("title", "")
    md_content = _extract_page_markdown(page)
    if not md_content.strip():
        raise ValueError("Crawled page has no markdown content")

    page_job = CrawlPageJob(
        crawl_session_id=crawl_session.id,
        source_url=page_url,
        detected_title=title or None,
        page_index=page_index,
        status=CrawlPageJobStatus.COMPLETED.value,
        suggested_metadata=_build_suggested_metadata(page_url, title, md_content),
        firecrawl_data=_compact_firecrawl_data(page),
    )
    db.add(page_job)
    db.flush()

    persisted_markdown = persist_markdown_artifact(page_job_id=str(page_job.id), md_content=md_content)
    page_job.md_r2_key = persisted_markdown["key"]
    page_job.content_hash = _build_content_hash(md_content)
    artifact_refs = vgu_crawl_artifact_service.save_successful_crawl_artifacts(
        source_url=page_url,
        title=title or None,
        markdown=md_content,
        crawl_session_id=str(crawl_session.id),
        page_job_id=str(page_job.id),
        page_index=page_index,
        firecrawl_metadata=page.get("metadata") if isinstance(page.get("metadata"), dict) else {},
    )
    if artifact_refs:
        firecrawl_data = page_job.firecrawl_data if isinstance(page_job.firecrawl_data, dict) else {}
        metadata = firecrawl_data.get("metadata") if isinstance(firecrawl_data.get("metadata"), dict) else {}
        metadata.update(
            {
                "raw_file": artifact_refs.get("raw_file"),
                "reviewed_file": artifact_refs.get("reviewed_file"),
                "review_status": "needs_review",
            }
        )
        firecrawl_data["metadata"] = metadata
        page_job.firecrawl_data = firecrawl_data
        flag_modified(page_job, "firecrawl_data")
    db.commit()
    db.refresh(page_job)
    return page_job


def _extract_page_url(page: dict, *, fallback: str | None = None) -> str:
    metadata = page.get("metadata") or {}
    return metadata.get("sourceURL") or page.get("url") or fallback or ""


def _extract_page_markdown(page: dict) -> str:
    return (page.get("markdown") or page.get("content") or "").replace("\r\n", "\n").replace("\r", "\n").strip()


def _build_suggested_metadata(url: str, title: str | None, content: str | None) -> dict:
    metadata = metadata_extraction.extract_metadata(url, title, content)
    return {
        "category": metadata.category,
        "title": metadata.title,
        "year": metadata.year,
        "source": metadata.source,
    }


def _compact_firecrawl_data(page: dict) -> dict:
    metadata = page.get("metadata") or {}
    return {
        "metadata": metadata,
        "url": page.get("url"),
    }


def _build_content_hash(md_content: str) -> str:
    return hashlib.sha256(md_content.encode("utf-8")).hexdigest()


def build_markdown_artifact_key(page_job_id: str) -> str:
    return f"{CRAWL_OUTPUT_FOLDER}/{page_job_id}.md"


def persist_markdown_artifact(*, page_job_id: str, md_content: str) -> dict:
    md_bytes = md_content.encode("utf-8")
    return r2_service.upload_file_bytes(
        file_bytes=md_bytes,
        file_name=f"{page_job_id}.md",
        folder=CRAWL_OUTPUT_FOLDER,
        content_type="text/markdown; charset=utf-8",
        object_key=build_markdown_artifact_key(page_job_id),
    )


def read_markdown_content(md_r2_key: str) -> str:
    try:
        return r2_service.download_file_bytes(md_r2_key).decode("utf-8")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Markdown artifact is missing from storage")


def _delete_markdown_artifact(md_r2_key: str | None) -> None:
    if not md_r2_key:
        return
    try:
        r2_service.delete_file(md_r2_key)
    except Exception:
        logger.warning("Failed to delete crawl markdown artifact %s", md_r2_key, exc_info=True)


def list_crawl_page_jobs(
    db: Session,
    *,
    crawl_session_id: UUID | None = None,
    status: str | None = None,
    sent_to_kb: bool | None = None,
    q: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    normalized_limit = max(1, min(limit, 100))
    normalized_offset = max(0, offset)

    query = db.query(CrawlPageJob)
    if crawl_session_id:
        query = query.filter(CrawlPageJob.crawl_session_id == crawl_session_id)
    if status:
        query = query.filter(CrawlPageJob.status == status)
    if sent_to_kb is True:
        query = query.filter(CrawlPageJob.sent_to_kb.isnot(None))
    elif sent_to_kb is False:
        query = query.filter(CrawlPageJob.sent_to_kb.is_(None))
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                CrawlPageJob.source_url.ilike(pattern),
                CrawlPageJob.detected_title.ilike(pattern),
                CrawlPageJob.title.ilike(pattern),
            )
        )

    total = query.count()
    items = (
        query.order_by(CrawlPageJob.created_at.desc())
        .offset(normalized_offset)
        .limit(normalized_limit)
        .all()
    )
    return {
        "items": items,
        "total": total,
        "limit": normalized_limit,
        "offset": normalized_offset,
        "has_more": normalized_offset + len(items) < total,
    }


def get_crawl_page_job(page_job_id: UUID, db: Session) -> CrawlPageJob:
    return get_crawl_page_job_or_404(page_job_id, db)


def get_crawl_page_job_content(page_job_id: UUID, db: Session) -> str:
    page_job = get_crawl_page_job_or_404(page_job_id, db)
    if not page_job.md_r2_key:
        raise HTTPException(status_code=404, detail="No markdown artifact found")
    return read_markdown_content(page_job.md_r2_key)


def get_crawl_page_job_download(page_job_id: UUID, db: Session) -> dict:
    page_job = get_crawl_page_job_or_404(page_job_id, db)
    if not page_job.md_r2_key:
        raise HTTPException(status_code=404, detail="No markdown artifact found")
    return {"url": r2_service.generate_presigned_url(page_job.md_r2_key)}


def update_crawl_page_job_content(
    page_job_id: UUID,
    data: CrawlPageContentUpdateRequest,
    db: Session,
) -> CrawlPageJob:
    page_job = get_crawl_page_job_or_404(page_job_id, db)
    if page_job.status != CrawlPageJobStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Only completed crawl pages can be edited")
    if page_job.sent_to_kb:
        raise HTTPException(status_code=400, detail="Page has already been sent to KB")

    md_content = data.content.replace("\r\n", "\n").replace("\r", "\n")
    if not md_content.strip():
        raise HTTPException(status_code=400, detail="Markdown content cannot be empty")

    persisted_markdown = persist_markdown_artifact(page_job_id=str(page_job.id), md_content=md_content)
    page_job.md_r2_key = persisted_markdown["key"]
    page_job.content_hash = _build_content_hash(md_content)
    db.commit()
    db.refresh(page_job)
    return page_job


def send_crawl_page_job_to_knowledge_base(
    page_job_id: UUID,
    data: CrawlPageSendToKbRequest,
    db: Session,
) -> dict:
    page_job = get_crawl_page_job_or_404(page_job_id, db)
    if page_job.status != CrawlPageJobStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Only completed crawl pages can be sent to KB")
    if not page_job.md_r2_key:
        raise HTTPException(status_code=400, detail="Page markdown not found")

    if page_job.sent_to_kb:
        return {"page_job": page_job, "kb_result": None, "reused": True}

    md_content = read_markdown_content(page_job.md_r2_key)
    if not md_content.strip():
        raise HTTPException(status_code=400, detail="Page markdown is empty")

    content_hash = _build_content_hash(md_content)

    existing_sent = (
        db.query(CrawlPageJob)
        .filter(CrawlPageJob.content_hash == content_hash)
        .filter(CrawlPageJob.sent_to_kb.isnot(None))
        .filter(CrawlPageJob.id != page_job.id)
        .first()
    )
    if existing_sent:
        _apply_final_metadata(page_job, data, content_hash=content_hash)
        page_job.sent_to_kb = existing_sent.sent_to_kb
        db.commit()
        db.refresh(page_job)
        return {"page_job": page_job, "kb_result": None, "reused": True}

    file_name = _safe_markdown_file_name(data.title, fallback=f"crawl-{str(page_job.id)[:8]}")
    kb_result = knowledge_chunk_service.upload_file_to_chunks(
        file_name=file_name,
        file_bytes=md_content.encode("utf-8"),
        content_type="text/markdown; charset=utf-8",
        title=data.title,
        category=data.category,
        year=data.year,
        version_start=data.version_start,
        chunk_size=data.chunk_size,
        chunk_overlap=data.chunk_overlap,
        source=page_job.source_url,
        extra_metadata=_build_kb_extra_metadata(page_job),
        db=db,
    )

    _apply_final_metadata(page_job, data, content_hash=content_hash)
    page_job.sent_to_kb = str(kb_result["created_ids"][0]) if kb_result["created_ids"] else None
    db.commit()
    db.refresh(page_job)
    return {"page_job": page_job, "kb_result": kb_result, "reused": False}


def _apply_final_metadata(
    page_job: CrawlPageJob,
    data: CrawlPageSendToKbRequest,
    *,
    content_hash: str,
) -> None:
    page_job.title = data.title
    page_job.category = data.category.value if isinstance(data.category, AdmissionCategory) else str(data.category)
    page_job.year = data.year
    page_job.version_start = data.version_start
    page_job.content_hash = content_hash


def _build_kb_extra_metadata(page_job: CrawlPageJob) -> dict:
    metadata = {
        "crawl_page_job_id": str(page_job.id),
        "crawl_session_id": str(page_job.crawl_session_id),
        "source_url": page_job.source_url,
    }
    if page_job.content_hash:
        metadata["content_hash"] = page_job.content_hash

    firecrawl_data = page_job.firecrawl_data if isinstance(page_job.firecrawl_data, dict) else {}
    source_metadata = firecrawl_data.get("metadata") if isinstance(firecrawl_data.get("metadata"), dict) else {}
    for key in (
        "acquisition_method",
        "review_status",
        "source_title",
        "source_scope",
        "effective_context",
        "created_by",
    ):
        value = source_metadata.get(key)
        if value:
            metadata[key] = value
    return metadata


def _safe_markdown_file_name(title: str, *, fallback: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._ -]+", "", title).strip(" .")
    stem = cleaned or fallback
    if Path(stem).suffix.lower() == ".md":
        return stem
    return f"{stem}.md"


def delete_crawl_session(crawl_id: UUID, db: Session) -> dict:
    crawl_session = get_crawl_session_or_404(crawl_id, db)
    for page_job in list(crawl_session.page_jobs):
        _delete_markdown_artifact(page_job.md_r2_key)

    db.delete(crawl_session)
    db.commit()
    return {"deleted": True, "id": str(crawl_id)}


def delete_crawl_page_job(page_job_id: UUID, db: Session) -> dict:
    page_job = get_crawl_page_job_or_404(page_job_id, db)
    _delete_markdown_artifact(page_job.md_r2_key)
    db.delete(page_job)
    db.commit()
    return {"deleted": True, "id": str(page_job_id)}
