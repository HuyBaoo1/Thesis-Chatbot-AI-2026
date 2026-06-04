from uuid import UUID

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.models.enums import StaffRole


class StaffCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: StaffRole 


class StaffUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6)
    role: StaffRole | None = None


class StaffStatusUpdate(BaseModel):
    is_active: bool


class StaffOut(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: StaffRole
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class StaffListOut(BaseModel):
    items: list[StaffOut]
    total: int
    limit: int
    offset: int
