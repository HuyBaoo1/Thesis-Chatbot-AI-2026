from pydantic import BaseModel, Field


class AsrTranscriptionResponse(BaseModel):
    transcript: str = Field(..., min_length=1)
    language: str = Field(default="vi", min_length=2, max_length=16)
    duration_seconds: float = Field(..., ge=0)
    model: str
    requires_user_review: bool = True
