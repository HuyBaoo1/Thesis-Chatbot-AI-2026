import json
import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from src.core.config import settings
from src.services.ingestion_governance import (
    ReviewStatus,
    normalize_field_status,
    normalize_review_status,
)
from src.services.vgu_source_registry_service import (
    canonicalize_url,
    get_source_entry,
    is_official_vgu_url,
)

MIN_MARKDOWN_CHARS = 80
SENSITIVE_FIELDS = (
    "tuition",
    "scholarship",
    "deadline",
    "quota",
    "english requirement",
    "entry requirement",
    "required document",
    "intake",
    "contact",
)


def save_successful_crawl_artifacts(
    *,
    source_url: str,
    title: str | None,
    markdown: str,
    crawl_session_id: str,
    page_job_id: str,
    page_index: int,
    firecrawl_metadata: dict[str, Any] | None = None,
) -> dict[str, str] | None:
    if not settings.VGU_AUTO_SAVE_RAW:
        return None

    clean_markdown = _normalize_markdown(markdown)
    _validate_markdown_snapshot(clean_markdown)

    raw_path = save_raw_snapshot(
        source_url=source_url,
        title=title,
        markdown=clean_markdown,
        crawl_session_id=crawl_session_id,
        page_job_id=page_job_id,
        page_index=page_index,
        firecrawl_metadata=firecrawl_metadata or {},
    )
    result = {"raw_file": _repo_style_path(raw_path)}

    if settings.VGU_AUTO_CREATE_REVIEW_DRAFT:
        draft_path = create_review_draft(
            raw_path=raw_path,
            source_url=source_url,
            title=title,
            markdown=clean_markdown,
            crawl_session_id=crawl_session_id,
            page_job_id=page_job_id,
            page_index=page_index,
        )
        append_field_review_stub(
            source_url=source_url,
            title=title,
            reviewed_file=draft_path,
            raw_file=raw_path,
        )
        result["reviewed_file"] = _repo_style_path(draft_path)

    return result


def save_raw_snapshot(
    *,
    source_url: str,
    title: str | None,
    markdown: str,
    crawl_session_id: str,
    page_job_id: str,
    page_index: int,
    firecrawl_metadata: dict[str, Any],
) -> Path:
    source_entry = get_source_entry(source_url)
    canonical_url = canonicalize_url(source_url)
    raw_content_hash = _sha256_text(markdown)
    raw_dir = Path(settings.VGU_RAW_CRAWL_DIR)
    raw_dir.mkdir(parents=True, exist_ok=True)
    path = _unique_path(
        raw_dir,
        f"{source_entry.raw_filename_prefix}_{page_job_id[:8]}_raw.md",
    )
    body = _build_raw_markdown(
        source_url=source_url,
        canonical_url=canonical_url,
        title=title,
        markdown=markdown,
        crawl_session_id=crawl_session_id,
        page_job_id=page_job_id,
        page_index=page_index,
        firecrawl_metadata=firecrawl_metadata,
        raw_content_hash=raw_content_hash,
        canonical_slug=source_entry.canonical_slug,
        source_scope=source_entry.source_scope,
        expected_effective_context=source_entry.expected_effective_context,
    )
    _write_text_atomic(path, body)
    _append_json_manifest(
        raw_dir / "raw_crawl_manifest.json",
        {
            "source_url": source_url,
            "canonical_url": canonical_url,
            "provider_page_title": title or "",
            "document_title": source_entry.document_title,
            "canonical_slug": source_entry.canonical_slug,
            "source_scope": source_entry.source_scope,
            "expected_effective_context": source_entry.expected_effective_context,
            "raw_content_hash": raw_content_hash,
            "raw_file": _repo_style_path(path),
            "crawl_session_id": crawl_session_id,
            "page_job_id": page_job_id,
            "page_index": page_index,
            "review_status": ReviewStatus.REVIEW_REQUIRED.value,
            "diagnostic_only": True,
            "promotion_allowed": False,
            "created_at": _now_iso(),
            "firecrawl_proxy": firecrawl_metadata.get("firecrawl_proxy"),
            "firecrawl_attempt": firecrawl_metadata.get("firecrawl_attempt"),
        },
    )
    return path


def create_review_draft(
    *,
    raw_path: Path,
    source_url: str,
    title: str | None,
    markdown: str,
    crawl_session_id: str,
    page_job_id: str,
    page_index: int,
) -> Path:
    source_entry = get_source_entry(source_url)
    reviewed_dir = Path(settings.VGU_REVIEWED_CRAWL_DIR)
    reviewed_dir.mkdir(parents=True, exist_ok=True)
    path = _unique_path(
        reviewed_dir,
        f"{source_entry.reviewed_filename_prefix}_{page_job_id[:8]}_review_required.md",
    )
    body = _build_review_draft_markdown(
        source_url=source_url,
        title=title,
        raw_path=raw_path,
        markdown=_strip_repeated_page_chrome(markdown),
        crawl_session_id=crawl_session_id,
        page_job_id=page_job_id,
        canonical_slug=source_entry.canonical_slug,
        source_scope=source_entry.source_scope,
        expected_effective_context=source_entry.expected_effective_context,
    )
    _write_text_atomic(path, body)
    _update_raw_manifest_entry(
        Path(settings.VGU_RAW_CRAWL_DIR) / "raw_crawl_manifest.json",
        raw_file=raw_path,
        updates={
            "reviewed_file": _repo_style_path(path),
            "reviewed_content_hash": _sha256_text(body),
        },
    )
    return path


def promote_reviewed_document(
    reviewed_path: str | Path,
    *,
    import_dir: str | Path | None = None,
    target_name: str | None = None,
    sources_manifest_path: str | Path | None = None,
    raw_manifest_path: str | Path | None = None,
) -> dict[str, str]:
    source_path = Path(reviewed_path)
    content = source_path.read_text(encoding="utf-8")
    lineage = _load_review_lineage(source_path, raw_manifest_path=raw_manifest_path)
    source_entry = _validate_promotable_markdown(content, lineage=lineage)

    destination_dir = Path(import_dir or settings.VGU_IMPORT_DIR)
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination_name = target_name or source_entry.import_filename or _promotion_file_name(source_path.name)
    destination_path = destination_dir / destination_name

    if destination_path.exists() and destination_path.read_text(encoding="utf-8") != content:
        raise FileExistsError(f"Import file already exists with different content: {destination_path}")

    _write_text_atomic(destination_path, content)
    manifest_path = Path(sources_manifest_path or destination_dir / "crawl_sources.json")
    update_crawl_sources_manifest(
        manifest_path,
        reviewed_file=source_path,
        import_file=destination_path,
        content=content,
    )
    return {
        "reviewed_file": _repo_style_path(source_path),
        "import_file": _repo_style_path(destination_path),
        "status": "verified_promoted",
        "canonical_slug": source_entry.canonical_slug,
    }


def update_crawl_sources_manifest(
    manifest_path: str | Path,
    *,
    reviewed_file: Path,
    import_file: Path,
    content: str,
) -> None:
    manifest = _read_json_manifest(Path(manifest_path))
    sources = manifest.setdefault("sources", [])
    source_url = _extract_review_field(content, "Primary source URL") or "DATA_REQUIRED"
    entry = next((item for item in sources if item.get("url") == source_url), None)
    if entry is None:
        entry = {"url": source_url}
        sources.append(entry)
    entry.update(
        {
            "review_status": "verified",
            "reviewed_file": _repo_style_path(reviewed_file),
            "import_file": _repo_style_path(import_file),
            "kb_status": entry.get("kb_status") or "not_imported",
            "promoted_at": _now_iso(),
        }
    )
    _write_text_atomic(Path(manifest_path), json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


def append_field_review_stub(
    *,
    source_url: str,
    title: str | None,
    reviewed_file: Path,
    raw_file: Path,
) -> None:
    report_path = Path(settings.VGU_FIELD_REVIEW_REPORT_PATH)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    header = "# VGU Field Review Report\n"
    if report_path.exists():
        existing = report_path.read_text(encoding="utf-8")
    else:
        existing = header + "\n"

    reviewed_ref = _repo_style_path(reviewed_file)
    if reviewed_ref in existing:
        return

    section = (
        f"\n## {_safe_title(title or source_url)}\n\n"
        f"- Source URL: {source_url}\n"
        f"- Raw file: {_repo_style_path(raw_file)}\n"
        f"- Reviewed draft: {reviewed_ref}\n"
        f"- Review status: needs_review\n\n"
        "| Field | Extracted value | Official source | Effective date/intake | Match status | Action |\n"
        "|---|---|---|---|---|---|\n"
        "| Tuition | DATA_REQUIRED | DATA_REQUIRED | DATA_REQUIRED | REVIEW_REQUIRED | Human verification required before import. |\n"
        "| Scholarship | DATA_REQUIRED | DATA_REQUIRED | DATA_REQUIRED | REVIEW_REQUIRED | Human verification required before import. |\n"
        "| Deadline | DATA_REQUIRED | DATA_REQUIRED | DATA_REQUIRED | REVIEW_REQUIRED | Human verification required before import. |\n"
        "| Entry requirement | DATA_REQUIRED | DATA_REQUIRED | DATA_REQUIRED | REVIEW_REQUIRED | Human verification required before import. |\n"
        "| Contact | DATA_REQUIRED | DATA_REQUIRED | DATA_REQUIRED | REVIEW_REQUIRED | Human verification required before import. |\n"
    )
    _write_text_atomic(report_path, existing.rstrip() + "\n" + section)


def _build_raw_markdown(
    *,
    source_url: str,
    canonical_url: str,
    title: str | None,
    markdown: str,
    crawl_session_id: str,
    page_job_id: str,
    page_index: int,
    firecrawl_metadata: dict[str, Any],
    raw_content_hash: str,
    canonical_slug: str,
    source_scope: str,
    expected_effective_context: str,
) -> str:
    return (
        f"# Raw Firecrawl Snapshot - {_safe_title(title or source_url)}\n\n"
        "## Snapshot metadata\n\n"
        f"- Source URL: {source_url}\n"
        f"- Canonical URL: {canonical_url}\n"
        f"- Provider page title: {_safe_title(title or 'DATA_REQUIRED')}\n"
        f"- Canonical slug: {canonical_slug}\n"
        f"- Source scope: {source_scope}\n"
        f"- Expected effective context: {expected_effective_context}\n"
        f"- Crawl session ID: {crawl_session_id}\n"
        f"- Page job ID: {page_job_id}\n"
        f"- Page index: {page_index}\n"
        f"- Firecrawl proxy: {firecrawl_metadata.get('firecrawl_proxy') or 'DATA_REQUIRED'}\n"
        f"- Firecrawl attempt: {firecrawl_metadata.get('firecrawl_attempt') or 'DATA_REQUIRED'}\n"
        f"- Captured at: {_now_iso()}\n"
        f"- Raw content hash: {raw_content_hash}\n"
        f"- Review status: {ReviewStatus.REVIEW_REQUIRED.value}\n"
        "- Diagnostic only: true\n"
        "- Promotion allowed: false\n\n"
        "## Raw crawler content\n\n"
        f"{markdown.strip()}\n"
    )


def _build_review_draft_markdown(
    *,
    source_url: str,
    title: str | None,
    raw_path: Path,
    markdown: str,
    crawl_session_id: str,
    page_job_id: str,
    canonical_slug: str,
    source_scope: str,
    expected_effective_context: str,
) -> str:
    human_review = ", ".join(SENSITIVE_FIELDS)
    return (
        f"# {_safe_title(title or source_url)}\n\n"
        "## Verification record\n\n"
        f"- Primary source URL: {source_url}\n"
        f"- Canonical slug: {canonical_slug}\n"
        f"- Source scope: {source_scope}\n"
        f"- Expected effective context: {expected_effective_context}\n"
        "- HTTP status checked: DATA_REQUIRED\n"
        f"- Session ID: {crawl_session_id}\n"
        f"- Page job ID: {page_job_id}\n"
        f"- Source raw file: {_repo_style_path(raw_path)}\n"
        "- Program level: DATA_REQUIRED\n"
        "- Language: DATA_REQUIRED\n"
        "- Effective intake/year: DATA_REQUIRED\n"
        "- Reviewed by: DATA_REQUIRED\n"
        "- Reviewed at: DATA_REQUIRED\n"
        "- Approval method: DATA_REQUIRED\n"
        f"- Review status: {ReviewStatus.REVIEW_REQUIRED.value}\n"
        "- Diagnostic only: true\n"
        "- Promotion allowed: false\n"
        f"- Human review required: {human_review}.\n"
        "- Knowledge Base import status: not_imported\n\n"
        "## Field-level review checklist\n\n"
        "| Field | Extracted value | Official source | Effective date/intake | Match status | Action |\n"
        "|---|---|---|---|---|---|\n"
        "| Tuition | DATA_REQUIRED | DATA_REQUIRED | DATA_REQUIRED | MISSING_SOURCE | Verify every numeric value before promotion. |\n"
        "| Scholarship | DATA_REQUIRED | DATA_REQUIRED | DATA_REQUIRED | MISSING_SOURCE | Verify eligibility, value, renewal, and deadlines. |\n"
        "| Deadline | DATA_REQUIRED | DATA_REQUIRED | DATA_REQUIRED | MISSING_SOURCE | Verify date, timezone/context, and intake. |\n"
        "| Entry requirement | DATA_REQUIRED | DATA_REQUIRED | DATA_REQUIRED | MISSING_SOURCE | Verify conditions, exceptions, certificates, and linked PDFs. |\n"
        "| Contact | DATA_REQUIRED | DATA_REQUIRED | DATA_REQUIRED | MISSING_SOURCE | Verify against an official contact page. |\n\n"
        "## Reviewed crawler content\n\n"
        f"{markdown.strip()}\n"
    )


def _validate_markdown_snapshot(markdown: str) -> None:
    if len(markdown.strip()) < MIN_MARKDOWN_CHARS:
        raise ValueError("Crawled markdown is too short to save as a usable raw snapshot")


def _validate_promotable_markdown(content: str, *, lineage: dict[str, Any]) -> Any:
    status = normalize_review_status(_extract_review_field(content, "Review status") or lineage.get("review_status"))
    if status != ReviewStatus.VERIFIED:
        raise ValueError("Only reviewed markdown with 'Review status: VERIFIED' can be promoted")

    source_url = _extract_review_field(content, "Primary source URL") or lineage.get("source_url")
    if not source_url or not is_official_vgu_url(str(source_url)):
        raise ValueError("Reviewed markdown must cite an official registered VGU source URL")
    source_entry = get_source_entry(str(source_url))

    required_lineage_fields = (
        "raw_file",
        "raw_content_hash",
        "reviewed_file",
        "reviewed_content_hash",
        "canonical_slug",
        "source_scope",
        "expected_effective_context",
    )
    for field in required_lineage_fields:
        if not lineage.get(field):
            raise ValueError(f"Promotion lineage is missing required field: {field}")

    if lineage.get("diagnostic_only") is not False:
        raise ValueError("Diagnostic crawl artifacts cannot be promoted")
    if lineage.get("promotion_allowed") is not True:
        raise ValueError("Promotion is not allowed for this artifact lineage")
    if lineage.get("canonical_slug") != source_entry.canonical_slug:
        raise ValueError("Promotion lineage canonical slug does not match the source registry")
    if lineage.get("source_scope") != source_entry.source_scope:
        raise ValueError("Promotion lineage source scope does not match the source registry")

    raw_path = Path(str(lineage["raw_file"]))
    if not raw_path.exists():
        raise ValueError(f"Source raw snapshot is missing: {raw_path}")
    raw_content = _extract_raw_crawler_content(raw_path.read_text(encoding="utf-8"))
    if _sha256_text(raw_content) != lineage.get("raw_content_hash"):
        raise ValueError("Raw snapshot hash does not match promotion lineage")
    if _sha256_text(content) != lineage.get("reviewed_content_hash"):
        raise ValueError("Reviewed content hash does not match promotion lineage")

    for field in ("Reviewed by", "Reviewed at", "Approval method", "Source raw file"):
        value = _extract_review_field(content, field)
        if not value or value.strip() == "DATA_REQUIRED":
            raise ValueError(f"Promotion requires human review field: {field}")

    _validate_field_status_table(content)

    blocked_markers = ("needs_review", "review_required", "DATA_REQUIRED", "MISSING_SOURCE", "AMBIGUOUS", "MISMATCH")
    lowered = content.lower()
    for marker in blocked_markers:
        if marker.lower() in lowered:
            raise ValueError(f"Reviewed markdown still contains unresolved marker: {marker}")
    if "vinuni" in lowered or "vin university" in lowered:
        raise ValueError("Reviewed markdown contains legacy VinUni content")
    return source_entry


def _load_review_lineage(source_path: Path, *, raw_manifest_path: str | Path | None = None) -> dict[str, Any]:
    manifest_path = Path(raw_manifest_path or Path(settings.VGU_RAW_CRAWL_DIR) / "raw_crawl_manifest.json")
    manifest = _read_json_manifest(manifest_path)
    reviewed_ref = _repo_style_path(source_path)
    source_resolved = source_path.resolve()
    for entry in manifest.get("sources", []):
        candidate = entry.get("reviewed_file")
        if not candidate:
            continue
        candidate_path = Path(str(candidate))
        if str(candidate) == reviewed_ref or candidate_path == source_path:
            return dict(entry)
        try:
            if candidate_path.resolve() == source_resolved:
                return dict(entry)
        except FileNotFoundError:
            continue
    raise ValueError(f"Promotion lineage manifest entry not found for reviewed file: {source_path}")


def _validate_field_status_table(content: str) -> None:
    in_table = False
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("| Field |") and "Match status" in stripped:
            in_table = True
            continue
        if not in_table:
            continue
        if not stripped.startswith("|"):
            if stripped:
                break
            continue
        if stripped.startswith("|---"):
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if len(cells) < 5:
            continue
        field_name = cells[0] or "Unknown field"
        field_status = normalize_field_status(cells[4])
        if field_status.value in {"MISMATCH", "AMBIGUOUS", "MISSING_SOURCE", "BLOCKED"}:
            raise ValueError(f"Field-level review still blocks promotion: {field_name}={field_status.value}")


def _extract_raw_crawler_content(content: str) -> str:
    marker = "## Raw crawler content"
    if marker not in content:
        return _normalize_markdown(content)
    return _normalize_markdown(content.split(marker, 1)[1])


def _extract_review_field(content: str, field_name: str) -> str | None:
    pattern = re.compile(rf"^-\s*{re.escape(field_name)}:\s*(.+)$", re.IGNORECASE | re.MULTILINE)
    match = pattern.search(content)
    return match.group(1).strip() if match else None


def _promotion_file_name(file_name: str) -> str:
    stem = Path(file_name).stem
    stem = re.sub(r"_[0-9a-f]{8}_review_required$", "", stem)
    stem = re.sub(r"_review_required$", "", stem)
    return f"{stem}.md"


def _strip_repeated_page_chrome(markdown: str) -> str:
    lines = []
    for line in markdown.splitlines():
        stripped = line.strip()
        lowered = stripped.lower()
        if not stripped:
            lines.append(line)
            continue
        if lowered in {"menu", "navigation", "footer"}:
            continue
        if lowered.startswith(("facebook", "linkedin", "youtube", "instagram")):
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def _normalize_markdown(markdown: str) -> str:
    return markdown.replace("\r\n", "\n").replace("\r", "\n").strip()


def _read_json_manifest(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {
            "university": settings.UNIVERSITY_NAME,
            "short_name": settings.UNIVERSITY_SHORT_NAME,
            "generated_at": _now_iso(),
            "sources": [],
        }
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {"sources": []}


def _append_json_manifest(path: Path, entry: dict[str, Any]) -> None:
    manifest = _read_json_manifest(path)
    manifest.setdefault("sources", []).append(entry)
    _write_text_atomic(path, json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


def _update_raw_manifest_entry(path: Path, *, raw_file: Path, updates: dict[str, Any]) -> None:
    manifest = _read_json_manifest(path)
    raw_ref = _repo_style_path(raw_file)
    for entry in manifest.setdefault("sources", []):
        if entry.get("raw_file") == raw_ref:
            entry.update(updates)
            _write_text_atomic(path, json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
            return


def _write_text_atomic(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f".{path.name}.tmp")
    temp_path.write_text(content, encoding="utf-8")
    temp_path.replace(path)


def _unique_path(directory: Path, file_name: str) -> Path:
    stem = Path(file_name).stem
    suffix = Path(file_name).suffix
    path = directory / file_name
    counter = 2
    while path.exists():
        path = directory / f"{stem}_{counter}{suffix}"
        counter += 1
    return path


def _slugify(value: str) -> str:
    parsed_path = urlparse(value).path.strip("/")
    base = parsed_path.rsplit("/", 1)[-1] if parsed_path else value
    slug = re.sub(r"[^A-Za-z0-9]+", "_", base).strip("_").lower()
    return slug[:64] or "vgu_source"


def _safe_title(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip()
    return cleaned or "VGU source"


def _repo_style_path(path: Path) -> str:
    return path.as_posix()


def _sha256_text(content: str) -> str:
    return hashlib.sha256(_normalize_markdown(content).encode("utf-8")).hexdigest()


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
