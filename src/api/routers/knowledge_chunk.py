from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status

from src.api.deps import require_role
from src.db import session
from src.models.enums import AdmissionCategory, StaffRole
from src.schemas.knowledge_chunk import (
    KnowledgeChunkCreate,
    KnowledgeChunkListOut,
    KnowledgeChunkOut,
    KnowledgeChunkStatusUpdate,
    KnowledgeChunkUploadOut,
    KnowledgeChunkUploadedFileListOut,
    KnowledgeChunkUpdate,
)
from src.services import knowledge_chunk_service


router = APIRouter(prefix="/knowledge-chunks", tags=["Knowledge Chunk"])
admin_required = require_role([StaffRole.ADMIN])
staff_required = require_role([StaffRole.ADMIN, StaffRole.COUNSELOR])


@router.get("", response_model=KnowledgeChunkListOut)
def list_knowledge_chunks(
    q: str | None = Query(default=None, min_length=1),
    category: AdmissionCategory | None = Query(default=None),
    major_id: UUID | None = Query(default=None),
    year: int | None = Query(default=None, ge=2000),
    source: str | None = Query(default=None, min_length=1),
    is_active: bool | None = Query(default=None),
    needs_embedding: bool | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return knowledge_chunk_service.list_knowledge_chunks(
        db,
        q=q,
        category=category,
        major_id=major_id,
        year=year,
        source=source,
        is_active=is_active,
        needs_embedding=needs_embedding,
        limit=limit,
        offset=offset,
    )


@router.post("/rebuild-missing-embeddings")
def rebuild_missing_embeddings(
    limit: int = Query(default=100, ge=1, le=500),
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return knowledge_chunk_service.rebuild_missing_embeddings(db, limit=limit)


@router.get("/uploaded-files", response_model=KnowledgeChunkUploadedFileListOut)
def list_uploaded_knowledge_chunk_files(
    title: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return knowledge_chunk_service.list_uploaded_knowledge_files(
        db,
        title=title,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=KnowledgeChunkOut, status_code=status.HTTP_201_CREATED)
def create_knowledge_chunk(
    data: KnowledgeChunkCreate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return knowledge_chunk_service.create_knowledge_chunk(data, db)


@router.patch("/{chunk_id}", response_model=KnowledgeChunkOut)
def update_knowledge_chunk(
    chunk_id: UUID,
    data: KnowledgeChunkUpdate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return knowledge_chunk_service.update_knowledge_chunk(chunk_id, data, db)


@router.patch("/{chunk_id}/status", response_model=KnowledgeChunkOut)
def update_knowledge_chunk_status(
    chunk_id: UUID,
    data: KnowledgeChunkStatusUpdate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return knowledge_chunk_service.update_knowledge_chunk_status(chunk_id, data, db)


@router.delete("/{chunk_id}")
def delete_knowledge_chunk(
    chunk_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return knowledge_chunk_service.delete_knowledge_chunk(chunk_id, db)


@router.post("/upload-file", response_model=KnowledgeChunkUploadOut, status_code=status.HTTP_201_CREATED)
async def upload_knowledge_chunk_file(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: AdmissionCategory = Form(...),
    year: int | None = Form(default=None),
    version_start: int = Form(default=1),
    major_id: UUID | None = Form(default=None),
    chunk_size: int = Form(default=1200),
    chunk_overlap: int = Form(default=100),
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    file_bytes = await file.read()
    return knowledge_chunk_service.upload_file_to_chunks(
        file_name=file.filename or "uploaded_file.txt",
        file_bytes=file_bytes,
        content_type=file.content_type,
        title=title,
        category=category,
        major_id=major_id,
        year=year,
        version_start=version_start,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        db=db,
    )


@router.delete("/delete/uploaded-file")
def delete_uploaded_knowledge_chunk_file(
    r2_key: str | None = Query(default=None),
    file_url: str | None = Query(default=None),
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return knowledge_chunk_service.delete_uploaded_file_chunks(
        db=db,
        r2_key=r2_key,
        file_url=file_url,
    )


@router.get("/{chunk_id}", response_model=KnowledgeChunkOut)
def get_knowledge_chunk(
    chunk_id: UUID,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return knowledge_chunk_service.get_knowledge_chunk_or_404(chunk_id, db)

