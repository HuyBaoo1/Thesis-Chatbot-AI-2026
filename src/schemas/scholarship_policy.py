from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import ScholarshipScope, ScholarshipType, ScholarshipValueType


class ScholarshipPolicyCreate(BaseModel):
    major_id: UUID | None = None
    year: int = Field(..., ge=2000)
    name: str = Field(..., min_length=1)
    type: ScholarshipType
    scope: ScholarshipScope = ScholarshipScope.GLOBAL
    value_type: ScholarshipValueType
    value: float | None = Field(default=None, ge=0)
    criteria: dict | list
    is_active: bool = True


class ScholarshipPolicyUpdate(BaseModel):
    major_id: UUID | None = None
    year: int | None = Field(default=None, ge=2000)
    name: str | None = Field(default=None, min_length=1)
    type: ScholarshipType | None = None
    scope: ScholarshipScope | None = None
    value_type: ScholarshipValueType | None = None
    value: float | None = Field(default=None, ge=0)
    criteria: dict | list | None = None
    is_active: bool | None = None


class ScholarshipPolicyOut(BaseModel):
    id: UUID
    major_id: UUID | None = None
    year: int
    name: str
    type: ScholarshipType
    scope: ScholarshipScope
    value_type: ScholarshipValueType
    value: float | None = None
    criteria: dict | list
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ScholarshipPolicyListOut(BaseModel):
    items: list[ScholarshipPolicyOut]
    total: int
    limit: int
    offset: int
