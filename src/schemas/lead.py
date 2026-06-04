from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import LeadStatus, LeadTemperature


class LeadUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1)
    email: str | None = None
    phone: str | None = None
    high_school: str | None = None
    province: str | None = None
    status: LeadStatus | None = None
    temperature: LeadTemperature | None = None
    gpa: float | None = Field(default=None, ge=0)
    ielts: float | None = Field(default=None, ge=0, le=9)
    sat: int | None = Field(default=None, ge=0)
    act: int | None = Field(default=None, ge=0)
    cv_url: str | None = None
    essay_url: str | None = None
    transcript_url: str | None = None
    extracurriculars: dict | list | None = None
    ability_score: float | None = Field(default=None, ge=0)
    aspiration_score: float | None = Field(default=None, ge=0)
    creativity_score: float | None = Field(default=None, ge=0)
    commitment_score: float | None = Field(default=None, ge=0)
    fit_score: float | None = Field(default=None, ge=0)


class LeadOut(BaseModel):
    id: UUID
    full_name: str
    email: str | None = None
    phone: str | None = None
    high_school: str | None = None
    province: str | None = None
    status: LeadStatus | None = None
    temperature: LeadTemperature | None = None
    score: int | None = None
    gpa: float | None = None
    ielts: float | None = None
    sat: int | None = None
    act: int | None = None
    cv_url: str | None = None
    essay_url: str | None = None
    transcript_url: str | None = None
    extracurriculars: dict | list | None = None
    ability_score: float | None = None
    aspiration_score: float | None = None
    creativity_score: float | None = None
    commitment_score: float | None = None
    fit_score: float | None = None
    assigned_staff_id: UUID | None = None
    last_interaction_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class LeadListOut(BaseModel):
    items: list[LeadOut]
    total: int
    limit: int
    offset: int
    has_more: bool
