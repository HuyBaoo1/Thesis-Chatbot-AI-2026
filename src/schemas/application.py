from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import AdmissionStage


class ApplicationCreate(BaseModel):
    lead_id: UUID
    major_id: UUID
    admission_year: int = Field(..., ge=2000, le=2100)
    stage: AdmissionStage = AdmissionStage.NEW
    note: str | None = None
    round_name: str | None = None
    source_channel: str | None = None


class ApplicationUpdate(BaseModel):
    lead_id: UUID | None = None
    major_id: UUID | None = None
    admission_year: int | None = Field(default=None, ge=2000, le=2100)
    stage: AdmissionStage | None = None
    note: str | None = None
    round_name: str | None = None
    source_channel: str | None = None


class ApplicationStageUpdate(BaseModel):
    stage: AdmissionStage


class ApplicationOut(BaseModel):
    id: UUID
    lead_id: UUID
    major_id: UUID
    stage: AdmissionStage
    note: str | None = None
    admission_year: int
    round_name: str | None = None
    source_channel: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ApplicationListOut(BaseModel):
    items: list[ApplicationOut]
    total: int
    limit: int
    offset: int
    has_more: bool
