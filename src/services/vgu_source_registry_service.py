import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from src.core.config import settings

TRACKING_QUERY_PREFIXES = ("utm_",)
TRACKING_QUERY_KEYS = {"fbclid", "gclid", "msclkid"}


@dataclass(frozen=True)
class VguSourceEntry:
    source_url: str
    canonical_url: str
    document_index: int
    canonical_slug: str
    raw_filename_prefix: str
    reviewed_filename_prefix: str
    import_filename: str | None
    document_title: str
    source_scope: str
    expected_effective_context: str
    promotion_policy: str
    existing_active_document: str | None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "VguSourceEntry":
        return cls(
            source_url=str(data["source_url"]),
            canonical_url=str(data["canonical_url"]),
            document_index=int(data["document_index"]),
            canonical_slug=str(data["canonical_slug"]),
            raw_filename_prefix=str(data["raw_filename_prefix"]),
            reviewed_filename_prefix=str(data["reviewed_filename_prefix"]),
            import_filename=data.get("import_filename"),
            document_title=str(data["document_title"]),
            source_scope=str(data["source_scope"]),
            expected_effective_context=str(data["expected_effective_context"]),
            promotion_policy=str(data["promotion_policy"]),
            existing_active_document=data.get("existing_active_document"),
        )


def load_registry(path: str | Path | None = None) -> dict[str, Any]:
    registry_path = Path(path or settings.VGU_SOURCE_REGISTRY_PATH)
    data = json.loads(registry_path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("VGU source registry must be a JSON object")
    return data


def allowed_domains(path: str | Path | None = None) -> set[str]:
    data = load_registry(path)
    domains = data.get("allowed_domains") or []
    return {str(domain).lower() for domain in domains}


def is_official_vgu_url(url: str, path: str | Path | None = None) -> bool:
    parsed = urlparse(canonicalize_url(url))
    return parsed.scheme == "https" and parsed.hostname in allowed_domains(path)


def get_source_entry(
    url: str,
    *,
    path: str | Path | None = None,
    required: bool = True,
) -> VguSourceEntry | None:
    canonical_url = canonicalize_url(url)
    data = load_registry(path)
    for item in data.get("sources", []):
        entry = VguSourceEntry.from_dict(item)
        if canonicalize_url(entry.canonical_url) == canonical_url or canonicalize_url(entry.source_url) == canonical_url:
            return entry
    if required:
        raise ValueError(f"VGU source is not registered: {url}")
    return None


def canonicalize_url(url: str) -> str:
    if not url or not url.strip():
        raise ValueError("URL is required")
    raw = url.strip()
    if "://" not in raw:
        raw = f"https://{raw}"
    parsed = urlparse(raw)
    scheme = "https"
    host = (parsed.hostname or "").lower()
    if not host:
        raise ValueError(f"Invalid URL: {url}")

    port = parsed.port
    netloc = host
    if port and port != 443:
        netloc = f"{host}:{port}"

    path = re.sub(r"/+", "/", parsed.path or "/")
    if path != "/":
        path = path.rstrip("/")

    query_items = []
    for key, value in parse_qsl(parsed.query, keep_blank_values=True):
        normalized_key = key.lower()
        if normalized_key in TRACKING_QUERY_KEYS:
            continue
        if any(normalized_key.startswith(prefix) for prefix in TRACKING_QUERY_PREFIXES):
            continue
        query_items.append((key, value))
    query = urlencode(query_items, doseq=True)
    return urlunparse((scheme, netloc, path, "", query, ""))
