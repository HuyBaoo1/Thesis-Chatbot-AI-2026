from src.db.base import Base
from sqlalchemy import JSON, Column, Float, ForeignKey, Index, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy.sql import func
from src.models.enums import ScholarshipScope, ScholarshipType, ScholarshipValueType
from sqlalchemy.orm import relationship

class ScholarshipPolicy(Base):
    __tablename__ = "scholarship_policy"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    major_id = Column(UUID(as_uuid=True), ForeignKey("major.id"), nullable=True)
    year = Column(Integer, nullable=False)

    name = Column(String, nullable=False)
    type = Column(Enum(ScholarshipType), nullable=False)
    scope = Column(Enum(ScholarshipScope), default=ScholarshipScope.GLOBAL, nullable=False)
    value_type = Column(Enum(ScholarshipValueType), nullable=False)
    value = Column(Float)

    criteria = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    major = relationship("Major", back_populates="scholarship_policies")

    __table_args__ = (
        Index("idx_scholarship_major_id", "major_id"),
        Index("idx_scholarship_year", "year"),
        Index("idx_scholarship_type", "type"),
        Index("idx_scholarship_scope", "scope"),
        Index("idx_scholarship_is_active", "is_active"),
    )