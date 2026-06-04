import hashlib
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile

from src.api.deps import require_role
from src.core.config import settings
from src.db import session
from src.models.enums import AdmissionCategory, StaffRole
from src.models.ocr_job import OcrJob
from src.schemas.ocr import (
    OcrContentUpdateRequest,
    OcrDownloadResponse,
    OcrJobListResponse,
    OcrJobResponse,
    OcrJobStatus,
    SendToKbRequest,
)
from src.services.ocr_temp_storage import (
    delete_temp_file,
    is_local_reference,
    read_text,
    resolve_local_reference,
)
from src.services.queue_service import get_default_queue
from src.services.r2_service import (
    delete_file,
    generate_presigned_url,
    get_r2_client,
    object_exists,
    upload_file_bytes,
)


router = APIRouter(prefix="/ocr-quick", tags=["OCR Quick"])

admin_or_counselor = require_role([StaffRole.ADMIN])

MAX_FILE_SIZE = 50 * 1024 * 1024
MAGIC_NUMBERS = {
    "pdf": b"%PDF",
    "png": b"\x89PNG",
    "jpg": b"\xff\xd8\xff",
    "jpeg": b"\xff\xd8\xff",
    "webp": b"RIFF",
    "tiff": b"II\x2a\x00",
    "xlsx": b"PK\x03\x04",
    "xls": b"\xd0\xcf\x11\xe0",
}

EXCEL_EXTENSIONS = {".xlsx", ".xls", ".csv"}

ALLOWED_EXTENSIONS = set(MAGIC_NUMBERS.keys()) | {"csv"}


def _source_object_key(job_id: str, filename: str) -> str:
    suffix = f".{filename.rsplit('.', 1)[-1].lower()}" if "." in filename else ""
    return f"ocr-source/{job_id}{suffix}"


def _persist_source_file(*, job_id: str, file_bytes: bytes, filename: str, content_type: str | None) -> str:
    uploaded = upload_file_bytes(
        file_bytes=file_bytes,
        file_name=filename,
        folder="ocr-source",
        content_type=content_type,
        object_key=_source_object_key(job_id, filename),
    )
    return uploaded["key"]


def _source_file_exists(source_r2_key: str | None) -> bool:
    if not source_r2_key:
        return False
    if is_local_reference(source_r2_key):
        return resolve_local_reference(source_r2_key).exists()
    return object_exists(source_r2_key)


def _delete_source_artifact(source_ref: str | None) -> None:
    if not source_ref:
        return
    if is_local_reference(source_ref):
        delete_temp_file(source_ref)
        return
    try:
        delete_file(source_ref)
    except Exception:
        pass


def _markdown_artifact_exists(md_ref: str | None) -> bool:
    if not md_ref:
        return False
    if is_local_reference(md_ref):
        return resolve_local_reference(md_ref).exists()
    return object_exists(md_ref)


def _job_can_be_reused(ocr_job: OcrJob) -> bool:
    if ocr_job.status == "completed":
        return _markdown_artifact_exists(ocr_job.md_r2_key)
    return _source_file_exists(ocr_job.source_r2_key)


def _read_markdown_content(md_ref: str) -> str:
    if is_local_reference(md_ref):
        return read_text(md_ref)
    response = get_r2_client().get_object(Bucket=settings.R2_BUCKET_NAME, Key=md_ref)
    return response["Body"].read().decode("utf-8")


def _delete_markdown_artifact(md_ref: str | None) -> None:
    if not md_ref:
        return
    if is_local_reference(md_ref):
        delete_temp_file(md_ref)
        return
    try:
        delete_file(md_ref)
    except Exception:
        pass


def _sync_finished_job_result(ocr_job: OcrJob, result: dict, db) -> None:
    if ocr_job.status == "completed":
        return

    ocr_job.status = "completed"
    if result.get("md_r2_key"):
        ocr_job.md_r2_key = result.get("md_r2_key")
    if result.get("pages") is not None:
        ocr_job.pages = result.get("pages")
    if result.get("content_hash"):
        ocr_job.content_hash = result.get("content_hash")
    db.commit()


def _current_pipeline_version() -> str:
    return settings.OCR_PIPELINE_VERSION.strip() or "v2"

def _validate_xlsx_content(file_bytes: bytes) -> None:
    """Verify .xlsx has expected OOXML internal structure, not just ZIP magic."""
    import zipfile
    import io

    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
            names = zf.namelist()
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="File is not a valid ZIP archive — expected .xlsx")

    has_xl = any(n.startswith("xl/") for n in names)
    has_content_types = "[Content_Types].xml" in names
    if not (has_xl and has_content_types):
        raise HTTPException(
            status_code=400,
            detail="ZIP content does not match OOXML structure — expected .xlsx (got .docx, .pptx, or other ZIP?)",
        )


def _decode_csv_text(file_bytes: bytes) -> str:
    """Decode CSV bytes to string with BOM / encoding detection. Always returns str."""
    if file_bytes[:3] == b"\xef\xbb\xbf":
        return file_bytes[3:].decode("utf-8")
    if file_bytes[:2] == b"\xff\xfe":
        return file_bytes[2:].decode("utf-16-le")
    if file_bytes[:2] == b"\xfe\xff":
        return file_bytes[2:].decode("utf-16-be")

    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        pass

    try:
        return file_bytes.decode("windows-1258")
    except UnicodeDecodeError:
        pass

    return file_bytes.decode("latin-1")


def _validate_csv_content(file_bytes: bytes, filename: str) -> None:
    """Validate that a CSV file contains parseable text content, not binary or scripts."""
    import csv
    import io

    text = _decode_csv_text(file_bytes)

    if not text.strip():
        raise HTTPException(status_code=400, detail="CSV file is empty")

    # Reject content that looks like a script or binary garbage
    first_line = text.lstrip()
    if first_line.startswith("#!") or first_line.startswith("<?xml") or first_line.startswith("<html"):
        raise HTTPException(status_code=400, detail=f"File content does not appear to be CSV: .{filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'csv'}")

    # Verify parseable as CSV (at minimum one valid row).
    # Sniff from a larger 64 KB sample so files with long header rows
    # still get correct dialect detection.
    try:
        sample = text[:65536] if len(text) > 1 else "a,b"
        dialect = csv.Sniffer().sniff(sample)
        reader = csv.reader(io.StringIO(text), dialect)
        first_row = next(reader, None)
        if first_row is None or all(not cell.strip() for cell in first_row):
            raise HTTPException(status_code=400, detail="CSV file has no readable content")
    except csv.Error as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing failed: {str(e)}")


def validate_file_magic(file_bytes: bytes, filename: str) -> None:
    suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: .{suffix}")

    if suffix == "csv":
        _validate_csv_content(file_bytes, filename)
        return

    # .xlsx shares ZIP magic with .docx/.pptx — check internal structure too
    if suffix in {"xlsx", "xls"}:
        magic = MAGIC_NUMBERS.get(suffix)
        if magic and file_bytes[: len(magic)] != magic:
            raise HTTPException(status_code=400, detail=f"File content does not match extension: expected .{suffix}")
        if suffix == "xlsx":
            _validate_xlsx_content(file_bytes)
        return

    magic = MAGIC_NUMBERS.get(suffix)
    if magic and file_bytes[: len(magic)] != magic:
        raise HTTPException(status_code=400, detail=f"File content does not match extension: expected .{suffix}")


def _build_job_status(
    ocr_job: OcrJob,
    *,
    status: str | None = None,
    result: dict | None = None,
    meta: dict | None = None,
    error_message: str | None = None,
) -> OcrJobStatus:
    result = result or {}
    meta = meta or {}
    return OcrJobStatus(
        job_id=str(ocr_job.id),
        status=status or ocr_job.status or "queued",
        original_filename=ocr_job.original_filename,
        title=ocr_job.title,
        year=ocr_job.year,
        version_start=ocr_job.version_start,
        category=ocr_job.category,
        progress=meta.get("progress"),
        stage=meta.get("stage"),
        suggested_category=ocr_job.suggested_category or result.get("suggested_category"),
        md_r2_key=ocr_job.md_r2_key or result.get("md_r2_key"),
        pages=ocr_job.pages if ocr_job.pages is not None else result.get("pages"),
        error_message=error_message or ocr_job.error_message or result.get("error_message"),
        sent_to_kb=ocr_job.sent_to_kb,
    )


def _build_job_response(ocr_job: OcrJob, reused: bool = False, duplicate_of_job_id: str | None = None) -> OcrJobResponse:
    return OcrJobResponse(
        job_id=str(ocr_job.id),
        status=ocr_job.status,
        original_filename=ocr_job.original_filename,
        title=ocr_job.title,
        year=ocr_job.year,
        version_start=ocr_job.version_start,
        category=ocr_job.category,
        suggested_category=ocr_job.suggested_category,
        md_r2_key=ocr_job.md_r2_key,
        pages=ocr_job.pages,
        error_message=ocr_job.error_message,
        reused=reused,
        duplicate_of_job_id=duplicate_of_job_id,
    )


@router.post("/jobs", response_model=OcrJobResponse, status_code=201)
async def create_ocr_job(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    year: int | None = Form(default=None),
    version_start: int = Form(default=1),
    category: AdmissionCategory = Form(...),
    user: dict = Depends(admin_or_counselor),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")

    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB")
    if not file_bytes:
        raise HTTPException(status_code=400, detail="File is empty")

    validate_file_magic(file_bytes, file.filename)
    source_file_hash = hashlib.sha256(file_bytes).hexdigest()
    pipeline_version = _current_pipeline_version()

    source_ref: str | None = None
    db = session.SessionLocal()
    try:
        existing_job = (
            db.query(OcrJob)
            .filter(OcrJob.source_file_hash == source_file_hash)
            .filter(OcrJob.pipeline_version == pipeline_version)
            .filter(OcrJob.status.in_(["queued", "started", "deferred", "completed"]))
            .order_by(OcrJob.created_at.desc())
            .first()
        )
        if existing_job is not None:
            if _job_can_be_reused(existing_job):
                return _build_job_response(existing_job, reused=True, duplicate_of_job_id=str(existing_job.id))
            existing_job.status = "failed"
            existing_job.error_message = "OCR artifact no longer exists in storage"
            db.commit()

        job_id = uuid.uuid4().hex
        source_ref = _persist_source_file(
            job_id=job_id,
            file_bytes=file_bytes,
            filename=file.filename,
            content_type=file.content_type,
        )
        ocr_job = OcrJob(
            id=uuid.UUID(job_id),
            rq_job_id=job_id,
            original_filename=file.filename,
            source_file_hash=source_file_hash,
            pipeline_version=pipeline_version,
            source_r2_key=source_ref,
            status="queued",
            title=title,
            year=year,
            version_start=version_start,
            category=category,
        )
        db.add(ocr_job)
        db.commit()

        queue = get_default_queue()
        rq_job = queue.enqueue(
            "src.services.ocr_service.process_ocr_job",
            job_id,
            source_r2_key=source_ref,
            original_filename=file.filename,
            pipeline_version=pipeline_version,
            job_timeout=settings.RQ_JOB_TIMEOUT,
        )
        ocr_job.rq_job_id = rq_job.id
        db.commit()
        return OcrJobResponse(
            job_id=job_id,
            status="queued",
            original_filename=file.filename,
            title=title,
            year=year,
            version_start=version_start,
            category=category,
        )
    except Exception as exc:
        db.rollback()
        _delete_source_artifact(source_ref)
        raise HTTPException(status_code=500, detail=f"Failed to create OCR job: {str(exc)}")
    finally:
        db.close()


@router.get("/jobs/{job_id}", response_model=OcrJobStatus)
def get_ocr_job_status(
    job_id: str,
    user: dict = Depends(admin_or_counselor),
):
    db = session.SessionLocal()
    try:
        ocr_job = db.query(OcrJob).filter(OcrJob.id == uuid.UUID(job_id)).first()
        if ocr_job is None:
            raise HTTPException(status_code=404, detail="Job not found")

        queue = get_default_queue()
        rq_job = queue.fetch_job(ocr_job.rq_job_id) if ocr_job.rq_job_id else None

        if rq_job and rq_job.is_finished:
            result = rq_job.return_value() or {}
            _sync_finished_job_result(ocr_job, result, db)
            return _build_job_status(ocr_job, status="completed", result=result)

        if rq_job and rq_job.is_failed:
            ocr_job.status = "failed"
            ocr_job.error_message = rq_job.exc_info or "Job failed"
            db.commit()
            return _build_job_status(ocr_job, status="failed", error_message=ocr_job.error_message)

        meta = rq_job.meta if rq_job else {}
        if rq_job and rq_job.get_status() != ocr_job.status:
            ocr_job.status = rq_job.get_status() or "queued"
            db.commit()

        return _build_job_status(ocr_job, meta=meta)
    finally:
        db.close()


@router.get("/jobs/{job_id}/download", response_model=OcrDownloadResponse)
def get_ocr_download(
    job_id: str,
    user: dict = Depends(admin_or_counselor),
):
    db = session.SessionLocal()
    try:
        ocr_job = db.query(OcrJob).filter(OcrJob.id == uuid.UUID(job_id)).first()
        if ocr_job is None:
            raise HTTPException(status_code=404, detail="Job not found")

        if ocr_job.status != "completed":
            raise HTTPException(status_code=400, detail="Job not completed yet")

        md_ref = ocr_job.md_r2_key
        if not md_ref:
            raise HTTPException(status_code=404, detail="No output file found")

        if is_local_reference(md_ref):
            return OcrDownloadResponse(url=f"/api/ocr-quick/jobs/{job_id}/content")
        return OcrDownloadResponse(url=generate_presigned_url(md_ref))
    finally:
        db.close()


@router.get("/jobs/{job_id}/content")
def get_ocr_job_content(
    job_id: str,
    user: dict = Depends(admin_or_counselor),
):
    db = session.SessionLocal()
    try:
        ocr_job = db.query(OcrJob).filter(OcrJob.id == uuid.UUID(job_id)).first()
        if ocr_job is None:
            raise HTTPException(status_code=404, detail="Job not found")

        md_ref = ocr_job.md_r2_key

        if not md_ref:
            raise HTTPException(status_code=404, detail="No output content found")

        content = _read_markdown_content(md_ref)

        return Response(content=content, media_type="text/markdown; charset=utf-8")
    finally:
        db.close()


@router.put("/jobs/{job_id}/content", response_model=OcrJobResponse)
def update_ocr_job_content(
    job_id: str,
    data: OcrContentUpdateRequest,
    user: dict = Depends(admin_or_counselor),
):
    db = session.SessionLocal()
    try:
        ocr_job = db.query(OcrJob).filter(OcrJob.id == uuid.UUID(job_id)).first()
        if ocr_job is None:
            raise HTTPException(status_code=404, detail="Job not found")
        if ocr_job.status != "completed":
            raise HTTPException(status_code=400, detail="Only completed jobs can be edited")
        if ocr_job.sent_to_kb:
            raise HTTPException(status_code=400, detail="Job has already been sent to KB")

        md_content = data.content.replace("\r\n", "\n").replace("\r", "\n")
        if not md_content.strip():
            raise HTTPException(status_code=400, detail="Markdown content cannot be empty")

        old_md_ref = ocr_job.md_r2_key
        from src.services.ocr_service import persist_markdown_artifact

        persisted_markdown = persist_markdown_artifact(job_id=str(ocr_job.id), md_content=md_content)
        ocr_job.md_r2_key = persisted_markdown["key"]
        ocr_job.content_hash = hashlib.sha256(md_content.encode("utf-8")).hexdigest()
        db.commit()

        if old_md_ref and old_md_ref != ocr_job.md_r2_key:
            _delete_markdown_artifact(old_md_ref)

        return _build_job_response(ocr_job)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update OCR markdown: {str(exc)}")
    finally:
        db.close()


@router.get("/health")
def ocr_queue_health(user: dict = Depends(admin_or_counselor)):
    """Check if RQ worker is alive and processing OCR jobs."""
    from rq.worker import Worker

    queue = get_default_queue()
    worker_count = Worker.count(queue=queue)
    queued = len(queue)
    return {
        "worker_count": worker_count,
        "queued_jobs": queued,
        "healthy": worker_count > 0,
        "warning": "No RQ worker running — OCR jobs will stay queued forever" if worker_count == 0 else None,
    }


@router.get("/jobs", response_model=OcrJobListResponse)
def list_ocr_jobs(
    page: int = 1,
    page_size: int = 50,
    user: dict = Depends(admin_or_counselor),
):
    db = session.SessionLocal()
    try:
        total = db.query(OcrJob).count()
        pages = (total + page_size - 1) // page_size if total > 0 else 0
        start = (page - 1) * page_size
        ocr_jobs = db.query(OcrJob).order_by(OcrJob.created_at.desc()).offset(start).limit(page_size).all()

        queue = get_default_queue()
        jobs: list[OcrJobStatus] = []
        for ocr_job in ocr_jobs:
            rq_job = queue.fetch_job(ocr_job.rq_job_id) if ocr_job.status not in ["completed", "failed"] else None

            if rq_job and rq_job.is_finished:
                result = rq_job.return_value() or {}
                _sync_finished_job_result(ocr_job, result, db)
                jobs.append(_build_job_status(ocr_job, status="completed", result=result))
            elif rq_job and rq_job.is_failed:
                ocr_job.status = "failed"
                ocr_job.error_message = rq_job.exc_info or "Job failed"
                db.commit()
                jobs.append(_build_job_status(ocr_job, status="failed", error_message=ocr_job.error_message))
            else:
                jobs.append(_build_job_status(ocr_job, meta=rq_job.meta if rq_job else {}))

        return OcrJobListResponse(jobs=jobs, total=total, page=page, page_size=page_size, pages=pages)
    finally:
        db.close()


@router.post("/jobs/{job_id}/retry", response_model=OcrJobResponse)
def retry_ocr_job(
    job_id: str,
    user: dict = Depends(admin_or_counselor),
):
    db = session.SessionLocal()
    try:
        ocr_job = db.query(OcrJob).filter(OcrJob.id == uuid.UUID(job_id)).first()
        if ocr_job is None:
            raise HTTPException(status_code=404, detail="Job not found")

        queue = get_default_queue()
        original_job = queue.fetch_job(ocr_job.rq_job_id) if ocr_job.rq_job_id else None
        if ocr_job.status != "failed" and (original_job is None or not original_job.is_failed):
            raise HTTPException(status_code=400, detail="Only failed jobs can be retried")
        if not _source_file_exists(ocr_job.source_r2_key):
            raise HTTPException(status_code=400, detail="Source file no longer exists in storage")

        new_job_id = uuid.uuid4().hex
        new_source_ref = ocr_job.source_r2_key
        if is_local_reference(new_source_ref):
            source_bytes = resolve_local_reference(new_source_ref).read_bytes()
            new_source_ref = _persist_source_file(
                job_id=new_job_id,
                file_bytes=source_bytes,
                filename=ocr_job.original_filename or f"{new_job_id}.bin",
                content_type=None,
            )

        new_ocr_job = OcrJob(
            id=uuid.UUID(new_job_id),
            rq_job_id=new_job_id,
            original_filename=ocr_job.original_filename,
            source_file_hash=ocr_job.source_file_hash,
            content_hash=ocr_job.content_hash,
            pipeline_version=ocr_job.pipeline_version,
            source_r2_key=new_source_ref,
            status="queued",
            title=ocr_job.title,
            year=ocr_job.year,
            version_start=ocr_job.version_start,
            category=ocr_job.category,
        )
        db.add(new_ocr_job)
        db.commit()

        rq_job = queue.enqueue(
            original_job.func_name if original_job else "src.services.ocr_service.process_ocr_job",
            new_job_id,
            source_r2_key=new_source_ref,
            original_filename=ocr_job.original_filename,
            pipeline_version=ocr_job.pipeline_version,
            job_timeout=settings.RQ_JOB_TIMEOUT,
        )
        new_ocr_job.rq_job_id = rq_job.id
        db.commit()
        return OcrJobResponse(
            job_id=new_job_id,
            status="queued",
            original_filename=ocr_job.original_filename,
            title=ocr_job.title,
            year=ocr_job.year,
            version_start=ocr_job.version_start,
            category=ocr_job.category,
        )
    finally:
        db.close()


@router.delete("/jobs/{job_id}", status_code=204)
def delete_ocr_job(
    job_id: str,
    user: dict = Depends(admin_or_counselor),
):
    db = session.SessionLocal()
    try:
        ocr_job = db.query(OcrJob).filter(OcrJob.id == uuid.UUID(job_id)).first()
        if ocr_job is None:
            raise HTTPException(status_code=404, detail="Job not found")

        queue = get_default_queue()
        if ocr_job.rq_job_id:
            try:
                rq_job = queue.fetch_job(ocr_job.rq_job_id)
                if rq_job and not rq_job.is_finished:
                    rq_job.cancel()
            except Exception:
                pass

        _delete_source_artifact(ocr_job.source_r2_key)
        _delete_markdown_artifact(ocr_job.md_r2_key)
        db.delete(ocr_job)
        db.commit()
    finally:
        db.close()


@router.post("/jobs/{job_id}/send-to-kb", response_model=OcrJobResponse)
def send_ocr_to_knowledge_base(
    job_id: str,
    data: SendToKbRequest,
    user: dict = Depends(admin_or_counselor),
):
    db = session.SessionLocal()
    try:
        ocr_job = db.query(OcrJob).filter(OcrJob.id == uuid.UUID(job_id)).first()
        if ocr_job is None:
            raise HTTPException(status_code=404, detail="Job not found")
        if ocr_job.status != "completed":
            raise HTTPException(status_code=400, detail="Only completed jobs can be sent to KB")
        if not ocr_job.md_r2_key:
            raise HTTPException(status_code=400, detail="Job markdown not found")

        md_content = _read_markdown_content(ocr_job.md_r2_key)
        if not md_content.strip():
            raise HTTPException(status_code=400, detail="Job markdown is empty")

        content_hash = hashlib.sha256(md_content.encode("utf-8")).hexdigest()

        if ocr_job.sent_to_kb:
            return _build_job_response(ocr_job, reused=True)

        existing_sent = db.query(OcrJob).filter(
            OcrJob.content_hash == content_hash,
            OcrJob.sent_to_kb.isnot(None),
            OcrJob.id != ocr_job.id,
        ).first()
        if existing_sent:
            ocr_job.content_hash = content_hash
            ocr_job.sent_to_kb = existing_sent.sent_to_kb
            db.commit()
            return _build_job_response(ocr_job, reused=True)

        from src.services.knowledge_chunk_service import upload_file_to_chunks

        category = data.category
        if category is None:
            try:
                category = AdmissionCategory(ocr_job.category)
            except (TypeError, ValueError):
                raise HTTPException(status_code=400, detail="Category is required")

        md_bytes = md_content.encode("utf-8")
        file_name = f"{ocr_job.title or 'OCR-' + job_id[:8]}.md"

        kb_result = upload_file_to_chunks(
            file_name=file_name,
            file_bytes=md_bytes,
            content_type="text/markdown",
            title=ocr_job.title or f"OCR-{job_id[:8]}",
            category=category,
            year=ocr_job.year,
            version_start=ocr_job.version_start or 1,
            chunk_size=data.chunk_size,
            chunk_overlap=data.chunk_overlap,
            db=db,
        )

        ocr_job.content_hash = content_hash
        created_ids = kb_result.get("created_ids") or []
        ocr_job.sent_to_kb = str(created_ids[0]) if created_ids else None
        try:
            db.commit()
        except Exception:
            db.rollback()
            # Clean up orphaned KB chunks that were created but not linked
            from src.models.knowledge_chunk import KnowledgeChunk
            try:
                db.query(KnowledgeChunk).filter(KnowledgeChunk.id.in_(created_ids)).delete(synchronize_session=False)
                db.commit()
            except Exception:
                db.rollback()
            raise HTTPException(status_code=500, detail="Failed to save KB link — orphaned chunks cleaned up")
        return _build_job_response(ocr_job)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to send to KB: {str(exc)}")
    finally:
        db.close()
