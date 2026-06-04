import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from src.db.base import Base
from .enums import FeeType


class TuitionPolicy(Base):
    __tablename__ = "tuition_policy"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    major_id = Column(UUID(as_uuid=True), ForeignKey("major.id"), nullable=False)
    year = Column(Integer, nullable=False)

    fee_type = Column(Enum(FeeType), nullable=False)
    base_fee = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    major = relationship("Major", back_populates="tuition_policies")

    __table_args__ = (
        UniqueConstraint("major_id", "year", "fee_type", name="uq_major_year_fee_type"),
        Index("idx_tuition_major_id", "major_id"),
        Index("idx_tuition_year", "year"),
        Index("idx_tuition_is_active", "is_active"),
    )
