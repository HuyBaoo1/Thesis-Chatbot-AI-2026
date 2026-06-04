import re
import unicodedata
from collections import Counter
from typing import Any

from src.services.chat_pipeline.types import PipelineState


def _normalize_text(text: str) -> str:
    text = str(text or "").lower().strip()
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"(?<=\d)[.,](?=\d)", "_", text)
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _tokenize(text: str) -> list[str]:
    normalized = _normalize_text(text)
    return [
        w
        for w in normalized.split()
        if len(w) > 1 or w.isdigit()
    ]


def _candidate_text(item: dict[str, Any]) -> str:
    year = item.get("year")
    year_text = str(year) if year is not None else ""

    return " ".join(
        [
            str(item.get("title") or ""),
            str(item.get("category") or ""),
            str(item.get("source") or ""),
            year_text,
            str(item.get("content") or ""),
        ]
    )


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _source_signal_bonus(item: dict[str, Any]) -> tuple[float, dict[str, Any]]:
    path = str(item.get("path") or "").lower()
    fusion_features = item.get("fusion_features") or {}

    match_count = max(0, int(fusion_features.get("match_count") or 0))
    if match_count == 0 and "sparse" in path and "dense" in path:
        match_count = 2

    rrf_score = max(0.0, _safe_float(fusion_features.get("rrf_score"), 0.0))
    raw_score_tie_break = _safe_float(fusion_features.get("raw_score_tie_break"), 0.0)
    raw_score_tie_break = max(0.0, min(raw_score_tie_break, 1.0))

    if "tool:" in path:
        source_bonus = 0.06
    elif "sparse" in path and "dense" in path:
        source_bonus = 0.04
        source_bonus += min(0.015 * max(match_count - 1, 0), 0.03)
        source_bonus += min(rrf_score * 0.2, 0.02)
        source_bonus += 0.01 * raw_score_tie_break
    elif "sparse" in path:
        source_bonus = 0.05 + 0.01 * raw_score_tie_break
    elif "dense" in path:
        source_bonus = 0.03 + 0.012 * raw_score_tie_break
    else:
        source_bonus = 0.0

    source_features = {
        "path": path,
        "match_count": match_count,
        "rrf_score": round(rrf_score, 4),
        "raw_score_tie_break": round(raw_score_tie_break, 4),
    }
    return source_bonus, source_features


def run_rerank(state: PipelineState, keep: int = 5) -> PipelineState:
    candidates = state.candidates or []

    if not candidates:
        state.reranked = []
        return state

    query_text = state.resolved_query or state.query or ""
    q_words = _tokenize(query_text)
    q_counter = Counter(q_words)

    rescored: list[dict[str, Any]] = []

    for item in candidates:
        content = _candidate_text(item)[:3000]
        text_words = _tokenize(content)
        text_word_set = set(text_words)

        overlap_count = sum(1 for w in q_counter if w in text_word_set)
        coverage = overlap_count / max(len(q_counter), 1)
        source_bonus, source_features = _source_signal_bonus(item)

        overlap_bonus = 0.12 * coverage

        content_len_penalty = 0.0
        if len(text_words) < 8:
            content_len_penalty = 0.03

        base_score = _safe_float(item.get("score"), 0.0)
        base_score = max(0.0, min(base_score, 1.0))

        final_score = base_score + overlap_bonus + source_bonus - content_len_penalty

        new_item = dict(item)
        new_item["score"] = round(final_score, 4)
        new_item["rerank_features"] = {
            "base_score": round(base_score, 4),
            "coverage": round(coverage, 4),
            "overlap_bonus": round(overlap_bonus, 4),
            "source_bonus": round(source_bonus, 4),
            "path_bonus": round(source_bonus, 4),
            "content_len_penalty": round(content_len_penalty, 4),
            "fusion_match_count": source_features["match_count"],
            "fusion_rrf_score": source_features["rrf_score"],
            "fusion_raw_score_tie_break": source_features["raw_score_tie_break"],
        }

        rescored.append(new_item)

    rescored.sort(key=lambda x: float(x.get("score", 0.0)), reverse=True)
    state.reranked = rescored[:keep]
    return state
