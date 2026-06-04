from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CrawlSessionCreate(BaseModel):
    target_url: str = Field(..., description="URL to crawl")
    limit: int = Field(default=100, ge=1, le=10000)


class CrawlSessionOut(BaseModel):
    id: UUID
    target_url: str
    limit: int
    status: str
    total_pages: int
    completed_pages: int
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class CrawlSessionListOut(BaseModel):
    items: list[CrawlSessionOut]
    total: int
    limit: int
    offset: int
    has_more: bool


class CrawlSessionPollOut(BaseModel):
    id: UUID
    status: str
    completed: int
    total: int
