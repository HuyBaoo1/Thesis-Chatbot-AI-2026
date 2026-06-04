import uuid
from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from src.db.base import Base
from src.models.enums import MajorType


class Major(Base):
    __tablename__ = "major"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    duration = Column(Integer)  # years
    credits = Column(Integer, nullable=True)  # total credits required
    degree_type = Column(String)  # Bachelor, Doctor of Medicine...
    major_type = Column(Enum(MajorType), nullable=False, default=MajorType.UNDERGRAD_MAJOR)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    applications = relationship("Application", back_populates="major")
    tuition_policies = relationship("TuitionPolicy", back_populates="major")
    scholarship_policies = relationship("ScholarshipPolicy", back_populates="major")
    interests = relationship("LeadMajorInterest", back_populates="major")
    knowledge_chunks = relationship("KnowledgeChunk", back_populates="major")
