from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LeadMajorInterestCreate(BaseModel):
    major_id: UUID
    priority: int = Field(default=1, ge=0)


class LeadMajorInterestUpdate(BaseModel):
    priority: int = Field(..., ge=0)


class LeadMajorInterestOut(BaseModel):
    lead_id: UUID
    major_id: UUID
    priority: int | None = None
    major_code: str | None = None
    major_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class LeadMajorInterestListOut(BaseModel):
    lead_id: UUID
    items: list[LeadMajorInterestOut]
    total: int
