from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import FeeType


class TuitionPolicyCreate(BaseModel):
    major_id: UUID
    year: int = Field(..., ge=2000)
    fee_type: FeeType
    base_fee: float = Field(..., ge=0)
    is_active: bool = True


class TuitionPolicyUpdate(BaseModel):
    major_id: UUID | None = None
    year: int | None = Field(default=None, ge=2000)
    fee_type: FeeType | None = None
    base_fee: float | None = Field(default=None, ge=0)
    is_active: bool | None = None


class TuitionPolicyStatusUpdate(BaseModel):
    is_active: bool


class TuitionPolicyOut(BaseModel):
    id: UUID
    major_id: UUID
    year: int
    fee_type: FeeType
    base_fee: float
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TuitionPolicyListOut(BaseModel):
    items: list[TuitionPolicyOut]
    total: int
    limit: int
    offset: int
