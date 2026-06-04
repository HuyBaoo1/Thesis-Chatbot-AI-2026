import uuid
import enum
from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Index,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from src.db.base import Base


class CrawlStatus(str, enum.Enum):
    PENDING = "PENDING"
    SCRAPING = "SCRAPING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class CrawlSession(Base):
    __tablename__ = "crawl_session"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_url = Column(String, nullable=False)
    limit = Column(Integer, default=100, nullable=False)
    status = Column(Enum(CrawlStatus), default=CrawlStatus.PENDING, nullable=False)
    total_pages = Column(Integer, default=0)
    completed_pages = Column(Integer, default=0)

    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    page_jobs = relationship(
        "CrawlPageJob",
        back_populates="crawl_session",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_crawl_session_status", "status"),
        Index("idx_crawl_session_created", "created_at"),
    )
