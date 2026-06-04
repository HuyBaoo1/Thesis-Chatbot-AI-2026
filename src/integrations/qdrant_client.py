from qdrant_client import QdrantClient
from src.core.config import settings

qdrant_client = QdrantClient(
    host=settings.QDRANT_HOST,
    port=settings.QDRANT_PORT,
    api_key=settings.QDRANT_API_KEY,
    https=settings.QDRANT_HTTPS,
)