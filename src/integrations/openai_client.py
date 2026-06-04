from openai import OpenAI

from src.core.config import settings

_client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
    timeout=30.0,
    max_retries=2,
)


def get_openai_client() -> OpenAI:
    return _client
