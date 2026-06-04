import hashlib
import uuid

from src.core.config import settings
from src.integrations.document_parser_client import DocumentParserClient
from src.services.ocr_smart_extractor import (
    DocumentAnalyzer,
    ExtractionRouter,
    ExtractionStrategy,
    FastTextExtractor,
)
from src.services.ocr_temp_storage import delete_temp_file, is_local_reference, read_bytes
from src.services.r2_service import delete_file, download_file_bytes, upload_file_bytes


OCR_OUTPUT_FOLDER = "ocr-output"


def _normalize_markdown_fences(text: str) -> str:
    """Strip leading/trailing markdown fences from parser output."""
    lines = text.split("\n")
    if lines and lines[0].strip().startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip().startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _update_job_progress(progress: int, stage: str) -> None:
    try:
        from rq import get_current_job

        job = get_current_job()
        if job:
            job.meta["progress"] = progress
            job.meta["stage"] = stage
            job.save_meta()
    except Exception:
        pass


def _current_pipeline_version() -> str:
    return settings.OCR_PIPELINE_VERSION.strip() or "v2"


def _build_content_hash(md_content: str) -> str:
    return hashlib.sha256(md_content.encode("utf-8")).hexdigest()


def build_markdown_artifact_key(job_id: str) -> str:
    return f"{OCR_OUTPUT_FOLDER}/{job_id}.md"


def _read_source_bytes(source_ref: str) -> bytes:
    if is_local_reference(source_ref):
        return read_bytes(source_ref)
    return download_file_bytes(source_ref)


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


def _has_remote_parser_config() -> bool:
    api_key = settings.OCR_PARSE_API_KEY.strip()
    base_url = settings.OCR_PARSE_API_BASE_URL.strip()
    placeholder_tokens = ("your-", "key_", "key-", "provider-key", "base-url-parser")

    if not api_key or not base_url:
        return False
    return not any(token in api_key.lower() or token in base_url.lower() for token in placeholder_tokens)


def _extract_with_openai_vision_fallback(
    file_bytes: bytes,
    file_name: str,
    *,
    reason: str,
    analysis=None,
) -> tuple[str, dict, int]:
    if not settings.OPENAI_API_KEY:
        raise Exception(f"{reason}; OpenAI fallback is not configured")

    router = ExtractionRouter(force_strategy=ExtractionStrategy.VISION_API)
    markdown, fallback_analysis = router.extract(file_bytes, file_name)
    active_analysis = analysis or fallback_analysis

    extraction_info = {
        "strategy": "openai_vision_fallback",
        "provider": "openai_vision",
        "source_filename": file_name,
        "fallback_reason": reason,
        "analysis_reason": active_analysis.strategy_reason,
        "total_pages": active_analysis.total_pages,
        "scanned_pages": active_analysis.scanned_pages,
        "text_pages": active_analysis.text_pages,
        "mixed_pages": active_analysis.mixed_pages,
        "avg_chars_per_page": round(active_analysis.avg_chars_per_page, 2),
        "has_formulas": active_analysis.has_formulas,
    }
    return markdown, extraction_info, active_analysis.total_pages


def _extract_with_local_first(file_bytes: bytes, file_name: str) -> tuple[str, dict, int]:
    analyzer = DocumentAnalyzer()
    analysis = analyzer.analyze(file_bytes, file_name)

    extraction_info = {
        "strategy": analysis.recommended_strategy.value,
        "provider": "local_pymupdf" if analysis.recommended_strategy == ExtractionStrategy.FAST_TEXT else "remote_parser",
        "source_filename": file_name,
        "analysis_reason": analysis.strategy_reason,
        "total_pages": analysis.total_pages,
        "scanned_pages": analysis.scanned_pages,
        "text_pages": analysis.text_pages,
        "mixed_pages": analysis.mixed_pages,
        "avg_chars_per_page": round(analysis.avg_chars_per_page, 2),
        "has_formulas": analysis.has_formulas,
    }

    if analysis.recommended_strategy == ExtractionStrategy.FAST_TEXT:
        markdown = FastTextExtractor().extract(file_bytes, file_name)
        if settings.ENABLE_VISION_FALLBACK and len(markdown.strip()) < 200:
            extraction_info["fallback_trigger"] = "low_local_text_yield"
        else:
            return markdown, extraction_info, analysis.total_pages

    if analysis.recommended_strategy == ExtractionStrategy.FAST_TEXT:
        extraction_info["strategy"] = "fast_text_with_remote_fallback"
        extraction_info["provider"] = "remote_parser"

    try:
        if not _has_remote_parser_config():
            raise Exception("Remote parser is not configured")
        parser = DocumentParserClient()
        parse_result = parser.parse_bytes(file_bytes=file_bytes, file_name=file_name)
        markdown = _normalize_markdown_fences(parse_result.markdown)
        extraction_info["provider"] = "remote_parser"
        if parse_result.raw_status:
            extraction_info["parser_status"] = parse_result.raw_status
        if parse_result.metadata:
            extraction_info["parser_metadata"] = parse_result.metadata
        return markdown, extraction_info, parse_result.page_count or analysis.total_pages
    except Exception as exc:
        if not settings.ENABLE_VISION_FALLBACK:
            raise
        return _extract_with_openai_vision_fallback(
            file_bytes,
            file_name,
            reason=f"Remote parser failed: {str(exc)[:300]}",
            analysis=analysis,
        )


EXCEL_EXTENSIONS = {".xlsx", ".xls", ".csv"}


def _is_excel_file(file_name: str) -> bool:
    suffix = file_name.lower().rsplit(".", 1)[-1] if "." in file_name else ""
    return f".{suffix}" in EXCEL_EXTENSIONS


def _extract_excel(file_bytes: bytes, file_name: str) -> tuple[str, dict, int]:
    from src.services.ocr_excel_extractor import ExcelExtractor

    extractor = ExcelExtractor()
    md_content, meta = extractor.extract(file_bytes, file_name)
    extraction_info = {
        "strategy": "excel",
        "provider": "local_excel_extractor",
        "source_filename": file_name,
        "sheet_count": meta.get("sheet_count", 0),
        "sheets": meta.get("sheets", []),
    }
    return md_content, extraction_info, meta.get("sheet_count", 1)


def _extract_with_remote_parser(file_bytes: bytes, file_name: str) -> tuple[str, dict, int]:
    try:
        if not _has_remote_parser_config():
            raise Exception("Remote parser is not configured")
        parser = DocumentParserClient()
        parse_result = parser.parse_bytes(file_bytes=file_bytes, file_name=file_name)
        md_content = _normalize_markdown_fences(parse_result.markdown)
        extraction_info = {
            "strategy": "remote_markdown_parser",
            "provider": "remote_parser",
            "source_filename": file_name,
        }
        if parse_result.page_count is not None:
            extraction_info["total_pages"] = parse_result.page_count
        if parse_result.raw_status:
            extraction_info["parser_status"] = parse_result.raw_status
        if parse_result.metadata:
            extraction_info["parser_metadata"] = parse_result.metadata
        return md_content, extraction_info, parse_result.page_count or 0
    except Exception as exc:
        if not settings.ENABLE_VISION_FALLBACK:
            raise
        return _extract_with_openai_vision_fallback(
            file_bytes,
            file_name,
            reason=f"Remote parser failed: {str(exc)[:300]}",
        )


def _save_job_result(
    *,
    job_id: str,
    status: str,
    md_r2_key: str | None = None,
    suggested_category: dict | None = None,
    pages: int | None = None,
    content_hash: str | None = None,
    error_message: str | None = None,
) -> None:
    from src.db import session
    from src.models.ocr_job import OcrJob

    db = session.SessionLocal()
    try:
        ocr_job = db.query(OcrJob).filter(OcrJob.id == uuid.UUID(job_id)).first()
        if ocr_job is None:
            return
        ocr_job.status = status
        if md_r2_key is not None:
            ocr_job.md_r2_key = md_r2_key
        if suggested_category is not None:
            ocr_job.suggested_category = suggested_category
        if pages is not None:
            ocr_job.pages = pages
        if content_hash is not None:
            ocr_job.content_hash = content_hash
        if error_message is not None:
            ocr_job.error_message = error_message
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def process_ocr_job(
    job_id: str,
    source_r2_key: str | None = None,
    original_filename: str | None = None,
    use_smart_extraction: bool | None = None,
    pipeline_version: str | None = None,
):
    _update_job_progress(0, "Starting...")

    if not source_r2_key:
        raise Exception("source_r2_key is required")

    try:
        _update_job_progress(5, "Loading source file...")
        file_bytes = _read_source_bytes(source_r2_key)
    except Exception as exc:
        raise Exception(f"Failed to load source file: {str(exc)}")

    file_name = original_filename or source_r2_key.split("/")[-1]
    active_pipeline_version = pipeline_version or _current_pipeline_version()

    should_use_smart_extraction = settings.USE_SMART_EXTRACTION if use_smart_extraction is None else use_smart_extraction

    _update_job_progress(15, "Routing extraction strategy...")
    if _is_excel_file(file_name):
        _update_job_progress(35, "Extracting Excel to markdown...")
        md_content, extraction_info, page_count = _extract_excel(file_bytes, file_name)
    elif should_use_smart_extraction and file_name.lower().endswith(".pdf"):
        _update_job_progress(35, "Extracting markdown with local-first routing...")
        md_content, extraction_info, page_count = _extract_with_local_first(file_bytes, file_name)
    else:
        _update_job_progress(35, "Extracting markdown with remote parser...")
        md_content, extraction_info, page_count = _extract_with_remote_parser(file_bytes, file_name)
    extraction_info["pipeline_version"] = active_pipeline_version

    _update_job_progress(70, "Processing results...")
    content_hash = _build_content_hash(md_content)

    _update_job_progress(85, "Saving markdown artifact...")
    persisted_markdown = persist_markdown_artifact(job_id=job_id, md_content=md_content)
    md_r2_key = persisted_markdown["key"]

    result = {
        "md_r2_key": md_r2_key,
        "pages": page_count,
        "content_hash": content_hash,
        "extraction_info": extraction_info,
    }

    _save_job_result(
        job_id=job_id,
        status="completed",
        md_r2_key=md_r2_key,
        pages=page_count,
        content_hash=content_hash,
    )

    _delete_source_artifact(source_r2_key)
    _update_job_progress(100, "Done!")
    return result


def persist_markdown_artifact(*, job_id: str, md_content: str) -> dict:
    md_bytes = md_content.encode("utf-8")
    return upload_file_bytes(
        file_bytes=md_bytes,
        file_name=f"{job_id}.md",
        folder=OCR_OUTPUT_FOLDER,
        content_type="text/markdown; charset=utf-8",
        object_key=build_markdown_artifact_key(job_id),
    )
