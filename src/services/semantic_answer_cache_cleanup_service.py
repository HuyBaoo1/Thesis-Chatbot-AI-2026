import logging
from datetime import datetime, timezone

from qdrant_client.http import models as rest
from qdrant_client.models import DatetimeRange, FieldCondition, Filter

from src.core.config import settings
from src.integrations.qdrant_client import qdrant_client
from src.services.chat_pipeline.semantic_answer_cache import (
    ensure_semantic_answer_cache_collection,
)

logger = logging.getLogger(__name__)


def cleanup_expired_semantic_answer_cache_points(
    *,
    batch_size: int | None = None,
    max_batches: int | None = None,
) -> dict[str, int | str]:
    safe_batch_size = max(1, int(batch_size or settings.SEMANTIC_ANSWER_CACHE_CLEANUP_BATCH_SIZE))
    safe_max_batches = max(
        1,
        int(max_batches or settings.SEMANTIC_ANSWER_CACHE_CLEANUP_MAX_BATCHES),
    )

    collection_name = settings.QDRANT_SEMANTIC_ANSWER_CACHE_COLLECTION
    ensure_semantic_answer_cache_collection()
    if not _collection_exists(collection_name):
        return {
            "deleted": 0,
            "batches": 0,
            "batch_size": safe_batch_size,
            "max_batches": safe_max_batches,
            "collection": collection_name,
        }

    now = datetime.now(timezone.utc)
    total_deleted = 0
    batches = 0

    while batches < safe_max_batches:
        points, _ = qdrant_client.scroll(
            collection_name=collection_name,
            scroll_filter=Filter(
                must=[
                    FieldCondition(
                        key="expires_at",
                        range=DatetimeRange(lte=now),
                    )
                ]
            ),
            limit=safe_batch_size,
            with_payload=["cache_id", "expires_at"],
            with_vectors=False,
        )
        if not points:
            break

        point_ids = [point.id for point in points if getattr(point, "id", None) is not None]
        if point_ids:
            qdrant_client.delete(
                collection_name=collection_name,
                points_selector=rest.PointIdsList(points=point_ids),
            )
            total_deleted += len(point_ids)

        batches += 1

        if len(points) < safe_batch_size:
            break

    return {
        "deleted": total_deleted,
        "batches": batches,
        "batch_size": safe_batch_size,
        "max_batches": safe_max_batches,
        "collection": collection_name,
    }


def _collection_exists(collection_name: str) -> bool:
    collections = qdrant_client.get_collections().collections
    return collection_name in {collection.name for collection in collections}
