from dataclasses import dataclass, field
from uuid import UUID


@dataclass
class PipelineState:
    query: str
    lead_id: UUID | None = None
    conversation_id: UUID | None = None
    top_k: int = 10
    rerank_keep: int = 5
    blocked: bool = False
    block_reason: str | None = None
    intent: str = "general_question"
    datasource: str = "knowledge_chunk"
    retrieval_mode: str = "none"
    answer_mode: str = "retrieve"
    needs_retrieval: bool = True
    needs_tools: bool = True
    needs_clarification: bool = False
    clarification_question: str | None = None
    rewrite_query: bool = False
    resolved_query: str | None = None
    search_query: str | None = None
    chat_history: list[dict] = field(default_factory=list)
    lead_profile: dict = field(default_factory=dict)
    profile_follow_up_question: str | None = None
    conversation_summary: str = ""
    long_term_memory: dict = field(default_factory=dict)
    episodic_memory: list[dict] = field(default_factory=list)
    semantic_memory: list[dict] = field(default_factory=list)
    memory_context: str = ""
    resolved_context: dict = field(default_factory=dict)
    selected_tools: list[str] = field(default_factory=list)
    candidates: list[dict] = field(default_factory=list)
    reranked: list[dict] = field(default_factory=list)
    context_block: str = ""
    grounded_prompt: str = ""
    answer: str = ""
    confidence: float = 0.0
    follow_up_suggestions: list[str] = field(default_factory=list)
    answer_cache_hit: bool = False
    answer_cache_id: str | None = None
    answer_cache_score: float | None = None
    answer_cache_vector: list[float] = field(default_factory=list)
    node_timings_ms: dict[str, float] = field(default_factory=dict)
