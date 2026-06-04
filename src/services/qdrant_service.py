from uuid import UUID

from qdrant_client.http import models as rest
from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue, PointStruct, VectorParams

from src.core.config import settings
from src.integrations.qdrant_client import qdrant_client


_knowledge_collection_ensured = False

def ensure_knowledge_collection() -> None:
    global _knowledge_collection_ensured
    if _knowledge_collection_ensured:
        return
    collections = qdrant_client.get_collections().collections
    collection_names = {collection.name for collection in collections}

    if settings.QDRANT_KNOWLEDGE_COLLECTION in collection_names:
        _knowledge_collection_ensured = True
        return

    qdrant_client.create_collection(
        collection_name=settings.QDRANT_KNOWLEDGE_COLLECTION,
        vectors_config=VectorParams(
            size=settings.EMBEDDING_DIMENSION,
            distance=Distance.COSINE,
        ),
    )
    _knowledge_collection_ensured = True


def upsert_knowledge_chunk_vector(
    chunk_id: UUID,
    vector: list[float],
    payload: dict,
) -> None:
    ensure_knowledge_collection()

    point = PointStruct(id=str(chunk_id), vector=vector, payload=payload)
    qdrant_client.upsert(
        collection_name=settings.QDRANT_KNOWLEDGE_COLLECTION,
        points=[point],
    )


def upsert_knowledge_chunk_vectors(points: list[PointStruct]) -> None:
    if not points:
        return
    ensure_knowledge_collection()
    qdrant_client.upsert(
        collection_name=settings.QDRANT_KNOWLEDGE_COLLECTION,
        points=points,
    )


def delete_knowledge_chunk_vector(chunk_id: UUID) -> None:
    qdrant_client.delete(
        collection_name=settings.QDRANT_KNOWLEDGE_COLLECTION,
        points_selector=rest.PointIdsList(points=[str(chunk_id)]),
    )


def delete_knowledge_chunk_vectors(chunk_ids: list[UUID | str]) -> None:
    ids = [str(chunk_id) for chunk_id in chunk_ids if chunk_id]
    if not ids:
        return

    qdrant_client.delete(
        collection_name=settings.QDRANT_KNOWLEDGE_COLLECTION,
        points_selector=rest.PointIdsList(points=ids),
    )


def search_knowledge_chunk_vectors(vector: list[float], limit: int = 10):
    ensure_knowledge_collection()
    result = qdrant_client.query_points(
        collection_name=settings.QDRANT_KNOWLEDGE_COLLECTION,
        query=vector,
        limit=limit,
        with_payload=True,
    )
    return result.points   


def ensure_faq_collection() -> None:
    collections = qdrant_client.get_collections().collections
    collection_names = {collection.name for collection in collections}

    if settings.QDRANT_FAQ_COLLECTION in collection_names:
        return

    qdrant_client.create_collection(
        collection_name=settings.QDRANT_FAQ_COLLECTION,
        vectors_config=VectorParams(
            size=settings.EMBEDDING_DIMENSION,
            distance=Distance.COSINE,
        ),
    )


def upsert_faq_vector(
    faq_id: UUID,
    vector: list[float],
    payload: dict,
) -> None:
    ensure_faq_collection()

    point = PointStruct(id=str(faq_id), vector=vector, payload=payload)
    qdrant_client.upsert(
        collection_name=settings.QDRANT_FAQ_COLLECTION,
        points=[point],
    )


def search_faq_vectors(
    *,
    vector: list[float],
    intent: str,
    limit: int = 1,
):
    ensure_faq_collection()
    result = qdrant_client.query_points(
        collection_name=settings.QDRANT_FAQ_COLLECTION,
        query=vector,
        query_filter=Filter(
            must=[
                FieldCondition(
                    key="intent",
                    match=MatchValue(value=intent),
                )
            ]
        ),
        limit=limit,
        with_payload=True,
    )
    return result.points
