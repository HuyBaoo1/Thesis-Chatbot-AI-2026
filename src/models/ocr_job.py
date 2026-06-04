import uuid
from sqlalchemy import Column, DateTime, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from src.db.base import Base


class OcrJob(Base):
    __tablename__ = "ocr_job"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rq_job_id = Column(String, nullable=False, unique=True, index=True)

    original_filename = Column(String, nullable=False)
    source_file_hash = Column(String, index=True)
    content_hash = Column(String, index=True)
    pipeline_version = Column(String, index=True)
    source_r2_key = Column(String)
    md_r2_key = Column(String)

    # Upload metadata
    title = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    version_start = Column(Integer, nullable=True)
    category = Column(String, nullable=True)

    # Processing
    status = Column(String, nullable=False, default="queued")  # queued/processing/completed/failed
    suggested_category = Column(JSON)  # kept for backwards compat during migration
    pages = Column(Integer)

    error_message = Column(Text)
    sent_to_kb = Column(String)  # chunk_id if sent, null otherwise

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
