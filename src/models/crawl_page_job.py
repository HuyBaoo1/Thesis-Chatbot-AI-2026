import enum
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.db.base import Base


class CrawlPageJobStatus(str, enum.Enum):
    COMPLETED = "completed"
    FAILED = "failed"


class CrawlPageJob(Base):
    __tablename__ = "crawl_page_job"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    crawl_session_id = Column(UUID(as_uuid=True), ForeignKey("crawl_session.id"), nullable=False)

    source_url = Column(String, nullable=False)
    detected_title = Column(String, nullable=True)
    page_index = Column(Integer, nullable=True)

    md_r2_key = Column(String, nullable=True)
    content_hash = Column(String, nullable=True, index=True)
    status = Column(String, nullable=False, default=CrawlPageJobStatus.COMPLETED.value)
    suggested_metadata = Column(JSON, nullable=True)
    firecrawl_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)

    # Final KB metadata is chosen when this page is sent to the knowledge base.
    title = Column(String, nullable=True)
    category = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    version_start = Column(Integer, nullable=True)
    sent_to_kb = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    crawl_session = relationship("CrawlSession", back_populates="page_jobs")

    __table_args__ = (
        UniqueConstraint("crawl_session_id", "source_url", name="uq_crawl_page_job_session_source_url"),
        Index("idx_crawl_page_job_session", "crawl_session_id"),
        Index("idx_crawl_page_job_status", "status"),
        Index("idx_crawl_page_job_sent_to_kb", "sent_to_kb"),
        Index("idx_crawl_page_job_created", "created_at"),
    )
