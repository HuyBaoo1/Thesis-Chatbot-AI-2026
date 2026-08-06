import hashlib
import re
from dataclasses import dataclass
from pathlib import Path


CONTENT_UNCHANGED = "CONTENT_UNCHANGED"
CONTENT_CHANGED_REVIEW_REQUIRED = "CONTENT_CHANGED_REVIEW_REQUIRED"
SOURCE_STRUCTURE_CHANGED = "SOURCE_STRUCTURE_CHANGED"
NO_ACTIVE_COMPARISON_DOCUMENT = "NO_ACTIVE_COMPARISON_DOCUMENT"
COMPARISON_BLOCKED = "COMPARISON_BLOCKED"


@dataclass(frozen=True)
class SnapshotComparison:
    status: str
    raw_hash: str | None
    active_hash: str | None
    raw_section_count: int
    active_section_count: int
    reason: str


def compare_snapshot_to_active_import(raw_snapshot: str | Path, active_import: str | Path) -> SnapshotComparison:
    raw_path = Path(raw_snapshot)
    active_path = Path(active_import)
    if not raw_path.exists():
        return SnapshotComparison(COMPARISON_BLOCKED, None, None, 0, 0, "Raw snapshot is missing")
    if not active_path.exists():
        raw_text = raw_path.read_text(encoding="utf-8")
        return SnapshotComparison(
            NO_ACTIVE_COMPARISON_DOCUMENT,
            _hash_normalized(raw_text),
            None,
            _section_count(raw_text),
            0,
            "No active import document exists for this source",
        )

    raw_text = raw_path.read_text(encoding="utf-8")
    active_text = active_path.read_text(encoding="utf-8")
    raw_normalized = normalize_markdown_for_comparison(raw_text)
    active_normalized = normalize_markdown_for_comparison(active_text)
    raw_hash = _hash_text(raw_normalized)
    active_hash = _hash_text(active_normalized)
    raw_sections = _section_count(raw_normalized)
    active_sections = _section_count(active_normalized)

    if raw_hash == active_hash:
        return SnapshotComparison(CONTENT_UNCHANGED, raw_hash, active_hash, raw_sections, active_sections, "Normalized content matches")
    if abs(raw_sections - active_sections) >= 8:
        return SnapshotComparison(
            SOURCE_STRUCTURE_CHANGED,
            raw_hash,
            active_hash,
            raw_sections,
            active_sections,
            "Heading structure differs materially; human review required",
        )
    return SnapshotComparison(
        CONTENT_CHANGED_REVIEW_REQUIRED,
        raw_hash,
        active_hash,
        raw_sections,
        active_sections,
        "Normalized content differs; human review required",
    )


def normalize_markdown_for_comparison(content: str) -> str:
    if "## Raw crawler content" in content:
        content = content.split("## Raw crawler content", 1)[1]
    lines: list[str] = []
    in_metadata = False
    for line in content.replace("\r\n", "\n").replace("\r", "\n").splitlines():
        stripped = line.strip()
        if stripped.startswith("## Snapshot metadata") or stripped.startswith("## Verification record"):
            in_metadata = True
            continue
        if in_metadata and stripped.startswith("## "):
            in_metadata = False
        if in_metadata:
            continue
        lowered = stripped.lower()
        if lowered in {"menu", "navigation", "footer"}:
            continue
        if lowered.startswith(("- source url:", "- canonical url:", "- captured at:", "- crawl session id:", "- page job id:")):
            continue
        if not stripped:
            continue
        lines.append(re.sub(r"\s+", " ", stripped))
    return "\n".join(lines).strip()


def _hash_normalized(content: str) -> str:
    return _hash_text(normalize_markdown_for_comparison(content))


def _hash_text(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _section_count(content: str) -> int:
    return sum(1 for line in content.splitlines() if line.lstrip().startswith("#"))
