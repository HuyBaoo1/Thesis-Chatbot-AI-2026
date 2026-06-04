from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from src.models.enums import MajorType


class MajorCreate(BaseModel):
    code: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    description: str | None = None
    credits: int | None = Field(default=None, ge=0)
    duration: int | None = Field(default=None, ge=0)
    degree_type: str | None = None
    major_type: MajorType = MajorType.UNDERGRAD_MAJOR
    is_active: bool = True


class MajorUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1)
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    credits: int | None = Field(default=None, ge=0)
    duration: int | None = Field(default=None, ge=0)
    degree_type: str | None = None
    major_type: MajorType | None = None
    is_active: bool | None = None


class MajorStatusUpdate(BaseModel):
    is_active: bool


class MajorOut(BaseModel):
    id: UUID
    code: str
    name: str
    description: str | None = None
    credits: int | None = None
    duration: int | None = None
    degree_type: str | None = None
    major_type: MajorType
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class MajorListOut(BaseModel):
    items: list[MajorOut]
    total: int
    limit: int
    offset: int
