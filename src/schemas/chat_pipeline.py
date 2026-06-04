from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from src.models.enums import Channel, ConversationStatus, LeadTemperature, MessageRole


class LeadInitRequest(BaseModel):
    full_name: str = Field(..., min_length=1)
    email: str | None = None
    phone: str | None = None

    @model_validator(mode="after")
    def validate_contact(self):
        if not (self.email or self.phone):
            raise ValueError("email or phone is required")
        return self


class LeadInitResponse(BaseModel):
    lead_id: UUID
    full_name: str
    email: str | None = None
    phone: str | None = None


class ChatQueryRequest(BaseModel):
    lead_id: UUID
    conversation_id: UUID | None = None
    conversation_token: str | None = None
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=10, ge=3, le=50)
    source_domain: str | None = None

    @model_validator(mode="after")
    def validate_pre_chat_identity(self):
        if self.conversation_id is not None:
            return self
        if self.lead_id is None:
            raise ValueError("lead_id is required for a new conversation")
        return self


class SourceItem(BaseModel):
    chunk_id: UUID | None = None
    category: str | None = None
    source: str | None = None
    score: float = 0.0
    content: str


class CitationItem(BaseModel):
    url: str


class ChatQueryResponse(BaseModel):
    conversation_id: UUID
    conversation_token: str | None = None
    lead_id: UUID | None = None
    lead_temperature: LeadTemperature | None = None
    lead_score: int | None = None
    conversation_status: ConversationStatus | None = None
    conversation_staff_id: UUID | None = None
    user_message_id: UUID
    assistant_message_id: UUID | None = None
    answer: str
    confidence: float
    blocked: bool = False
    retrieval_mode: str
    selected_tools: list[str]
    citations: list[CitationItem] = Field(default_factory=list)
    sources: list[SourceItem]
    follow_up_suggestions: list[str]
    created_at: datetime


class ChatMessageOut(BaseModel):
    id: UUID
    conversation_id: UUID
    role: MessageRole
    content: str
    intent: str | None = None
    is_fallback: bool = False
    citations: list[CitationItem] = Field(default_factory=list)
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ChatMessagesPageOut(BaseModel):
    conversation_id: UUID
    items: list[ChatMessageOut]
    total: int
    limit: int
    before: datetime | None = None
    next_before: datetime | None = None
    has_more: bool


class ChatConversationOut(BaseModel):
    id: UUID
    conversation_token: str | None = None
    lead_id: UUID
    lead_full_name: str | None = None
    lead_email: str | None = None
    lead_phone: str | None = None
    lead_temperature: LeadTemperature | None = None
    lead_score: int | None = None
    staff_id: UUID | None = None
    staff_name: str | None = None
    channel: Channel | None = None
    status: ConversationStatus | None = None
    summary: str | None = None
    source_domain: str | None = None
    last_message: str | None = None
    last_message_at: datetime | None = None
    message_count: int
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ChatConversationStatusUpdate(BaseModel):
    status: ConversationStatus


class StaffChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1)


class LeadConversationsPageOut(BaseModel):
    lead_id: UUID
    items: list[ChatConversationOut]
    total: int
    limit: int
    before: str | None = None
    next_before: str | None = None
    has_more: bool


class ChatConversationsPageOut(BaseModel):
    items: list[ChatConversationOut]
    total: int
    limit: int
    before: str | None = None
    next_before: str | None = None
    has_more: bool


class MessageSourceOut(BaseModel):
    id: UUID
    message_id: UUID
    chunk_id: UUID
    rank: int | None = None
    score: float | None = None
    content: str | None = None
    category: str | None = None
    source: str | None = None

    model_config = ConfigDict(from_attributes=True)


class MessageSourcesOut(BaseModel):
    message_id: UUID
    items: list[MessageSourceOut]
    total: int
