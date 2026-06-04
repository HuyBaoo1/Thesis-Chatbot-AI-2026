from langchain_openai import OpenAIEmbeddings

from src.core.config import settings


_embeddings_client = OpenAIEmbeddings(
    model=settings.EMBEDDING_MODEL,
    openai_api_key=settings.OPENAI_API_KEY,
    timeout=15.0,
    max_retries=2,
)


def get_embeddings_client() -> OpenAIEmbeddings:
    return _embeddings_client
