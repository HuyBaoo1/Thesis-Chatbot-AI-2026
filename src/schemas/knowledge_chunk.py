from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import AdmissionCategory


class KnowledgeChunkCreate(BaseModel):
    major_id: UUID | None = None
    category: AdmissionCategory
    title: str | None = None
    content: str = Field(..., min_length=1)
    metadata_json: dict | list | None = None
    year: int | None = Field(default=None, ge=2000)
    source: str | None = None
    source_url: str | None = None
    version: int = Field(default=1, ge=1)
    is_active: bool = True
    needs_embedding: bool = True


class KnowledgeChunkUpdate(BaseModel):
    major_id: UUID | None = None
    category: AdmissionCategory | None = None
    title: str | None = None
    content: str | None = Field(default=None, min_length=1)
    metadata_json: dict | list | None = None
    year: int | None = Field(default=None, ge=2000)
    source: str | None = None
    source_url: str | None = None
    version: int | None = Field(default=None, ge=1)
    is_active: bool | None = None
    needs_embedding: bool | None = None


class KnowledgeChunkStatusUpdate(BaseModel):
    is_active: bool


class KnowledgeChunkOut(BaseModel):
    id: UUID
    major_id: UUID | None = None
    category: AdmissionCategory
    title: str | None = None
    content: str
    metadata_json: dict | list | None = None
    year: int | None = None
    source: str | None = None
    source_url: str | None = None
    version: int
    is_active: bool
    needs_embedding: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class KnowledgeChunkListOut(BaseModel):
    items: list[KnowledgeChunkOut]
    total: int
    limit: int
    offset: int


class KnowledgeChunkUploadOut(BaseModel):
    file_name: str
    file_url: str
    r2_key: str
    total_chunks: int
    embedded_chunks: int
    failed_embedding_chunks: int
    created_ids: list[UUID]


class KnowledgeChunkUploadedFileOut(BaseModel):
    r2_key: str
    file_name: str | None = None
    title: str | None = None
    file_url: str | None = None
    source: str | None = None
    year: int | None = None
    version: int | None = None
    chunk_count: int
    created_at: datetime | None = None
    updated_at: datetime | None = None


class KnowledgeChunkUploadedFileListOut(BaseModel):
    items: list[KnowledgeChunkUploadedFileOut]
    total: int
    limit: int
    offset: int
