import logging
from time import perf_counter
from typing import Any

from langgraph.graph import END, StateGraph

from src.services.chat_pipeline.context_builder import build_context_block
from src.services.chat_pipeline.direct_response import (
    run_clarification_response,
    run_direct_response,
)
from src.services.chat_pipeline.guardrails import (
    run_input_guardrails,
    run_output_guardrails,
)
from src.services.chat_pipeline.history_response import run_history_response
from src.services.chat_pipeline.memory import load_memory_context
from src.services.chat_pipeline.prompt_builder import build_grounded_prompt
from src.services.chat_pipeline.query_context_resolver import resolve_query_context
from src.services.chat_pipeline.query_expansion import expand_query_state
from src.services.chat_pipeline.rerank import run_rerank
from src.services.chat_pipeline.retrieval_orchestrator import run_retrieval_orchestrator
from src.services.chat_pipeline.router_agent import run_router_agent
from src.services.chat_pipeline.semantic_answer_cache import (
    run_semantic_answer_cache_lookup,
    run_semantic_answer_cache_store,
)
from src.services.chat_pipeline.synthesis import run_synthesis
from src.services.chat_pipeline.types import PipelineState

logger = logging.getLogger(__name__)


def build_chat_graph(db):
    graph = StateGraph(dict)

    graph.add_node("input_guardrails", _node_input_guardrails)
    graph.add_node("memory_loader", _node_memory_loader(db))
    graph.add_node("context_resolver", _node_context_resolver(db))
    graph.add_node("router_agent", _node_router_agent)
    graph.add_node("query_expansion", _node_query_expansion)
    graph.add_node("direct_response", _node_direct_response)
    graph.add_node("history_response", _node_history_response)
    graph.add_node("clarification_response", _node_clarification_response)
    graph.add_node("retrieval_orchestrator", _node_retrieval_orchestrator(db))
    graph.add_node("rerank", _node_rerank)
    graph.add_node("context_builder", _node_context_builder)
    graph.add_node("prompt_builder", _node_prompt_builder)
    graph.add_node("semantic_answer_cache_lookup", _node_semantic_answer_cache_lookup)
    graph.add_node("synthesis", _node_synthesis)
    graph.add_node("output_guardrails", _node_output_guardrails)
    graph.add_node("semantic_answer_cache_store", _node_semantic_answer_cache_store)

    graph.set_entry_point("input_guardrails")
    graph.add_conditional_edges(
        "input_guardrails",
        _route_after_input_guardrails,
        {"blocked": END, "continue": "memory_loader"},
    )
    graph.add_edge("memory_loader", "router_agent")
    graph.add_conditional_edges(
        "router_agent",
        _route_after_router,
        {
            "direct": "direct_response",
            "history": "history_response",
            "clarify": "clarification_response",
            "retrieve": "context_resolver",
        },
    )
    graph.add_edge("context_resolver", "query_expansion")
    graph.add_edge("query_expansion", "retrieval_orchestrator")
    graph.add_edge("direct_response", "output_guardrails")
    graph.add_edge("history_response", "output_guardrails")
    graph.add_edge("clarification_response", "output_guardrails")
    graph.add_edge("retrieval_orchestrator", "rerank")
    graph.add_edge("rerank", "context_builder")
    graph.add_edge("context_builder", "prompt_builder")
    graph.add_edge("prompt_builder", "semantic_answer_cache_lookup")
    graph.add_conditional_edges(
        "semantic_answer_cache_lookup",
        _route_after_semantic_answer_cache_lookup,
        {
            "hit": "output_guardrails",
            "miss": "synthesis",
        },
    )
    graph.add_edge("synthesis", "output_guardrails")
    graph.add_edge("output_guardrails", "semantic_answer_cache_store")
    graph.add_edge("semantic_answer_cache_store", END)

    return graph.compile()


def _route_after_input_guardrails(state: dict[str, Any]) -> str:
    return "blocked" if bool(state.get("blocked")) else "continue"


def _route_after_router(state: dict[str, Any]) -> str:
    if state.get("answer_mode") == "history":
        return "history"
    if bool(state.get("needs_clarification")) or state.get("answer_mode") == "clarify":
        return "clarify"
    if not bool(state.get("needs_retrieval", True)) or state.get("answer_mode") == "direct":
        return "direct"
    return "retrieve"


def _node_input_guardrails(state: dict[str, Any]) -> dict[str, Any]:
    return _run_pipeline_fn(state, "input_guardrails", run_input_guardrails)


def _node_memory_loader(db):
    def _inner(state: dict[str, Any]) -> dict[str, Any]:
        return _run_pipeline_fn(state, "memory_loader", load_memory_context, db)

    return _inner


def _node_context_resolver(db):
    def _inner(state: dict[str, Any]) -> dict[str, Any]:
        return _run_pipeline_fn(state, "context_resolver", resolve_query_context, db)

    return _inner


def _node_router_agent(state: dict[str, Any]) -> dict[str, Any]:
    return _run_pipeline_fn(state, "router_agent", run_router_agent)


def _node_query_expansion(state: dict[str, Any]) -> dict[str, Any]:
    return _run_pipeline_fn(state, "query_expansion", expand_query_state)


def _node_direct_response(state: dict[str, Any]) -> dict[str, Any]:
    return _run_pipeline_fn(state, "direct_response", run_direct_response)


def _node_history_response(state: dict[str, Any]) -> dict[str, Any]:
    return _run_pipeline_fn(state, "history_response", run_history_response)


def _node_clarification_response(state: dict[str, Any]) -> dict[str, Any]:
    return _run_pipeline_fn(state, "clarification_response", run_clarification_response)


def _node_retrieval_orchestrator(db):
    def _inner(state: dict[str, Any]) -> dict[str, Any]:
        return _run_pipeline_fn(
            state,
            "retrieval_orchestrator",
            run_retrieval_orchestrator,
            db,
        )

    return _inner


def _node_rerank(state: dict[str, Any]) -> dict[str, Any]:
    started_at = perf_counter()
    pipeline_state = PipelineState(**state)
    keep = max(1, min(int(pipeline_state.rerank_keep or 5), 50))
    updated = run_rerank(pipeline_state, keep)
    _record_node_timing(updated, "rerank", started_at)
    return updated.__dict__


def _node_context_builder(state: dict[str, Any]) -> dict[str, Any]:
    return _run_pipeline_fn(state, "context_builder", build_context_block)


def _node_prompt_builder(state: dict[str, Any]) -> dict[str, Any]:
    return _run_pipeline_fn(state, "prompt_builder", build_grounded_prompt)


def _node_semantic_answer_cache_lookup(state: dict[str, Any]) -> dict[str, Any]:
    return _run_pipeline_fn(
        state,
        "semantic_answer_cache_lookup",
        run_semantic_answer_cache_lookup,
    )


def _node_synthesis(state: dict[str, Any]) -> dict[str, Any]:
    return _run_pipeline_fn(state, "synthesis", run_synthesis)


def _node_output_guardrails(state: dict[str, Any]) -> dict[str, Any]:
    return _run_pipeline_fn(state, "output_guardrails", run_output_guardrails)


def _node_semantic_answer_cache_store(state: dict[str, Any]) -> dict[str, Any]:
    return _run_pipeline_fn(
        state,
        "semantic_answer_cache_store",
        run_semantic_answer_cache_store,
    )


def _run_pipeline_fn(state: dict[str, Any], node_name: str, fn, *args) -> dict[str, Any]:
    started_at = perf_counter()
    pipeline_state = PipelineState(**state)
    updated = fn(pipeline_state, *args)
    _record_node_timing(updated, node_name, started_at)
    return updated.__dict__


def _record_node_timing(state: PipelineState, node_name: str, started_at: float) -> None:
    elapsed_ms = round((perf_counter() - started_at) * 1000, 2)
    timings = dict(state.node_timings_ms or {})
    timings[node_name] = elapsed_ms
    state.node_timings_ms = timings
    logger.info(
        "chat_pipeline_node_timing node=%s elapsed_ms=%.2f conversation_id=%s lead_id=%s",
        node_name,
        elapsed_ms,
        state.conversation_id,
        state.lead_id,
    )


def _route_after_semantic_answer_cache_lookup(state: dict[str, Any]) -> str:
    return "hit" if bool(state.get("answer_cache_hit")) else "miss"
