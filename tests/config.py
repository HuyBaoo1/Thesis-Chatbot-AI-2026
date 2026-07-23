import os


DEFAULT_BACKEND_TEST_ORIGIN = "http://localhost:5173"
DEFAULT_BACKEND_INVALID_ORIGIN = "https://invalid-origin.example.com"


def test_origin() -> str:
    return os.getenv("BACKEND_TEST_ORIGIN", DEFAULT_BACKEND_TEST_ORIGIN)


def invalid_origin() -> str:
    return os.getenv("BACKEND_TEST_INVALID_ORIGIN", DEFAULT_BACKEND_INVALID_ORIGIN)


def origin_headers() -> dict[str, str]:
    return {"Origin": test_origin()}


def csrf_protection_enabled() -> bool:
    return os.getenv("BACKEND_TEST_CSRF_ENABLED", "false").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
