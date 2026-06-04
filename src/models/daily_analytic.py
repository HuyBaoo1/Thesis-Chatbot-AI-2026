import uuid
from sqlalchemy import Column, Date, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID

from src.db.base import Base


class DailyAnalytic(Base):
    __tablename__ = "daily_analytic"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    date = Column(Date, unique=True, nullable=False)

    total_chats = Column(Integer, default=0)
    new_leads = Column(Integer, default=0)
    fallbacks = Column(Integer, default=0)

    top_intents = Column(JSON, default=dict)
