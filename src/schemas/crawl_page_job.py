from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import AdmissionCategory
from src.schemas.knowledge_chunk import KnowledgeChunkUploadOut


class CrawlPageSuggestedMetadata(BaseModel):
    category: str | None = None
    title: str | None = None
    year: int | None = None
    source: str | None = None


class CrawlPageJobOut(BaseModel):
    id: UUID
    crawl_session_id: UUID
    source_url: str
    detected_title: str | None = None
    page_index: int | None = None
    md_r2_key: str | None = None
    content_hash: str | None = None
    status: str
    suggested_metadata: CrawlPageSuggestedMetadata | dict | None = None
    error_message: str | None = None
    title: str | None = None
    category: str | None = None
    year: int | None = None
    version_start: int | None = None
    sent_to_kb: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class CrawlPageJobListOut(BaseModel):
    items: list[CrawlPageJobOut]
    total: int
    limit: int
    offset: int
    has_more: bool


class CrawlPageContentUpdateRequest(BaseModel):
    content: str = Field(min_length=1)


class CrawlPageDownloadResponse(BaseModel):
    url: str


class CrawlPageSendToKbRequest(BaseModel):
    title: str = Field(..., min_length=1)
    category: AdmissionCategory
    year: int | None = Field(default=None, ge=2000)
    version_start: int = Field(default=1, ge=1)
    chunk_size: int = Field(default=1200, ge=100, le=5000)
    chunk_overlap: int = Field(default=100, ge=0, le=500)


class CrawlPageSendToKbResponse(BaseModel):
    page_job: CrawlPageJobOut
    kb_result: KnowledgeChunkUploadOut | None = None
    reused: bool = False
