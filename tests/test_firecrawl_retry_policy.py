import pytest

from src.services import firecrawl_service


class FlakyFirecrawlClient:
    def __init__(self):
        self.calls = []

    def scrape(self, url, **kwargs):
        self.calls.append((url, kwargs))
        if len(self.calls) == 1:
            raise TimeoutError("Request Timeout")
        return {
            "markdown": "# VGU Admissions\n\nOfficial page content for testing.",
            "metadata": {"sourceURL": url},
        }


def test_firecrawl_retry_policy_uses_basic_then_enhanced(monkeypatch):
    client = FlakyFirecrawlClient()
    monkeypatch.setattr(firecrawl_service.settings, "FIRECRAWL_PROXY_MODE", "basic")
    monkeypatch.setattr(firecrawl_service.settings, "FIRECRAWL_ALLOW_ENHANCED_RETRY", True)
    monkeypatch.setattr(firecrawl_service.settings, "FIRECRAWL_MAX_ATTEMPTS", 2)
    monkeypatch.setattr(firecrawl_service.settings, "FIRECRAWL_RETRY_BACKOFF_SECONDS", 0)
    monkeypatch.setattr(firecrawl_service.settings, "FIRECRAWL_SDK_MAX_RETRIES", 0)

    page = firecrawl_service.scrape_page_with_retry(
        client,
        "https://vgu.edu.vn/admission",
        formats=["markdown"],
    )

    assert [call[1]["proxy"] for call in client.calls] == ["basic", "enhanced"]
    assert page["metadata"]["firecrawl_proxy"] == "enhanced"
    assert page["metadata"]["firecrawl_attempt"] == 2
    assert page["metadata"]["firecrawl_sdk_retries"] == 0


def test_firecrawl_proxy_auto_is_rejected(monkeypatch):
    monkeypatch.setattr(firecrawl_service.settings, "FIRECRAWL_PROXY_MODE", "auto")

    with pytest.raises(ValueError, match="basic.*enhanced"):
        firecrawl_service.scrape_page_with_retry(
            FlakyFirecrawlClient(),
            "https://vgu.edu.vn/admission",
            formats=["markdown"],
        )


def test_firecrawl_client_disables_sdk_retries(monkeypatch):
    created = {}

    class FakeFirecrawlApp:
        def __init__(self, **kwargs):
            created.update(kwargs)

    monkeypatch.setattr(firecrawl_service, "FirecrawlApp", FakeFirecrawlApp)
    monkeypatch.setattr(firecrawl_service.settings, "FIRECRAWL_API_KEY", "fc-test")
    monkeypatch.setattr(firecrawl_service.settings, "FIRECRAWL_SCRAPE_TIMEOUT_MS", 120000)
    monkeypatch.setattr(firecrawl_service.settings, "FIRECRAWL_SDK_MAX_RETRIES", 0)

    firecrawl_service.get_firecrawl_client()

    assert created["api_key"] == "fc-test"
    assert created["timeout"] == 120
    assert created["max_retries"] == 0
