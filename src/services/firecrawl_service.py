import logging
import posixpath
from typing import Any
from urllib.parse import urljoin, urlparse, urlunparse, urldefrag

from firecrawl import FirecrawlApp

from src.core.config import settings

logger = logging.getLogger(__name__)

SKIPPED_URL_EXTENSIONS = (
    ".7z",
    ".avi",
    ".css",
    ".csv",
    ".doc",
    ".docx",
    ".gif",
    ".jpeg",
    ".jpg",
    ".js",
    ".json",
    ".mov",
    ".mp3",
    ".mp4",
    ".pdf",
    ".png",
    ".ppt",
    ".pptx",
    ".rar",
    ".svg",
    ".webp",
    ".xls",
    ".xlsx",
    ".zip",
)


def get_firecrawl_client() -> FirecrawlApp:
    api_key = settings.FIRECRAWL_API_KEY
    if not api_key:
        raise ValueError("FIRECRAWL_API_KEY is not set")
    return FirecrawlApp(api_key=api_key)


def crawl_sync(url: str, limit: int = 100) -> dict[str, Any]:
    """
    Discover internal URLs for a site and scrape up to ``limit`` pages.

    Firecrawl's crawl endpoint can behave like a single-page scrape for some
    URLs, so this flow makes site crawling explicit: map links first, then
    batch-scrape the selected same-host URLs into markdown.
    """
    client = get_firecrawl_client()
    normalized_limit = max(1, min(limit, 10000))
    seed_url = _normalize_url(url)
    site_urls = discover_site_urls(client, seed_url, normalized_limit)

    scrape_params = {
        "formats": ["markdown"],
        "onlyMainContent": True,
    }

    if len(site_urls) == 1:
        page = client.scrape_url(site_urls[0], params=scrape_params)
        data = [page] if page else []
        return _build_site_crawl_result(
            success=bool(data),
            status="completed" if data else "failed",
            data=data,
            selected_urls=site_urls,
            raw_result=None,
        )

    result = client.batch_scrape_urls(site_urls, params=scrape_params)
    return _normalize_batch_scrape_result(result, site_urls)


def discover_site_urls(client: FirecrawlApp, url: str, limit: int) -> list[str]:
    urls: list[str] = [url]

    try:
        map_result = client.map_url(url, params={"search": ""})
        urls.extend(_extract_links_from_map_result(map_result))
    except Exception:
        logger.warning("Firecrawl map failed for %s", url, exc_info=True)

    if len(_filter_site_urls(url, urls, limit)) < limit:
        try:
            links_page = client.scrape_url(
                url,
                params={"formats": ["links"], "onlyMainContent": False},
            )
            urls.extend(_extract_links_from_scrape_result(links_page))
        except Exception:
            logger.info("Firecrawl link scrape failed for %s", url, exc_info=True)

    return _filter_site_urls(url, urls, limit)


def _normalize_batch_scrape_result(result: Any, selected_urls: list[str]) -> dict[str, Any]:
    if not isinstance(result, dict):
        return _build_site_crawl_result(
            success=False,
            status="failed",
            data=[],
            selected_urls=selected_urls,
            raw_result={"raw": result},
        )

    data = result.get("data") if isinstance(result.get("data"), list) else []
    return _build_site_crawl_result(
        success=bool(result.get("success")) or bool(data),
        status=str(result.get("status") or ("completed" if data else "failed")),
        data=data,
        selected_urls=selected_urls,
        raw_result=result,
    )


def _build_site_crawl_result(
    *,
    success: bool,
    status: str,
    data: list[dict[str, Any]],
    selected_urls: list[str],
    raw_result: dict[str, Any] | None,
) -> dict[str, Any]:
    result = dict(raw_result or {})
    result.update(
        {
            "success": success,
            "status": status,
            "completed": len(data),
            "total": len(selected_urls),
            "data": data,
            "source_urls": selected_urls,
            "mode": "site",
        }
    )
    return result


def _extract_links_from_map_result(map_result: Any) -> list[str]:
    if not isinstance(map_result, dict):
        return []
    links = map_result.get("links")
    if not isinstance(links, list):
        return []
    return [_extract_url_value(link) for link in links]


def _extract_links_from_scrape_result(scrape_result: Any) -> list[str]:
    if not isinstance(scrape_result, dict):
        return []

    links: list[str] = []
    direct_links = scrape_result.get("links")
    if isinstance(direct_links, list):
        links.extend(_extract_url_value(link) for link in direct_links)

    metadata = scrape_result.get("metadata")
    if isinstance(metadata, dict) and isinstance(metadata.get("links"), list):
        links.extend(_extract_url_value(link) for link in metadata["links"])

    return links


def _extract_url_value(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for key in ("url", "href", "sourceURL"):
            if isinstance(value.get(key), str):
                return value[key]
    return ""


def _filter_site_urls(seed_url: str, urls: list[str], limit: int) -> list[str]:
    seed_host = _canonical_host(urlparse(seed_url).netloc)
    filtered: list[str] = []
    seen: set[str] = set()

    for raw_url in urls:
        normalized_url = _normalize_url(raw_url, base_url=seed_url)
        seen_key = _dedupe_url_key(normalized_url)
        if not normalized_url or seen_key in seen:
            continue

        parsed = urlparse(normalized_url)
        if parsed.scheme not in {"http", "https"}:
            continue
        if _canonical_host(parsed.netloc) != seed_host:
            continue
        if _is_asset_url(parsed.path):
            continue

        filtered.append(normalized_url)
        seen.add(seen_key)
        if len(filtered) >= limit:
            break

    return filtered or [seed_url]


def _normalize_url(raw_url: str, base_url: str | None = None) -> str:
    if not raw_url or not raw_url.strip():
        return ""

    candidate = raw_url.strip()
    if base_url:
        candidate = urljoin(base_url, candidate)
    elif "://" not in candidate:
        candidate = f"https://{candidate}"

    candidate, _fragment = urldefrag(candidate)
    parsed = urlparse(candidate)
    if not parsed.netloc:
        return ""

    scheme = parsed.scheme.lower() if parsed.scheme else "https"
    host = parsed.netloc.lower()
    if scheme == "http" and host.endswith(":80"):
        host = host[:-3]
    if scheme == "https" and host.endswith(":443"):
        host = host[:-4]

    # Normalize path to resolve dot segments (.././) while preserving trailing slash.
    # Note: posixpath.normpath also collapses double slashes (// → /) which is
    # the correct behavior for URL path normalization.
    original_path = parsed.path or "/"
    had_trailing_slash = original_path.endswith("/") and len(original_path) > 1
    path = posixpath.normpath(original_path)
    if not path.startswith("/"):
        path = "/" + path
    if had_trailing_slash and not path.endswith("/"):
        path += "/"

    return urlunparse((scheme, host, path, "", parsed.query, ""))


def _dedupe_url_key(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    return urlunparse((parsed.scheme, parsed.netloc, path, "", parsed.query, ""))


def _canonical_host(host: str) -> str:
    normalized = host.lower()
    return normalized[4:] if normalized.startswith("www.") else normalized


def _is_asset_url(path: str) -> bool:
    return path.lower().endswith(SKIPPED_URL_EXTENSIONS)
