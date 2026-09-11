import pytest
import httpx
import os


DEFAULT_BACKEND_TEST_API_URL = "http://127.0.0.1:8000"
DEFAULT_BACKEND_TEST_HEALTH_TIMEOUT = 10.0


def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )


# Configure asyncio for pytest
pytest_plugins = ('pytest_asyncio',)


@pytest.fixture(scope="session")
def api_url():
    """HTTP base URL for backend integration tests.

    Set BACKEND_TEST_API_URL to point tests at a personal/staging deployment.
    Without it, tests use the local backend URL and skip cleanly if it is not
    running.
    """
    url = os.getenv("BACKEND_TEST_API_URL", DEFAULT_BACKEND_TEST_API_URL).rstrip("/")
    health_timeout = float(
        os.getenv("BACKEND_TEST_HEALTH_TIMEOUT", DEFAULT_BACKEND_TEST_HEALTH_TIMEOUT)
    )
    try:
        response = httpx.get(f"{url}/health", timeout=health_timeout)
    except httpx.HTTPError as exc:
        pytest.skip(
            f"Backend test API is not reachable at {url}. "
            "Start the backend locally or set BACKEND_TEST_API_URL. "
            f"Original error: {exc}"
        )

    if response.status_code >= 500:
        pytest.skip(
            f"Backend test API health check failed at {url}/health "
            f"with status {response.status_code}."
        )
    return url
