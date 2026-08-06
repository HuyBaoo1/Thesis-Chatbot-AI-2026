from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

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


class CrawlManualSourceCreate(BaseModel):
    source_url: str = Field(..., min_length=1)
    source_title: str = Field(..., min_length=1)
    reviewed_markdown: str = Field(..., min_length=1)
    source_scope: str = Field(..., min_length=1)
    review_status: Literal["verified"] = "verified"
    effective_context: str = Field(..., min_length=1)

    @field_validator("reviewed_markdown")
    @classmethod
    def validate_reviewed_markdown(cls, value: str) -> str:
        normalized = value.replace("\r\n", "\n").replace("\r", "\n")
        if not normalized.strip():
            raise ValueError("reviewed_markdown cannot be empty")
        lowered = normalized.lower()
        if "needs_review" in lowered:
            raise ValueError("needs_review Markdown cannot be imported as a verified manual source")
        return normalized


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
