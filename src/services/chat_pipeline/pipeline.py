import json
import logging
import unicodedata
from datetime import datetime, timezone
from time import perf_counter

from fastapi import HTTPException

from src.models.enums import ConversationStatus
from src.schemas.chat_pipeline import ChatQueryRequest
from src.services.chat_pipeline.graph import build_chat_graph
from src.services.chat_pipeline.jobs import enqueue_chat_turn_side_effects
from src.services.chat_pipeline.types import PipelineState
from src.services.conversation_service import (
    ensure_conversation,
    schedule_conversation_ai_fallback,
)
from src.services.daily_analytic_service import increment_fallbacks
from src.services.lead_activity_service import (
    create_lead_activity,
    record_chat_turn_activity,
)
from src.services.lead_service import (
    apply_lead_updates,
    extract_lead_updates_from_text,
    next_missing_profile_question,
    recompute_lead_scoring,
)
from src.services.message_chunk_usage_service import create_message_chunk_usages
from src.services.message_service import (
    build_message_citations_from_chunks,
    create_assistant_message,
    create_user_message,
    get_recent_conversation_messages,
)

logger = logging.getLogger(__name__)


def _now_utc():
    return datetime.now(timezone.utc)


def run_chat_pipeline(request: ChatQueryRequest, db):
    request_started_at = perf_counter()
    state = PipelineState(
        query=request.query.strip(),
        lead_id=request.lead_id,
        conversation_id=request.conversation_id,
        top_k=request.top_k,
    )

    conversation = ensure_conversation(
        db,
        lead_id=request.lead_id,
        conversation_id=request.conversation_id,
        auto_commit=False,
        source_domain=request.source_domain,
    )
    if conversation.status == ConversationStatus.CLOSED:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Conversation is closed. Start a new conversation before sending more messages.",
        )

    user_message = create_user_message(
        db,
        conversation_id=conversation.id,
        content=state.query,
        auto_commit=False,
    )
    state.lead_id = conversation.lead_id
    state.conversation_id = conversation.id
    state.chat_history = _load_chat_history(
        db,
        conversation_id=conversation.id,
        limit=10,
        exclude_message_id=user_message.id,
    )

    if conversation.status == ConversationStatus.HANDOFF:
        try:
            schedule_conversation_ai_fallback(conversation)
            return _handle_handoff_conversation(
                db,
                conversation=conversation,
                user_message=user_message,
                state=state,
            )
        except HTTPException:
            db.rollback()
            raise

    db.commit()

    try:
        updates = extract_lead_updates_from_text(state.query)
        lead = apply_lead_updates(
            db,
            lead_id=conversation.lead_id,
            updates=updates,
            auto_commit=False,
        )

        follow_up_focus = _profile_follow_up_focus(state.query)
        state.profile_follow_up_question = (
            next_missing_profile_question(lead, focus=follow_up_focus)
            if follow_up_focus
            else None
        )

        graph = build_chat_graph(db)
        final_state_dict = graph.invoke(state.__dict__)
        final_state = PipelineState(**final_state_dict)
        _log_pipeline_timing_summary(
            final_state,
            started_at=request_started_at,
            phase="graph_completed",
        )

        if final_state.blocked:
            assistant_message = create_assistant_message(
                db,
                conversation_id=conversation.id,
                content=final_state.block_reason or "Noi dung bi chan boi guardrails.",
                intent="blocked",
                is_fallback=True,
                citations=[],
                auto_commit=False,
            )
            record_chat_turn_activity(
                db,
                lead_id=conversation.lead_id,
                intent="blocked",
                answer_mode="blocked",
                is_fallback=True,
                blocked=True,
                query=state.query,
                auto_commit=False,
            )
            lead_after = recompute_lead_scoring(
                db,
                lead_id=conversation.lead_id,
                auto_commit=False,
            )
            db.commit()
            enqueue_chat_turn_side_effects(
                conversation_id=conversation.id,
                lead_id=conversation.lead_id,
                query=state.query,
                intent="blocked",
                answer_mode="blocked",
                confidence=0.0,
                blocked=True,
                track_faq=False,
                track_intent_metric=False,
                user_message_id=user_message.id,
                assistant_message_id=assistant_message.id,
            )
            return {
                "conversation_id": conversation.id,
                "lead_id": conversation.lead_id,
                **_lead_response_fields(lead_after, conversation),
                "user_message_id": user_message.id,
                "assistant_message_id": assistant_message.id,
                "answer": assistant_message.content,
                "confidence": 0.0,
                "blocked": True,
                "retrieval_mode": "none",
                "selected_tools": final_state.selected_tools,
                "citations": [],
                "sources": [],
                "follow_up_suggestions": [],
                "created_at": _now_utc(),
            }

        final_answer = final_state.answer
        citations = build_message_citations_from_chunks(final_state.reranked)

        assistant_message = create_assistant_message(
            db,
            conversation_id=conversation.id,
            content=final_answer,
            intent=final_state.intent,
            is_fallback=(final_state.confidence < 0.4),
            citations=citations,
            auto_commit=False,
        )
        create_message_chunk_usages(
            db,
            message_id=assistant_message.id,
            chunks=final_state.reranked,
            auto_commit=False,
        )

        is_fallback = final_state.confidence < 0.4
        record_chat_turn_activity(
            db,
            lead_id=conversation.lead_id,
            intent=final_state.intent,
            answer_mode=final_state.answer_mode,
            is_fallback=is_fallback,
            blocked=False,
            query=state.query,
            auto_commit=False,
        )
        lead_after = recompute_lead_scoring(
            db,
            lead_id=conversation.lead_id,
            auto_commit=False,
        )
        db.commit()
        enqueue_chat_turn_side_effects(
            conversation_id=conversation.id,
            lead_id=conversation.lead_id,
            query=state.query,
            intent=final_state.intent,
            answer_mode=final_state.answer_mode,
            confidence=final_state.confidence,
            blocked=False,
            track_faq=(final_state.answer_mode not in {"direct", "history"}),
            track_intent_metric=(final_state.answer_mode != "history"),
            user_message_id=user_message.id,
            assistant_message_id=assistant_message.id,
        )

        return {
            "conversation_id": conversation.id,
            "lead_id": conversation.lead_id,
            **_lead_response_fields(lead_after, conversation),
            "user_message_id": user_message.id,
            "assistant_message_id": assistant_message.id,
            "answer": final_answer,
            "confidence": final_state.confidence,
            "blocked": False,
            "retrieval_mode": final_state.retrieval_mode,
            "selected_tools": final_state.selected_tools,
            "citations": citations,
            "sources": _build_sources(final_state),
            "follow_up_suggestions": final_state.follow_up_suggestions,
            "created_at": _now_utc(),
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        logger.exception(
            "chat_pipeline_failed total_elapsed_ms=%.2f lead_id=%s conversation_id=%s",
            (perf_counter() - request_started_at) * 1000,
            state.lead_id,
            state.conversation_id,
        )
        db.rollback()
        assistant_message = create_assistant_message(
            db,
            conversation_id=conversation.id,
           content=(
                "Mình đang gặp sự cố tạm thời khi xử lý câu hỏi này. "
                "Bạn thử gửi lại trong ít phút nữa giúp mình nhé."
            ),
            intent="system_error",
            is_fallback=True,
            citations=[],
        )
        increment_fallbacks(db, amount=1)
        create_lead_activity(
            db,
            lead_id=conversation.lead_id,
            action="PIPELINE_ERROR",
            score_delta=-1,
            extra_data={"query": state.query},
        )
        lead_after = recompute_lead_scoring(db, lead_id=conversation.lead_id)
        return {
            "conversation_id": conversation.id,
            "lead_id": conversation.lead_id,
            **_lead_response_fields(lead_after, conversation),
            "user_message_id": user_message.id,
            "assistant_message_id": assistant_message.id,
            "answer": assistant_message.content,
            "confidence": 0.0,
            "blocked": False,
            "retrieval_mode": "error",
            "selected_tools": [],
            "citations": [],
            "sources": [],
            "follow_up_suggestions": [],
            "created_at": _now_utc(),
        }


def _handle_handoff_conversation(db, *, conversation, user_message, state: PipelineState) -> dict:
    updates = extract_lead_updates_from_text(state.query)
    apply_lead_updates(
        db,
        lead_id=conversation.lead_id,
        updates=updates,
        auto_commit=False,
    )
    lead_after = recompute_lead_scoring(
        db,
        lead_id=conversation.lead_id,
        auto_commit=False,
    )
    db.commit()
    return {
        "conversation_id": conversation.id,
        "lead_id": conversation.lead_id,
        **_lead_response_fields(lead_after, conversation),
        "user_message_id": user_message.id,
        "assistant_message_id": None,
        "answer": "",
        "confidence": 1.0,
        "blocked": False,
        "retrieval_mode": "handoff",
        "selected_tools": [],
        "citations": [],
        "sources": [],
        "follow_up_suggestions": [],
        "created_at": _now_utc(),
    }


def _build_sources(state: PipelineState) -> list[dict]:
    return [
        {
            "chunk_id": item.get("chunk_id"),
            "category": str(item.get("category") or ""),
            "source": str(item.get("source") or ""),
            "score": float(item.get("score", 0.0)),
            "content": str(item.get("content") or ""),
        }
        for item in state.reranked
    ]


def _lead_response_fields(lead, conversation) -> dict:
    return {
        "lead_temperature": lead.temperature if lead else None,
        "lead_score": lead.score if lead else None,
        "conversation_status": conversation.status if conversation else None,
        "conversation_staff_id": conversation.staff_id if conversation else None,
    }


def _log_pipeline_timing_summary(
    state: PipelineState,
    *,
    started_at: float,
    phase: str,
) -> None:
    total_elapsed_ms = round((perf_counter() - started_at) * 1000, 2)
    logger.info(
        "chat_pipeline_timing_summary phase=%s total_elapsed_ms=%.2f conversation_id=%s lead_id=%s node_timings_ms=%s",
        phase,
        total_elapsed_ms,
        state.conversation_id,
        state.lead_id,
        json.dumps(state.node_timings_ms, sort_keys=True),
    )


def _load_chat_history(db, *, conversation_id, limit: int, exclude_message_id=None) -> list[dict]:
    fetch_limit = limit + 1 if exclude_message_id is not None else limit
    messages = get_recent_conversation_messages(
        db,
        conversation_id=conversation_id,
        limit=fetch_limit,
    )
    history: list[dict] = []
    for item in messages:
        if exclude_message_id is not None and item.id == exclude_message_id:
            continue
        history.append(
            {
                "role": item.role.value.lower() if item.role else "user",
                "content": item.content or "",
            }
        )
    return history[-limit:]


def _profile_follow_up_focus(query: str) -> str | None:
    q = _normalize_for_matching(query)
    if any(
        token in q
        for token in ["hoc bong", "scholarship", "financial aid", "tai tro", "ho tro tai chinh"]
    ):
        return "scholarship_lookup"
    if any(token in q for token in ["hoc phi", "tuition", "chi phi"]):
        return "tuition_lookup"
    if any(
        token in q
        for token in [
            "dieu kien",
            "yeu cau",
            "requirement",
            "admission",
            "diem dau vao",
            "dau vao",
            "nhap hoc",
        ]
    ):
        return "admission_requirement"
    if any(token in q for token in ["dia chi", "campus", "truong o dau", "school"]):
        return "school_info"
    if any(
        token in q
        for token in [
            "nganh",
            "major",
            "chuong trinh",
            "program",
            "mon hoc",
            "cac mon",
            "khoa hoc",
            "course",
            "courses",
            "curriculum",
            "cau truc chuong trinh",
            "khung chuong trinh",
            "tin chi",
            "credits",
        ]
    ):
        return "program_info"
    return None


def _normalize_for_matching(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("\u0111", "d").replace("\u0110", "D")
    normalized = normalized.lower().strip()
    return " ".join(normalized.split())
