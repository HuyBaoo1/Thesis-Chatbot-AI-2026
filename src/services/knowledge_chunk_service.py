import json
import logging
from pathlib import Path
import re
from uuid import UUID

from fastapi import HTTPException
from qdrant_client.models import PointStruct
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError

from src.models.knowledge_chunk import KnowledgeChunk
from src.services import embedding_service
from src.services.major_service import get_major_or_404
from src.services import r2_service
from src.services import qdrant_service
from src.services.text_processing_service import chunk_text, extract_text



def get_knowledge_chunk_or_404(chunk_id: UUID, db):
    chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Knowledge chunk not found")
    return chunk


def list_knowledge_chunks(
    db,
    *,
    q: str | None = None,
    category=None,
    major_id: UUID | None = None,
    year: int | None = None,
    source: str | None = None,
    is_active: bool | None = None,
    needs_embedding: bool | None = None,
    limit: int = 20,
    offset: int = 0,
):
    normalized_limit = max(1, min(limit, 100))
    normalized_offset = max(0, offset)
    query = db.query(KnowledgeChunk)

    if is_active is not None:
        query = query.filter(KnowledgeChunk.is_active.is_(is_active))
    if needs_embedding is not None:
        query = query.filter(KnowledgeChunk.needs_embedding.is_(needs_embedding))
    if category is not None:
        query = query.filter(KnowledgeChunk.category == category)
    if major_id is not None:
        query = query.filter(KnowledgeChunk.major_id == major_id)
    if year is not None:
        query = query.filter(KnowledgeChunk.year == year)
    if source:
        source_pattern = f"%{source.strip()}%"
        query = query.filter(
            or_(
                KnowledgeChunk.source.ilike(source_pattern),
                KnowledgeChunk.source_url.ilike(source_pattern),
            )
        )
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                KnowledgeChunk.title.ilike(pattern),
                KnowledgeChunk.content.ilike(pattern),
                KnowledgeChunk.source.ilike(pattern),
            )
        )

    total = query.count()
    items = (
        query
        .order_by(KnowledgeChunk.updated_at.desc(), KnowledgeChunk.created_at.desc())
        .offset(normalized_offset)
        .limit(normalized_limit)
        .all()
    )
    return {
        "items": items,
        "total": total,
        "limit": normalized_limit,
        "offset": normalized_offset,
    }


def _strip_chunk_part_suffix(title: str | None) -> str | None:
    if not title:
        return title
    return re.sub(r"\s+-\s+part\s+\d+/\d+\s*$", "", title, flags=re.IGNORECASE)


def list_uploaded_knowledge_files(
    db,
    *,
    title: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    normalized_limit = max(1, min(limit, 100))
    normalized_offset = max(0, offset)

    r2_key_expr = KnowledgeChunk.metadata_json["r2_key"].as_string()
    file_name_expr = KnowledgeChunk.metadata_json["file_name"].as_string()
    base_title_expr = KnowledgeChunk.metadata_json["base_title"].as_string()

    query = (
        db.query(
            r2_key_expr.label("r2_key"),
            func.min(file_name_expr).label("file_name"),
            func.min(base_title_expr).label("base_title"),
            func.min(KnowledgeChunk.title).label("title"),
            func.min(KnowledgeChunk.source_url).label("file_url"),
            func.min(KnowledgeChunk.source).label("source"),
            func.min(KnowledgeChunk.year).label("year"),
            func.min(KnowledgeChunk.version).label("version"),
            func.count(KnowledgeChunk.id).label("chunk_count"),
            func.min(KnowledgeChunk.created_at).label("created_at"),
            func.max(KnowledgeChunk.updated_at).label("updated_at"),
        )
        .filter(KnowledgeChunk.is_active.is_(True))
        .filter(r2_key_expr.isnot(None))
        .filter(r2_key_expr != "")
    )

    if title:
        pattern = f"%{title.strip()}%"
        query = query.filter(
            or_(
                KnowledgeChunk.title.ilike(pattern),
                KnowledgeChunk.source.ilike(pattern),
                KnowledgeChunk.source_url.ilike(pattern),
                file_name_expr.ilike(pattern),
                base_title_expr.ilike(pattern),
                r2_key_expr.ilike(pattern),
            )
        )

    grouped_query = query.group_by(r2_key_expr)
    total = grouped_query.count()
    rows = (
        grouped_query
        .order_by(func.max(KnowledgeChunk.updated_at).desc(), func.min(KnowledgeChunk.created_at).desc())
        .offset(normalized_offset)
        .limit(normalized_limit)
        .all()
    )

    items = []
    for row in rows:
        item = row._mapping
        title_value = (
            item["base_title"]
            or _strip_chunk_part_suffix(item["title"])
            or item["file_name"]
            or item["source"]
        )
        items.append(
            {
                "r2_key": item["r2_key"],
                "file_name": item["file_name"] or item["source"],
                "title": title_value,
                "file_url": item["file_url"],
                "source": item["source"],
                "year": item["year"],
                "version": item["version"],
                "chunk_count": item["chunk_count"],
                "created_at": item["created_at"],
                "updated_at": item["updated_at"],
            }
        )

    return {
        "items": items,
        "total": total,
        "limit": normalized_limit,
        "offset": normalized_offset,
    }


def _raise_unique_error():
    raise HTTPException(
        status_code=400,
        detail=(
            "Knowledge chunk with the same major_id, category, year, and version already exists"
        ),
    )


def _build_chunk_payload(chunk: KnowledgeChunk) -> dict:
    return {
        "chunk_id": str(chunk.id),
        "major_id": str(chunk.major_id) if chunk.major_id else None,
        "category": chunk.category.value,
        "title": chunk.title,
        "content": chunk.content,
        "year": chunk.year,
        "source": chunk.source,
        "source_url": chunk.source_url,
        "version": chunk.version,
        "is_active": chunk.is_active,
        "metadata_json": chunk.metadata_json,
    }


def create_knowledge_chunk(data, db):
    if data.major_id:
        get_major_or_404(data.major_id, db)

    chunk = KnowledgeChunk(**data.model_dump())
    db.add(chunk)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        _raise_unique_error()
    db.refresh(chunk)

    try:
        vector = embedding_service.generate_embedding(embedding_service.build_chunk_text(chunk))
        qdrant_service.upsert_knowledge_chunk_vector(chunk.id, vector, _build_chunk_payload(chunk))
        chunk.needs_embedding = False
        db.commit()
        db.refresh(chunk)
    except Exception:
        db.rollback()
        chunk.needs_embedding = True
        db.commit()
        db.refresh(chunk)

    return chunk


def update_knowledge_chunk(chunk_id: UUID, data, db):
    chunk = get_knowledge_chunk_or_404(chunk_id, db)
    payload = data.model_dump(exclude_unset=True)

    if "major_id" in payload and payload["major_id"] is not None:
        get_major_or_404(payload["major_id"], db)

    for field, value in payload.items():
        setattr(chunk, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        _raise_unique_error()
    db.refresh(chunk)

    chunk.needs_embedding = True
    db.commit()
    db.refresh(chunk)

    try:
        vector = embedding_service.generate_embedding(embedding_service.build_chunk_text(chunk))
        qdrant_service.upsert_knowledge_chunk_vector(chunk.id, vector, _build_chunk_payload(chunk))
        chunk.needs_embedding = False
        db.commit()
        db.refresh(chunk)
    except Exception:
        db.rollback()
        chunk.needs_embedding = True
        db.commit()
        db.refresh(chunk)

    return chunk


def update_knowledge_chunk_status(chunk_id: UUID, data, db):
    chunk = get_knowledge_chunk_or_404(chunk_id, db)
    chunk.is_active = data.is_active

    if not data.is_active:
        chunk.needs_embedding = False

    db.commit()
    db.refresh(chunk)
    return chunk


def delete_knowledge_chunk(chunk_id: UUID, db):
    chunk = get_knowledge_chunk_or_404(chunk_id, db)
    db.delete(chunk)
    db.commit()

    try:
        qdrant_service.delete_knowledge_chunk_vector(chunk.id)
    except Exception:
        pass

    return {"message": "Knowledge chunk deleted successfully"}


def rebuild_missing_embeddings(db, *, limit: int = 100) -> dict:
    normalized_limit = max(1, min(limit, 500))
    chunks = (
        db.query(KnowledgeChunk)
        .filter(KnowledgeChunk.is_active.is_(True))
        .filter(KnowledgeChunk.needs_embedding.is_(True))
        .order_by(KnowledgeChunk.updated_at.asc(), KnowledgeChunk.created_at.asc())
        .limit(normalized_limit)
        .all()
    )
    if not chunks:
        return {"processed": 0, "embedded": 0, "failed": 0, "failed_ids": []}

    embedded = 0
    failed_ids: list[UUID] = []
    for chunk in chunks:
        try:
            vector = embedding_service.generate_embedding(embedding_service.build_chunk_text(chunk))
            qdrant_service.upsert_knowledge_chunk_vector(chunk.id, vector, _build_chunk_payload(chunk))
            chunk.needs_embedding = False
            embedded += 1
        except Exception:
            chunk.needs_embedding = True
            failed_ids.append(chunk.id)

    db.commit()
    return {
        "processed": len(chunks),
        "embedded": embedded,
        "failed": len(failed_ids),
        "failed_ids": failed_ids,
    }


def upload_file_to_chunks(
    *,
    file_name: str,
    file_bytes: bytes,
    content_type: str | None,
    title: str,
    category,
    year: int | None = None,
    db,
    major_id: UUID | None = None,
    version_start: int = 1,
    chunk_size: int = 1200,
    chunk_overlap: int = 100,
    source: str | None = None,
    extra_metadata: dict | None = None,
):
    if major_id:
        get_major_or_404(major_id, db)

    extracted_text = extract_text(file_name=file_name, file_bytes=file_bytes)
    chunks = chunk_text(extracted_text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    if not chunks:
        raise HTTPException(status_code=400, detail="File does not contain usable text")

    upload_result = r2_service.upload_file_bytes(
        file_bytes=file_bytes,
        file_name=file_name,
        content_type=content_type,
    )
    base_title = title if title is not None else Path(file_name).stem

    records: list[KnowledgeChunk] = []
    for idx, chunk_content in enumerate(chunks, start=0):
        metadata = {
            "file_name": file_name,
            "base_title": base_title,
            "r2_key": upload_result["key"],
            "chunk_index": idx,
            "chunk_total": len(chunks),
        }
        if extra_metadata:
            metadata.update(extra_metadata)
        record = KnowledgeChunk(
            major_id=major_id,
            category=category,
            title=f"{base_title} - part {idx + 1}/{len(chunks)}",
            content=chunk_content,
            metadata_json=metadata,
            year=year,
            source=source or file_name,
            source_url=upload_result["url"],
            version=version_start,
            is_active=True,
            needs_embedding=True,
        )
        records.append(record)

    db.add_all(records)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        r2_service.delete_file(upload_result["key"])
        _raise_unique_error()

    for record in records:
        db.refresh(record)

    embedded_count = 0
    try:
        vectors = embedding_service.generate_list_embedding([embedding_service.build_chunk_text(item) for item in records])
        points = [
            PointStruct(
                id=str(item.id),
                vector=vector,
                payload=_build_chunk_payload(item),
            )
            for item, vector in zip(records, vectors)
        ]
        qdrant_service.upsert_knowledge_chunk_vectors(points)
        for item in records:
            item.needs_embedding = False
        db.commit()
        embedded_count = len(records)
    except Exception as exc:
        db.rollback()
        for item in records:
            item.needs_embedding = True
        db.commit()

    return {
        "file_name": file_name,
        "file_url": upload_result["url"],
        "r2_key": upload_result["key"],
        "total_chunks": len(records),
        "embedded_chunks": embedded_count,
        "failed_embedding_chunks": len(records) - embedded_count,
        "created_ids": [item.id for item in records],
    }


def delete_uploaded_file_chunks(
    *,
    db,
    r2_key: str | None = None,
    file_url: str | None = None,
):
    normalized_r2_key = (r2_key or "").strip()
    normalized_file_url = (file_url or "").strip()

    if not normalized_r2_key and not normalized_file_url:
        raise HTTPException(status_code=400, detail="r2_key or file_url is required")

    query = db.query(KnowledgeChunk).filter(KnowledgeChunk.is_active.is_(True))

    if normalized_r2_key:
        query = query.filter(KnowledgeChunk.metadata_json["r2_key"].as_string() == normalized_r2_key)
    else:
        query = query.filter(KnowledgeChunk.source_url == normalized_file_url)

    chunks = query.order_by(KnowledgeChunk.created_at.asc()).all()
    if not chunks:
        raise HTTPException(status_code=404, detail="No active knowledge chunks found for this uploaded file")

    chunk_ids = [chunk.id for chunk in chunks]

    qdrant_deleted = 0
    try:
        qdrant_service.delete_knowledge_chunk_vectors(chunk_ids)
        qdrant_deleted = len(chunk_ids)
    except Exception:
        qdrant_deleted = 0

    for chunk in chunks:
        chunk.is_active = False
        chunk.needs_embedding = False

    db.commit()

    deleted_r2_file = False
    if normalized_r2_key:
        try:
            r2_service.delete_file(normalized_r2_key)
            deleted_r2_file = True
        except Exception:
            deleted_r2_file = False

    return {
        "message": "Uploaded knowledge chunk file deactivated successfully",
        "r2_key": normalized_r2_key or (chunks[0].metadata_json or {}).get("r2_key"),
        "file_url": chunks[0].source_url,
        "total_chunks": len(chunks),
        "qdrant_deleted_chunks": qdrant_deleted,
        "db_deactivated_chunks": len(chunks),
        "r2_file_deleted": deleted_r2_file,
        "chunk_ids": chunk_ids,
    }
