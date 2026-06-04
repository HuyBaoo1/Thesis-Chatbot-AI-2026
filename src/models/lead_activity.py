import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from src.db.base import Base


class LeadActivity(Base):
    __tablename__ = "lead_activity"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    lead_id = Column(UUID(as_uuid=True), ForeignKey("lead.id"))

    action = Column(String, nullable=False)
    score_delta = Column(Integer, default=0)
    extra_data = Column(JSON)

    created_at = Column(DateTime, server_default=func.now())

    lead = relationship("Lead", back_populates="activities")