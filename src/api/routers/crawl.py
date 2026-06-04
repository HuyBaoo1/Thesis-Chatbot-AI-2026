from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status

from src.api.deps import require_role
from src.core.config import settings
from src.db import session
from src.models.enums import StaffRole
from src.schemas.crawl_page_job import (
    CrawlPageContentUpdateRequest,
    CrawlPageDownloadResponse,
    CrawlPageJobListOut,
    CrawlPageJobOut,
    CrawlPageSendToKbRequest,
    CrawlPageSendToKbResponse,
)
from src.schemas.crawl_session import (
    CrawlSessionCreate,
    CrawlSessionListOut,
    CrawlSessionOut,
    CrawlSessionPollOut,
)
from src.services import crawl_service
from src.services.queue_service import get_default_queue

router = APIRouter(prefix="/crawl", tags=["Crawl"])
admin_required = require_role([StaffRole.ADMIN])


@router.post("/sessions/", response_model=CrawlSessionOut, status_code=status.HTTP_201_CREATED)
def create_crawl_session(
    data: CrawlSessionCreate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    result = crawl_service.create_crawl_session(data, db)
    queue = get_default_queue()
    queue.enqueue(
        "src.services.crawl_service.run_crawl_background",
        str(result.id),
        job_timeout=settings.RQ_JOB_TIMEOUT,
    )
    return result


@router.get("/sessions/", response_model=CrawlSessionListOut)
def list_crawl_sessions(
    status: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return crawl_service.list_crawl_sessions(db, status=status, limit=limit, offset=offset)


@router.get("/sessions/{crawl_id}", response_model=CrawlSessionOut)
def get_crawl_session(
    crawl_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return crawl_service.get_crawl_session(crawl_id, db)


@router.post("/sessions/{crawl_id}/poll/", response_model=CrawlSessionPollOut)
def poll_crawl_session(
    crawl_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return crawl_service.poll_crawl_session(crawl_id, db)


@router.delete("/sessions/{crawl_id}")
def delete_crawl_session(
    crawl_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return crawl_service.delete_crawl_session(crawl_id, db)


@router.get("/page-jobs/", response_model=CrawlPageJobListOut)
def list_crawl_page_jobs(
    crawl_session_id: UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    sent_to_kb: bool | None = Query(default=None),
    q: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return crawl_service.list_crawl_page_jobs(
        db,
        crawl_session_id=crawl_session_id,
        status=status,
        sent_to_kb=sent_to_kb,
        q=q,
        limit=limit,
        offset=offset,
    )


@router.get("/page-jobs/{page_job_id}", response_model=CrawlPageJobOut)
def get_crawl_page_job(
    page_job_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return crawl_service.get_crawl_page_job(page_job_id, db)


@router.get("/page-jobs/{page_job_id}/content")
def get_crawl_page_job_content(
    page_job_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    content = crawl_service.get_crawl_page_job_content(page_job_id, db)
    return Response(content=content, media_type="text/markdown; charset=utf-8")


@router.put("/page-jobs/{page_job_id}/content", response_model=CrawlPageJobOut)
def update_crawl_page_job_content(
    page_job_id: UUID,
    data: CrawlPageContentUpdateRequest,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return crawl_service.update_crawl_page_job_content(page_job_id, data, db)


@router.get("/page-jobs/{page_job_id}/download", response_model=CrawlPageDownloadResponse)
def get_crawl_page_job_download(
    page_job_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return crawl_service.get_crawl_page_job_download(page_job_id, db)


@router.post("/page-jobs/{page_job_id}/send-to-kb", response_model=CrawlPageSendToKbResponse)
def send_crawl_page_job_to_knowledge_base(
    page_job_id: UUID,
    data: CrawlPageSendToKbRequest,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return crawl_service.send_crawl_page_job_to_knowledge_base(page_job_id, data, db)


@router.delete("/page-jobs/{page_job_id}")
def delete_crawl_page_job(
    page_job_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return crawl_service.delete_crawl_page_job(page_job_id, db)
