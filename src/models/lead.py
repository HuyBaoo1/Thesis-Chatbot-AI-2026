import uuid
from sqlalchemy import Column, Index, String, DateTime, Enum, Float, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from src.db.base import Base
from .enums import LeadStatus, LeadTemperature


class Lead(Base):
    __tablename__ = "lead"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    full_name = Column(String, nullable=False)
    email = Column(String, unique=True)
    phone = Column(String, unique=True)

    high_school = Column(String)
    province = Column(String)

    status = Column(Enum(LeadStatus), default=LeadStatus.NEW)
    temperature = Column(Enum(LeadTemperature), default=LeadTemperature.COLD)
    score = Column(Integer, default=0)

    gpa = Column(Float)
    ielts = Column(Float)
    sat = Column(Integer)
    act = Column(Integer)

    cv_url = Column(String)
    essay_url = Column(String)
    transcript_url = Column(String)
    extracurriculars = Column(JSON)
    
    ability_score = Column(Float)
    aspiration_score = Column(Float)
    creativity_score = Column(Float)
    commitment_score = Column(Float)
    fit_score = Column(Float)

    assigned_staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"))
    telegram_chat_id = Column(String)
    zalo_user_id = Column(String)
    last_interaction_at = Column(DateTime)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    assigned_staff = relationship("Staff", back_populates="leads")
    conversations = relationship("Conversation", back_populates="lead")
    applications = relationship("Application", back_populates="lead")
    interests = relationship("LeadMajorInterest", back_populates="lead")
    activities = relationship("LeadActivity", back_populates="lead")
    notifications = relationship("Notification", back_populates="lead")

    __table_args__ = (
        Index("idx_lead_temperature", "temperature"),
        Index("idx_lead_score", "score"),
        Index("idx_lead_gpa", "gpa"),
        Index("idx_lead_ielts", "ielts"),
        Index("idx_lead_last_interaction_at", "last_interaction_at"),
    )