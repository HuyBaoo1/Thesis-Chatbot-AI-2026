from pydantic import BaseModel, Field
from typing import Optional

from src.models.enums import AdmissionCategory


class CategorySuggestion(BaseModel):
    category_id: str
    confidence: float
    reason: Optional[str] = None
    needs_review: bool = False


class OcrJobCreate(BaseModel):
    title: str
    year: int | None = None
    version_start: int = 1
    category: AdmissionCategory


class OcrJobResponse(BaseModel):
    job_id: str
    status: str  # queued, processing, completed, failed
    original_filename: Optional[str] = None
    title: Optional[str] = None
    year: Optional[int] = None
    version_start: Optional[int] = None
    category: Optional[str] = None
    suggested_category: Optional[CategorySuggestion] = None
    md_r2_key: Optional[str] = None
    pages: Optional[int] = None
    error_message: Optional[str] = None
    reused: bool = False
    duplicate_of_job_id: Optional[str] = None


class OcrJobStatus(BaseModel):
    job_id: str
    status: str
    original_filename: Optional[str] = None
    title: Optional[str] = None
    year: Optional[int] = None
    version_start: Optional[int] = None
    category: Optional[str] = None
    progress: Optional[int] = None
    stage: Optional[str] = None
    suggested_category: Optional[CategorySuggestion] = None
    md_r2_key: Optional[str] = None
    pages: Optional[int] = None
    error_message: Optional[str] = None
    sent_to_kb: Optional[str] = None


class OcrDownloadResponse(BaseModel):
    url: str


class OcrJobListResponse(BaseModel):
    jobs: list[OcrJobStatus]
    total: int
    page: int
    page_size: int
    pages: int


class OcrContentUpdateRequest(BaseModel):
    content: str = Field(min_length=1)


class SendToKbRequest(BaseModel):
    category: AdmissionCategory | None = None
    chunk_size: int = Field(default=1200, ge=100, le=5000)
    chunk_overlap: int = Field(default=100, ge=0, le=500)
