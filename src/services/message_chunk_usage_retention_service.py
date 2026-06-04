from datetime import datetime, timedelta

from src.models.message_chunk_usage import MessageChunkUsage


DEFAULT_RETENTION_DAYS = 60
DEFAULT_BATCH_SIZE = 1000
DEFAULT_MAX_BATCHES = 100


def cleanup_old_message_chunk_usages(
    db,
    *,
    retention_days: int = DEFAULT_RETENTION_DAYS,
    batch_size: int = DEFAULT_BATCH_SIZE,
    max_batches: int = DEFAULT_MAX_BATCHES,
) -> dict:
    safe_days = max(1, int(retention_days or DEFAULT_RETENTION_DAYS))
    safe_batch_size = max(1, int(batch_size or DEFAULT_BATCH_SIZE))
    safe_max_batches = max(1, int(max_batches or DEFAULT_MAX_BATCHES))
    cutoff = datetime.utcnow() - timedelta(days=safe_days)

    total_deleted = 0
    batches = 0

    while batches < safe_max_batches:
        rows = (
            db.query(MessageChunkUsage.id)
            .filter(MessageChunkUsage.created_at < cutoff)
            .order_by(MessageChunkUsage.created_at.asc(), MessageChunkUsage.id.asc())
            .limit(safe_batch_size)
            .all()
        )
        ids = [row.id for row in rows]

        if not ids:
            break

        deleted = (
            db.query(MessageChunkUsage)
            .filter(MessageChunkUsage.id.in_(ids))
            .delete(synchronize_session=False)
        )
        db.commit()
        total_deleted += int(deleted or 0)
        batches += 1

        if len(ids) < safe_batch_size:
            break

    return {
        "deleted": total_deleted,
        "batches": batches,
        "batch_size": safe_batch_size,
        "max_batches": safe_max_batches,
        "retention_days": safe_days,
        "cutoff": cutoff,
    }
