"""Embedding service for text vectorization."""
from src.integrations.embedding_client import get_embeddings_client as _get_emb_client
from src.models.knowledge_chunk import KnowledgeChunk

_embeddings_client = None


def get_embeddings_client():
    global _embeddings_client
    if _embeddings_client is None:
        _embeddings_client = _get_emb_client()
    return _embeddings_client


def build_chunk_text(chunk) -> str:
    parts = [
        f"Category: {chunk.category.value}",
        f"Title: {chunk.title or ''}",
        f"Content: {chunk.content}",
    ]

    if chunk.year is not None:
        parts.append(f"Year: {chunk.year}")
    if chunk.source:
        parts.append(f"Source: {chunk.source}")

    return "\n".join(parts)


def generate_embedding(text: str) -> list[float]:
    return get_embeddings_client().embed_query(text)


def generate_list_embedding(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    return get_embeddings_client().embed_documents(texts)
