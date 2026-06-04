from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LeadActivityCreate(BaseModel):
    action: str = Field(..., min_length=1)
    score_delta: int = 0
    extra_data: dict | None = None


class LeadActivityOut(BaseModel):
    id: UUID
    lead_id: UUID | None = None
    action: str
    score_delta: int
    extra_data: dict | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class LeadActivityListOut(BaseModel):
    items: list[LeadActivityOut]
    total: int
    limit: int
    offset: int
    has_more: bool
