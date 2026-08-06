from src.services.firecrawl_service import classify_firecrawl_exception


class DummyResponse:
    status_code = 502
    headers = {"x-request-id": "req_test"}


class DummyHttpError(Exception):
    response = DummyResponse()
    code = "bad_gateway"


def test_classifies_provider_ssl_error():
    error = RuntimeError("SSL: EOF occurred in violation of protocol")

    summary = classify_firecrawl_exception(error, operation="scrape", url="https://vgu.edu.vn/admission", attempt_index=1, proxy="basic")

    assert summary["classification"] == "PROVIDER_SSL_ERROR"
    assert summary["exception_class"] == "RuntimeError"
    assert summary["target_url"] == "https://vgu.edu.vn/admission"
    assert summary["proxy"] == "basic"


def test_classifies_provider_http_error_without_body():
    summary = classify_firecrawl_exception(DummyHttpError("upstream failed"), operation="scrape")

    assert summary["classification"] == "PROVIDER_SERVER_ERROR"
    assert summary["http_status"] == 502
    assert summary["firecrawl_error_code"] == "bad_gateway"
    assert summary["provider_request_id"] == "req_test"


def test_classifies_rate_limit_message():
    summary = classify_firecrawl_exception(RuntimeError("Too many requests"))

    assert summary["classification"] == "PROVIDER_RATE_LIMIT"
