import unicodedata
from typing import Any

from src.models.enums import MajorType
from src.models.major import Major
from src.services.chat_pipeline import retrieval_paths
from src.services.major_cache_service import (
    build_major_list_cache_key,
    build_major_info_cache_key,
    build_tuition_by_major_cache_key,
    get_cached_major_info,
    get_cached_major_list,
    get_cached_tuition_by_major,
    set_cached_major_info,
    set_cached_major_list,
    set_cached_tuition_by_major,
)
from src.services.major_matcher import find_major_by_text
from src.services.tuition_policy_service import get_tuition_policies_by_major_id


def get_all_majors(db, limit: int = 20, major_type: str | None = None) -> dict[str, Any]:
    safe_limit = _safe_limit(limit)
    normalized_major_type = _parse_major_type(major_type)
    major_type_value = normalized_major_type.value if normalized_major_type else None
    cache_key = build_major_list_cache_key(
        limit=safe_limit,
        major_type=major_type_value,
    )
    cached = get_cached_major_list(cache_key)
    if cached is not None:
        return cached

    query = db.query(Major).filter(Major.is_active.is_(True))
    if normalized_major_type is not None:
        query = query.filter(Major.major_type == normalized_major_type)

    rows = query.order_by(Major.name.asc()).limit(safe_limit).all()
    payload = {
        "tool": "get_all_majors",
        "major_type": major_type_value,
        "items": [
            {
                "id": str(row.id),
                "code": row.code,
                "name": row.name,
                "credits": row.credits,
                "major_type": row.major_type.value if row.major_type else None,
            }
            for row in rows
        ],
    }
    set_cached_major_list(cache_key, payload)
    return payload


def get_major_info(db, *, name_or_code: str) -> dict[str, Any]:
    q = name_or_code.strip()
    row = find_major_by_text(db, q)
    if not row:
        return {"tool": "get_major_info", "item": None}

    cache_key = build_major_info_cache_key(major_id=row.id)
    cached = get_cached_major_info(cache_key)
    if cached is not None:
        return cached

    payload = {
        "tool": "get_major_info",
        "item": {
            "id": str(row.id),
            "code": row.code,
            "name": row.name,
            "description": row.description,
            "credits": row.credits,
            "duration": row.duration,
            "degree_type": row.degree_type,
            "major_type": row.major_type.value if row.major_type else None,
        },
    }
    set_cached_major_info(cache_key, payload)
    return payload


def get_tuition_by_major(
    db,
    *,
    name_or_code: str,
    year: int | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    q = (name_or_code or "").strip()
    if not q:
        return {"tool": "get_tuition_by_major", "major": None, "items": []}

    major = find_major_by_text(db, q)
    if not major:
        return {"tool": "get_tuition_by_major", "major": None, "items": []}

    safe_limit = _safe_tuition_limit(limit)
    cache_key = build_tuition_by_major_cache_key(
        major_id=major.id,
        year=year,
        limit=safe_limit,
    )
    cached = get_cached_tuition_by_major(cache_key)
    if cached is not None:
        return cached

    result = get_tuition_policies_by_major_id(
        major_id=major.id,
        db=db,
        year=year,
        limit=safe_limit,
        offset=0,
    )
    items = result["items"]
    payload = {
        "tool": "get_tuition_by_major",
        "major": (
            None
            if not major
            else {
                "id": str(major.id),
                "code": major.code,
                "name": major.name,
                "credits": major.credits,
                "major_type": major.major_type.value if major.major_type else None,
            }
        ),
        "items": [
            {
                "id": str(row.id),
                "major_id": str(row.major_id),
                "year": row.year,
                "fee_type": row.fee_type.value if row.fee_type else None,
                "base_fee": row.base_fee,
                "is_active": row.is_active,
            }
            for row in items
        ],
    }
    set_cached_tuition_by_major(cache_key, payload)
    return payload


def search_db(db, *, query: str, top_k: int) -> dict[str, Any]:
    return {
        "tool": "search_db",
        "candidates": retrieval_paths.sparse_retrieval(query, db, top_k=top_k),
    }


def search_vector(db, *, query: str, top_k: int) -> dict[str, Any]:
    return {
        "tool": "search_vector",
        "candidates": retrieval_paths.dense_retrieval(query, db, top_k=top_k),
    }


def search_hybrid(db, *, query: str, top_k: int) -> dict[str, Any]:
    return {
        "tool": "search_hybrid",
        "candidates": retrieval_paths.hybrid_retrieval(query, db, top_k=top_k),
    }


def infer_major_type_from_text(value: str | None) -> MajorType | None:
    normalized = _normalize_text(value)
    if not normalized:
        return None

    candidates = sorted(
        (
            (alias, major_type)
            for major_type, aliases in _major_type_aliases().items()
            for alias in aliases
        ),
        key=lambda item: len(item[0]),
        reverse=True,
    )
    for alias, major_type in candidates:
        if alias in normalized:
            return major_type
    return None


def _parse_major_type(value: str | None) -> MajorType | None:
    if not value:
        return None
    normalized = _normalize_text(value)
    if not normalized:
        return None

    for major_type, aliases in _major_type_aliases().items():
        if normalized in aliases:
            return major_type
    return None


def _major_type_aliases() -> dict[MajorType, set[str]]:
    return {
        MajorType.UNDERGRAD_MAJOR: {
            "undergrad major",
            "undergrad",
            "undergraduate major",
            "undergraduate",
            "bachelor",
            "bachelors",
            "bachelor s",
            "dai hoc",
            "he dai hoc",
            "cu nhan",
        },
        MajorType.GRAD_MAJOR: {
            "grad major",
            "grad",
            "graduate major",
            "graduate",
            "postgraduate",
            "master",
            "masters",
            "master s",
            "thac si",
            "sau dai hoc",
            "cao hoc",
        },
        MajorType.CERTIFICATE_PROGRAM: {
            "certificate program",
            "certificate",
            "certification",
            "chung chi",
        },
    }


def _normalize_text(value: str | None) -> str:
    if not value:
        return ""

    normalized = unicodedata.normalize("NFKD", str(value))
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("\u0111", "d").replace("\u0110", "D")
    normalized = normalized.replace("_", " ").replace("-", " ").replace("/", " ")
    normalized = normalized.lower().strip()
    return " ".join(normalized.split())


def _safe_limit(value: int) -> int:
    try:
        numeric = int(value)
    except (TypeError, ValueError):
        return 20
    return max(1, min(numeric, 200))


def _safe_tuition_limit(value: int) -> int:
    try:
        numeric = int(value)
    except (TypeError, ValueError):
        return 10
    return max(1, min(numeric, 50))
