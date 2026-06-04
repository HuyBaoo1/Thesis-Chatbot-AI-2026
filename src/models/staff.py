import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from src.db.base import Base
from .enums import StaffRole


class Staff(Base):
    __tablename__ = "staff"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)

    role = Column(Enum(StaffRole), default=StaffRole.COUNSELOR)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    conversations = relationship("Conversation", back_populates="staff")
    leads = relationship("Lead", back_populates="assigned_staff")
    notifications = relationship("Notification", back_populates="staff")
