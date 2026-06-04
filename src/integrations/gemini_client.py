import threading

from openai import OpenAI

from src.core.config import settings

_client = None
_lock = threading.Lock()


def get_gemini_router_client() -> OpenAI | None:
    """OpenAI-compatible client pointed at Gemini API, used for fast routing."""
    global _client

    if _client is not None:
        return _client

    if not settings.GEMINI_API_KEY or not settings.GEMINI_ROUTER_MODEL:
        return None

    with _lock:
        if _client is not None:
            return _client
        _client = OpenAI(
            api_key=settings.GEMINI_API_KEY,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            timeout=10.0,
            max_retries=1,
        )
    return _client
