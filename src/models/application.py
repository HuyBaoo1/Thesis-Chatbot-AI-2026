import uuid
from sqlalchemy import Column, Index, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from src.db.base import Base
from .enums import AdmissionStage


class Application(Base):
    __tablename__ = "application"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    lead_id = Column(UUID(as_uuid=True), ForeignKey("lead.id"), nullable=False)
    major_id = Column(UUID(as_uuid=True), ForeignKey("major.id"), nullable=False)

    stage = Column(Enum(AdmissionStage), default=AdmissionStage.NEW)
    note = Column(String)

    admission_year = Column(Integer, nullable=False)
    round_name = Column(String)  # Early / Regular / Rolling
    source_channel = Column(String)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    lead = relationship("Lead", back_populates="applications")
    major = relationship("Major", back_populates="applications")

    __table_args__ = (
        Index("idx_application_lead_id", "lead_id"),
        Index("idx_application_major_id", "major_id"),
        Index("idx_application_stage", "stage"),
        Index("idx_application_admission_year", "admission_year"),
    )