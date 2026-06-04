from typing import Any
import logging
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from uuid import UUID
from sqlalchemy import or_
from src.integrations.embedding_client import get_embeddings_client
from src.models.knowledge_chunk import KnowledgeChunk
from src.services import qdrant_service
try:
    from rank_bm25 import BM25Okapi
except ImportError:
    BM25Okapi = None


logger = logging.getLogger(__name__)


_HYBRID_RRF_K = 25
_HYBRID_RAW_SCORE_TIE_BREAK_WEIGHT = 0.05


class SparseIndexCache:
    def __init__(self, ttl_seconds: int = 300, max_size: int = 1):
        self._cache: dict[str, Any] = {}
        self._timestamps: dict[str, float] = {}
        self._ttl = ttl_seconds
        self._max_size = max_size
        self._lock = threading.RLock()

    def _cleanup_expired(self) -> None:
        now = time.time()

        expired_keys = [
            key
            for key, ts in list(self._timestamps.items())
            if now - ts > self._ttl
        ]

        for key in expired_keys:
            self._cache.pop(key, None)
            self._timestamps.pop(key, None)

    def get(self, key: str) -> tuple[Any, bool]:
        with self._lock:
            self._cleanup_expired()

            if key not in self._cache:
                return None, False

            return self._cache[key], True

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._cleanup_expired()

            if len(self._cache) >= self._max_size and key not in self._cache:
                oldest_key = min(self._timestamps, key=self._timestamps.get)
                self._cache.pop(oldest_key, None)
                self._timestamps.pop(oldest_key, None)

            self._cache[key] = value
            self._timestamps[key] = time.time()

    def invalidate(self, key: str | None = None) -> None:
        with self._lock:
            if key:
                self._cache.pop(key, None)
                self._timestamps.pop(key, None)
                return

            self._cache.clear()
            self._timestamps.clear()


_index_cache = SparseIndexCache(ttl_seconds=7200, max_size=1)

_MAX_INDEX_CHUNKS = 10_000


def sparse_retrieval(query: str, db, top_k: int) -> list[dict[str, Any]]:
    try:
        return _bm25_retrieval(query=query, db=db, top_k=top_k)
    except Exception as exc:
        logger.warning(
            "BM25 retrieval failed, falling back to ILIKE retrieval: %s",
            exc,
        )
        return _ilike_retrieval_fallback(query=query, db=db, top_k=top_k)

def _bm25_retrieval(query: str, db, top_k: int) -> list[dict[str, Any]]:
    if BM25Okapi is None:
        raise RuntimeError("rank_bm25 is not installed")

    cache_key = "bm25_active_chunks"
    index, found = _index_cache.get(cache_key)

    if not found:
        rows = (
            db.query(KnowledgeChunk)
            .filter(KnowledgeChunk.is_active.is_(True))
            .order_by(KnowledgeChunk.updated_at.desc())
            .limit(_MAX_INDEX_CHUNKS)
            .all()
        )

        if not rows:
            return []

        tokenized_corpus: list[list[str]] = []
        chunk_ids: list[Any] = []

        for row in rows:
            searchable_text = _build_searchable_text(row)
            tokens = _tokenize_text(searchable_text)

            tokenized_corpus.append(tokens)
            chunk_ids.append(row.id)

        bm25 = BM25Okapi(tokenized_corpus)
        index = (bm25, chunk_ids)

        _index_cache.set(cache_key, index)
        logger.info("Built BM25 index for %d chunks", len(chunk_ids))
    else:
        bm25, chunk_ids = index

    query_tokens = _tokenize_text(query)

    if not query_tokens:
        return []

    raw_scores = bm25.get_scores(query_tokens).tolist()

    scored_ids = list(zip(chunk_ids, raw_scores))
    scored_ids.sort(key=lambda x: x[1], reverse=True)

    positive_scored_ids = [
        (chunk_id, score)
        for chunk_id, score in scored_ids
        if score > 0
    ]

    if not positive_scored_ids:
        return []

    top_scored_ids = positive_scored_ids[:top_k]
    top_chunk_ids = [chunk_id for chunk_id, _ in top_scored_ids]

    rows = (
        db.query(KnowledgeChunk)
        .filter(KnowledgeChunk.id.in_(top_chunk_ids))
        .filter(KnowledgeChunk.is_active.is_(True))
        .all()
    )

    id_to_row = {row.id: row for row in rows}

    max_score = max(score for _, score in top_scored_ids) or 1.0

    candidates: list[dict[str, Any]] = []

    for chunk_id, raw_score in top_scored_ids:
        row = id_to_row.get(chunk_id)

        if not row:
            continue

        normalized_score = float(raw_score / max_score)

        candidates.append(
            _row_to_candidate(
                row=row,
                score=normalized_score,
                path="sparse",
            )
        )

    return candidates


def _ilike_retrieval_fallback(query: str, db, top_k: int) -> list[dict[str, Any]]:
    words = [
        word.strip()
        for word in query.split()
        if len(word.strip()) > 2
    ][:8]

    if not words:
        return []
    conditions = []

    for word in words:
        pattern = f"%{word}%"

        conditions.extend(
            [
                KnowledgeChunk.title.ilike(pattern),
                KnowledgeChunk.content.ilike(pattern),
                KnowledgeChunk.source.ilike(pattern),
            ]
        )

    rows = (
        db.query(KnowledgeChunk)
        .filter(KnowledgeChunk.is_active.is_(True))
        .filter(or_(*conditions))
        .limit(top_k)
        .all()
    )

    return [
        _row_to_candidate(
            row=row,
            score=0.55,
            path="sparse",
        )
        for row in rows
    ]


def dense_retrieval(query: str, db, top_k: int) -> list[dict[str, Any]]:
    vector = get_embeddings_client().embed_query(query)
    points = qdrant_service.search_knowledge_chunk_vectors(
        vector=vector,
        limit=top_k,
    )
    candidates: list[dict[str, Any]] = []

    for point in points:
        payload = point.payload or {}
        chunk_id = payload.get("chunk_id") or getattr(point, "id", None)

        if not chunk_id:
            continue

        score = float(getattr(point, "score", 0.0) or 0.0)
        candidate = _payload_to_candidate(payload, score=score)
        if candidate is not None:
            candidates.append(candidate)

    return candidates


def hybrid_retrieval(query: str, db, top_k: int) -> list[dict[str, Any]]:
    with ThreadPoolExecutor(max_workers=1) as executor:
        dense_future = executor.submit(dense_retrieval, query=query, db=db, top_k=top_k)
        sparse = sparse_retrieval(query=query, db=db, top_k=top_k)
        dense = dense_future.result()
    merged = _merge_candidates(dense + sparse)

    return merged[:top_k]


def _build_searchable_text(row: KnowledgeChunk) -> str:
    category = row.category.value if row.category else ""
    year = str(row.year) if row.year is not None else ""
    return " ".join(
        [
            category,
            row.title or "",
            row.content or "",
            row.source or "",
            year,
        ]
    )


def _tokenize_text(text: str) -> list[str]:
    normalized_text = text.lower()
    try:
        from underthesea import word_tokenize
        normalized_text = word_tokenize(normalized_text, format="text")
    except Exception:
        pass

    tokens = re.findall(r"\b\w+\b", normalized_text, flags=re.UNICODE)

    return [
        token
        for token in tokens
        if len(token) > 1
    ]


def _row_to_candidate(row: KnowledgeChunk, score: float, path: str) -> dict[str, Any]:
    return {
        "chunk_id": row.id,
        "title": row.title,
        "category": row.category.value if row.category else None,
        "source": row.source,
        "source_url": row.source_url,
        "year": row.year,
        "content": row.content,
        "score": float(score),
        "path": path,
    }


def _payload_to_candidate(payload: dict[str, Any], *, score: float) -> dict[str, Any] | None:
    if not payload:
        return None
    if payload.get("is_active") is False:
        return None
    if not payload.get("content"):
        return None

    chunk_id = payload.get("chunk_id")
    if not chunk_id:
        return None
    chunk_id_value: Any = chunk_id
    if isinstance(chunk_id, str):
        try:
            chunk_id_value = UUID(chunk_id)
        except (TypeError, ValueError):
            chunk_id_value = chunk_id

    return {
        "chunk_id": chunk_id_value,
        "title": payload.get("title"),
        "category": payload.get("category"),
        "source": payload.get("source"),
        "source_url": payload.get("source_url"),
        "year": payload.get("year"),
        "content": payload.get("content"),
        "score": float(score),
        "path": "dense",
    }


def _merge_candidates(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rankings_by_path: dict[str, list[dict[str, Any]]] = {}

    for item in items:
        path = str(item.get("path", "") or "unknown")
        rankings_by_path.setdefault(path, []).append(item)

    merged: dict[str, dict[str, Any]] = {}

    for ranking in rankings_by_path.values():
        ranking.sort(
            key=lambda item: _safe_float(item.get("score", 0.0)),
            reverse=True,
        )
        path_max_score = max(
            (_safe_float(item.get("score", 0.0)) for item in ranking),
            default=0.0,
        )

        for rank, item in enumerate(ranking, start=1):
            chunk_id = item.get("chunk_id")

            if not chunk_id:
                continue

            key = str(chunk_id)
            rrf_score = 1.0 / (_HYBRID_RRF_K + rank)
            normalized_raw_score = _normalize_relative_score(
                item.get("score", 0.0),
                max_score=path_max_score,
            )

            if key not in merged:
                merged[key] = dict(item)
                merged[key]["score"] = 0.0
                merged[key]["method"] = "hybrid"
                merged[key]["fusion_features"] = {
                    "rrf_score": 0.0,
                    "raw_score_tie_break": 0.0,
                    "match_count": 0,
                }

            fusion_features = merged[key]["fusion_features"]
            fusion_features["rrf_score"] += rrf_score
            fusion_features["raw_score_tie_break"] = max(
                _safe_float(fusion_features.get("raw_score_tie_break"), 0.0),
                normalized_raw_score,
            )
            fusion_features["match_count"] += 1
            merged[key]["score"] = (
                _safe_float(fusion_features.get("rrf_score"), 0.0)
                + _HYBRID_RAW_SCORE_TIE_BREAK_WEIGHT
                * _safe_float(fusion_features.get("raw_score_tie_break"), 0.0)
            )

            old_path = str(merged[key].get("path", "") or "")
            new_path = str(item.get("path", "") or "")

            paths: list[str] = []

            for path in f"{old_path}+{new_path}".split("+"):
                if path and path not in paths:
                    paths.append(path)

            merged[key]["path"] = "+".join(paths)

    for item in merged.values():
        fusion_features = item.get("fusion_features") or {}
        item["score"] = round(_safe_float(item.get("score"), 0.0), 6)
        item["fusion_features"] = {
            "rrf_score": round(_safe_float(fusion_features.get("rrf_score"), 0.0), 6),
            "raw_score_tie_break": round(
                _safe_float(fusion_features.get("raw_score_tie_break"), 0.0),
                6,
            ),
            "match_count": int(fusion_features.get("match_count") or 0),
        }

    return sorted(
        merged.values(),
        key=lambda item: (
            _safe_float(item.get("score", 0.0)),
            int((item.get("fusion_features") or {}).get("match_count") or 0),
            len(str(item.get("path", "") or "").split("+")),
        ),
        reverse=True,
    )


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalize_relative_score(value: Any, *, max_score: float) -> float:
    numeric_value = max(0.0, _safe_float(value, 0.0))
    if max_score <= 0:
        return 0.0
    return min(numeric_value / max_score, 1.0)


def invalidate_sparse_cache() -> None:
    _index_cache.invalidate()
