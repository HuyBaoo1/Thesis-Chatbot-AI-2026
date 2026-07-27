import pytest
from fastapi import HTTPException

from src.services.crawl_service import read_markdown_content


def test_missing_local_crawl_artifact_returns_http_404():
    with pytest.raises(HTTPException) as exc_info:
        read_markdown_content("local:///definitely/missing/crawl-output/file.md")

    assert exc_info.value.status_code == 404
    assert "artifact is missing" in exc_info.value.detail
