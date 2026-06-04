import uuid
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from src.db.base import Base
from .enums import AdmissionCategory


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunk"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    major_id = Column(UUID(as_uuid=True), ForeignKey("major.id"))
    category = Column(Enum(AdmissionCategory), nullable=False)

    title = Column(String)
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON)

    year = Column(Integer)
    source = Column(String)
    source_url = Column(String)

    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    needs_embedding = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    major = relationship("Major", back_populates="knowledge_chunks")

    __table_args__ = (
        Index("idx_knowledge_major_id", "major_id"),
        Index("idx_knowledge_category", "category"),
        Index("idx_knowledge_year", "year"),
        Index("idx_knowledge_is_active", "is_active"),
    )