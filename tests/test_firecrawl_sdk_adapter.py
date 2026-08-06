from src.services import firecrawl_service


class ModelDumpResponse:
    def model_dump(self, **kwargs):
        return {
            "markdown": "# VGU\n\nContent",
            "metadata": {"sourceURL": "https://vgu.edu.vn/admission"},
        }


class TypedFirecrawlClient:
    def __init__(self):
        self.scrape_kwargs = None
        self.map_kwargs = None
        self.batch_kwargs = None

    def scrape(self, url, **kwargs):
        self.scrape_kwargs = kwargs
        return ModelDumpResponse()

    def map(self, url, **kwargs):
        self.map_kwargs = kwargs
        return {"links": [url]}

    def batch_scrape(self, urls, **kwargs):
        self.batch_kwargs = kwargs
        return {"success": True, "status": "completed", "data": [{"markdown": "# VGU"}]}


def test_typed_sdk_scrape_adapter(monkeypatch):
    client = TypedFirecrawlClient()
    monkeypatch.setattr(firecrawl_service.settings, "FIRECRAWL_SCRAPE_TIMEOUT_MS", 90000)

    page = firecrawl_service._scrape_url(
        client,
        "https://vgu.edu.vn/admission",
        formats=["markdown"],
        only_main_content=True,
        proxy="basic",
    )

    assert page["metadata"]["sourceURL"] == "https://vgu.edu.vn/admission"
    assert client.scrape_kwargs["formats"] == ["markdown"]
    assert client.scrape_kwargs["only_main_content"] is True
    assert client.scrape_kwargs["timeout"] == 90000
    assert client.scrape_kwargs["proxy"] == "basic"


def test_typed_sdk_map_and_batch_adapters(monkeypatch):
    client = TypedFirecrawlClient()
    monkeypatch.setattr(firecrawl_service.settings, "FIRECRAWL_SCRAPE_TIMEOUT_MS", 90000)
    monkeypatch.setattr(firecrawl_service.settings, "RQ_JOB_TIMEOUT", 60)

    firecrawl_service._map_url(client, "https://vgu.edu.vn/admission", limit=3)
    firecrawl_service._batch_scrape_urls(client, ["https://vgu.edu.vn/admission"], proxy="enhanced")

    assert client.map_kwargs["search"] == ""
    assert client.map_kwargs["limit"] == 3
    assert client.map_kwargs["timeout"] == 90000
    assert client.batch_kwargs["formats"] == ["markdown"]
    assert client.batch_kwargs["only_main_content"] is True
    assert client.batch_kwargs["proxy"] == "enhanced"
    assert client.batch_kwargs["wait_timeout"] == 55
