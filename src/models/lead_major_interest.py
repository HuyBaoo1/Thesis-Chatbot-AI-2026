import uuid
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from src.db.base import Base


class LeadMajorInterest(Base):
    __tablename__ = "lead_major_interest"

    lead_id = Column(UUID(as_uuid=True), ForeignKey("lead.id"), primary_key=True)
    major_id = Column(UUID(as_uuid=True), ForeignKey("major.id"), primary_key=True)

    priority = Column(Integer)

    lead = relationship("Lead", back_populates="interests")
    major = relationship("Major", back_populates="interests")