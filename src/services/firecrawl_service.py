import logging
import posixpath
import re
import time
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


RETRYABLE_ERROR_MARKERS = (
    "408",
    "429",
    "500",
    "502",
    "503",
    "504",
    "timeout",
    "timed out",
    "temporarily unavailable",
    "too many requests",
    "rate limit",
)


def get_firecrawl_client() -> FirecrawlApp:
    api_key = settings.FIRECRAWL_API_KEY
    if not api_key:
        raise ValueError("FIRECRAWL_API_KEY is not set")
    timeout_seconds = max(1.0, settings.FIRECRAWL_SCRAPE_TIMEOUT_MS / 1000)
    return FirecrawlApp(
        api_key=api_key,
        timeout=timeout_seconds,
        max_retries=settings.FIRECRAWL_SDK_MAX_RETRIES,
        backoff_factor=0,
    )


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

    if len(site_urls) == 1:
        page = scrape_page_with_retry(client, site_urls[0], formats=["markdown"])
        data = [page] if page else []
        return _build_site_crawl_result(
            success=bool(data),
            status="completed" if data else "failed",
            data=data,
            selected_urls=site_urls,
            raw_result=None,
        )

    result = batch_scrape_with_retry(client, site_urls)
    return _normalize_batch_scrape_result(result, site_urls)


def discover_site_urls(client: FirecrawlApp, url: str, limit: int) -> list[str]:
    urls: list[str] = [url]

    try:
        map_result = _map_url(client, url, limit=limit)
        urls.extend(_extract_links_from_map_result(map_result))
    except Exception:
        logger.warning("Firecrawl map failed for %s", url, exc_info=True)

    if len(_filter_site_urls(url, urls, limit)) < limit:
        try:
            links_page = scrape_page_with_retry(
                client,
                url,
                formats=["links"],
                only_main_content=False,
            )
            urls.extend(_extract_links_from_scrape_result(links_page))
        except Exception:
            logger.info("Firecrawl link scrape failed for %s", url, exc_info=True)

    return _filter_site_urls(url, urls, limit)


def scrape_page_with_retry(
    client: FirecrawlApp,
    url: str,
    *,
    formats: list[str],
    only_main_content: bool = True,
) -> dict[str, Any]:
    return _call_firecrawl_with_policy(
        lambda proxy: _scrape_url(
            client,
            url,
            formats=formats,
            only_main_content=only_main_content,
            proxy=proxy,
        ),
        operation="scrape",
        url=url,
    )


def batch_scrape_with_retry(client: FirecrawlApp, urls: list[str]) -> dict[str, Any]:
    return _call_firecrawl_with_policy(
        lambda proxy: _batch_scrape_urls(client, urls, proxy=proxy),
        operation="batch_scrape",
        url=urls[0] if urls else "",
    )


def _call_firecrawl_with_policy(call, *, operation: str, url: str) -> dict[str, Any]:
    attempts = _build_proxy_attempts()
    last_exc: Exception | None = None

    for attempt_index, proxy in enumerate(attempts, start=1):
        try:
            result = call(proxy)
            normalized = _to_plain_dict(result)
            if normalized:
                _attach_firecrawl_attempt(normalized, attempt_index=attempt_index, proxy=proxy)
            return normalized
        except Exception as exc:
            last_exc = exc
            retryable = _is_retryable_firecrawl_error(exc)
            error_summary = classify_firecrawl_exception(
                exc,
                operation=operation,
                url=url,
                attempt_index=attempt_index,
                proxy=proxy,
            )
            logger.warning(
                "Firecrawl %s attempt %s/%s failed for %s using proxy=%s retryable=%s classification=%s http_status=%s request_id=%s",
                operation,
                attempt_index,
                len(attempts),
                url,
                proxy,
                retryable,
                error_summary["classification"],
                error_summary["http_status"],
                error_summary["provider_request_id"],
                exc_info=True,
            )
            if attempt_index >= len(attempts) or not retryable:
                raise
            if settings.FIRECRAWL_RETRY_BACKOFF_SECONDS > 0:
                time.sleep(settings.FIRECRAWL_RETRY_BACKOFF_SECONDS)

    if last_exc:
        raise last_exc
    return {}


def _build_proxy_attempts() -> list[str]:
    primary = _normalize_proxy_mode(settings.FIRECRAWL_PROXY_MODE)
    attempts = [primary]
    if (
        settings.FIRECRAWL_ALLOW_ENHANCED_RETRY
        and primary == "basic"
        and settings.FIRECRAWL_MAX_ATTEMPTS > 1
    ):
        attempts.append("enhanced")
    return attempts[: settings.FIRECRAWL_MAX_ATTEMPTS]


def _normalize_proxy_mode(value: str) -> str:
    normalized = (value or "basic").strip().lower()
    if normalized not in {"basic", "enhanced"}:
        raise ValueError("FIRECRAWL_PROXY_MODE must be either 'basic' or 'enhanced'")
    return normalized


def _scrape_url(
    client: FirecrawlApp,
    url: str,
    *,
    formats: list[str],
    only_main_content: bool,
    proxy: str,
) -> dict[str, Any]:
    if hasattr(client, "scrape"):
        return _to_plain_dict(
            client.scrape(
                url,
                formats=formats,
                only_main_content=only_main_content,
                timeout=settings.FIRECRAWL_SCRAPE_TIMEOUT_MS,
                proxy=proxy,
            )
        )

    return _to_plain_dict(
        client.scrape_url(
            url,
            params={
                "formats": formats,
                "onlyMainContent": only_main_content,
                "timeout": settings.FIRECRAWL_SCRAPE_TIMEOUT_MS,
                "proxy": proxy,
            },
        )
    )


def _batch_scrape_urls(client: FirecrawlApp, urls: list[str], *, proxy: str) -> dict[str, Any]:
    if hasattr(client, "batch_scrape"):
        return _to_plain_dict(
            client.batch_scrape(
                urls,
                formats=["markdown"],
                only_main_content=True,
                timeout=settings.FIRECRAWL_SCRAPE_TIMEOUT_MS,
                proxy=proxy,
                poll_interval=2,
                wait_timeout=max(1, settings.RQ_JOB_TIMEOUT - 5),
            )
        )

    return _to_plain_dict(
        client.batch_scrape_urls(
            urls,
            params={
                "formats": ["markdown"],
                "onlyMainContent": True,
                "timeout": settings.FIRECRAWL_SCRAPE_TIMEOUT_MS,
                "proxy": proxy,
            },
        )
    )


def _map_url(client: FirecrawlApp, url: str, *, limit: int) -> dict[str, Any]:
    if hasattr(client, "map"):
        return _to_plain_dict(
            client.map(
                url,
                search="",
                limit=limit,
                timeout=settings.FIRECRAWL_SCRAPE_TIMEOUT_MS,
            )
        )

    return _to_plain_dict(
        client.map_url(
            url,
            params={
                "search": "",
                "limit": limit,
                "timeout": settings.FIRECRAWL_SCRAPE_TIMEOUT_MS,
            },
        )
    )


def _is_retryable_firecrawl_error(exc: Exception) -> bool:
    message = f"{type(exc).__name__}: {exc}".lower()
    return any(marker in message for marker in RETRYABLE_ERROR_MARKERS)


def classify_firecrawl_exception(
    exc: Exception,
    *,
    operation: str | None = None,
    url: str | None = None,
    attempt_index: int | None = None,
    proxy: str | None = None,
) -> dict[str, Any]:
    message = f"{type(exc).__name__}: {exc}"
    lowered = message.lower()
    http_status = _extract_http_status(exc, message)
    provider_request_id = _extract_provider_request_id(exc)
    error_code = _extract_error_code(exc)

    if "ssl" in lowered or "eof occurred in violation of protocol" in lowered:
        classification = "PROVIDER_SSL_ERROR"
    elif "timeout" in lowered or "timed out" in lowered:
        classification = "PROVIDER_TIMEOUT"
    elif http_status == 429 or "rate limit" in lowered or "too many requests" in lowered:
        classification = "PROVIDER_RATE_LIMIT"
    elif http_status and 400 <= http_status < 500:
        classification = "PROVIDER_CLIENT_ERROR"
    elif http_status and http_status >= 500:
        classification = "PROVIDER_SERVER_ERROR"
    else:
        classification = "PROVIDER_ERROR"

    return {
        "classification": classification,
        "exception_class": type(exc).__name__,
        "http_status": http_status,
        "firecrawl_error_code": error_code,
        "provider_request_id": provider_request_id,
        "operation": operation,
        "target_url": url,
        "attempt": attempt_index,
        "proxy": proxy,
        "sdk_retries": settings.FIRECRAWL_SDK_MAX_RETRIES,
    }


def _extract_http_status(exc: Exception, message: str) -> int | None:
    response = getattr(exc, "response", None)
    status = getattr(response, "status_code", None)
    if isinstance(status, int):
        return status
    match = re.search(r"\b([45][0-9]{2})\b", message)
    return int(match.group(1)) if match else None


def _extract_provider_request_id(exc: Exception) -> str | None:
    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None)
    if not headers:
        return getattr(exc, "request_id", None)
    for key in ("x-request-id", "x-firecrawl-request-id", "request-id"):
        value = headers.get(key)
        if value:
            return str(value)
    return getattr(exc, "request_id", None)


def _extract_error_code(exc: Exception) -> str | None:
    for attr in ("code", "error_code"):
        value = getattr(exc, attr, None)
        if value:
            return str(value)
    return None


def _to_plain_dict(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if hasattr(value, "model_dump"):
        dumped = value.model_dump(mode="json", exclude_none=True)
        return dumped if isinstance(dumped, dict) else {"raw": dumped}
    if hasattr(value, "dict"):
        dumped = value.dict()
        return dumped if isinstance(dumped, dict) else {"raw": dumped}

    result: dict[str, Any] = {}
    for key in ("markdown", "html", "raw_html", "links", "metadata", "url"):
        if hasattr(value, key):
            result[key] = getattr(value, key)
    return result or {"raw": repr(value)}


def _attach_firecrawl_attempt(page: dict[str, Any], *, attempt_index: int, proxy: str) -> None:
    metadata = page.get("metadata")
    if not isinstance(metadata, dict):
        metadata = {}
        page["metadata"] = metadata
    metadata["firecrawl_proxy"] = proxy
    metadata["firecrawl_attempt"] = attempt_index
    metadata["firecrawl_sdk_retries"] = settings.FIRECRAWL_SDK_MAX_RETRIES


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
