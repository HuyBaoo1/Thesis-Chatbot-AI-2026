from uuid import UUID

from fastapi import HTTPException

from src.models.message import Message
from src.models.message_chunk_usage import MessageChunkUsage


def create_message_chunk_usages(
    db,
    *,
    message_id: UUID,
    chunks: list[dict],
    auto_commit: bool = True,
) -> None:
    for rank, item in enumerate(chunks, start=1):
        chunk_id = item.get("chunk_id")
        if chunk_id is None:
            continue
        usage = MessageChunkUsage(
            message_id=message_id,
            chunk_id=chunk_id,
            rank=rank,
            score=float(item.get("score", 0.0)),
            content=item.get("content"),
            category=item.get("category"),
            source=item.get("source"),
        )
        db.add(usage)
    if auto_commit:
        db.commit()
    else:
        db.flush()


def list_message_sources(db, *, message_id: UUID) -> dict:
    message = db.get(Message, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    rows = (
        db.query(MessageChunkUsage)
        .filter(MessageChunkUsage.message_id == message_id)
        .order_by(MessageChunkUsage.rank.asc())
        .all()
    )
    return {
        "message_id": message_id,
        "items": rows,
        "total": len(rows),
    }
