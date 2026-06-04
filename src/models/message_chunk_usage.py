import uuid
from sqlalchemy import Column, DateTime, Index, String, Float, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.db.base import Base


class MessageChunkUsage(Base):
    __tablename__ = "message_chunk_usage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("message.id"), nullable=False)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_chunk.id"), nullable=False)

    rank = Column(Integer)
    score = Column(Float)

    content = Column(Text)
    category = Column(String)
    source = Column(String)

    created_at = Column(DateTime, server_default=func.now())

    message = relationship("Message", back_populates="chunks_used")

    __table_args__ = (
        Index("idx_msg_chunk_message_id", "message_id"),
        Index("idx_msg_chunk_chunk_id", "chunk_id"),
        Index("idx_msg_chunk_created_at", "created_at"),
    )
