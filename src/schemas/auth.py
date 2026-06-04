import re

from pydantic import BaseModel, EmailStr, Field, model_validator


def _validate_password_complexity(v: str, field_name: str) -> str:
    if len(v) < 6:
        raise ValueError(f"{field_name} must be at least 6 characters")
    if not re.search(r"[A-Z]", v):
        raise ValueError(f"{field_name} must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError(f"{field_name} must contain at least one lowercase letter")
    if not re.search(r"\d", v):
        raise ValueError(f"{field_name} must contain at least one digit")
    return v


class StaffLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class ChangePassword(BaseModel):
    old_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)

    @model_validator(mode="after")
    def validate_new_password(self):
        _validate_password_complexity(self.new_password, "new_password")
        if self.old_password == self.new_password:
            raise ValueError("New password must be different from old password")
        return self
