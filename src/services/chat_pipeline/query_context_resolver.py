import re
from dataclasses import dataclass
from typing import Any

from src.models.enums import MajorType
from src.models.major import Major
from src.services.chat_pipeline.types import PipelineState
from src.services.major_cache_service import (
    get_cached_active_majors,
    set_cached_active_majors,
)
from src.services.major_matcher import (
    find_best_major_in_text,
    find_mentioned_majors,
    normalize_text,
)


@dataclass
class _MajorSnapshot:
    id: str
    code: str
    name: str
    description: str | None
    degree_type: str | None
    major_type: MajorType | None


def resolve_query_context(state: PipelineState, db) -> PipelineState:
    corrected_query = _apply_common_typos(state.query)
    if corrected_query != state.query:
        state.query = corrected_query

    normalized_query = normalize_text(state.query)
    majors = _load_active_majors_for_context(db, limit=500)

    is_global_program_list = _is_global_program_list_query(normalized_query)
    current_major = None if is_global_program_list else find_best_major_in_text(normalized_query, majors)
    history_focus = _recent_history_focus(state.chat_history, majors)
    history_major = history_focus["major"]
    history_text = history_focus["text"]
    recent_history_text = _recent_history_text(state.chat_history)
    has_global_scholarship_context = _has_global_scholarship_context(recent_history_text)
    can_use_history_context = _can_use_history_context(normalized_query)
    is_global_scholarship_follow_up = (
        current_major is None
        and has_global_scholarship_context
        and _is_scholarship_follow_up_query(normalized_query)
    )
    history_topic = (
        history_focus["topic"] or _infer_topic(history_text)
        if can_use_history_context and not is_global_program_list
        else None
    )
    topic = _infer_topic(normalized_query) or history_topic
    level = _infer_level(normalized_query)
    history_level = (
        _infer_level(history_text)
        if can_use_history_context and not is_global_program_list
        else None
    )

    use_history_major = _should_use_history_major(
        normalized_query,
        current_major=current_major,
        has_global_scholarship_context=has_global_scholarship_context,
    )
    target_major = current_major or (history_major if use_history_major else None)
    target_level = (
        None
        if is_global_program_list or is_global_scholarship_follow_up
        else level or _major_type_to_level(target_major) or history_level
    )

    resolved_query = _build_resolved_query(
        query=state.query,
        normalized_query=normalized_query,
        topic=topic,
        target_major=target_major,
        target_level=target_level,
        history_major=history_major,
        history_level=history_level,
        has_global_scholarship_context=has_global_scholarship_context,
    )
    if resolved_query:
        state.rewrite_query = True
        state.resolved_query = resolved_query

    state.resolved_context = {
        "topic": topic,
        "major_id": str(target_major.id) if target_major else None,
        "major_code": target_major.code if target_major else None,
        "major_name": target_major.name if target_major else None,
        "major_type": target_major.major_type.value if target_major and target_major.major_type else None,
        "level": target_level,
        "scope": _infer_scope(
            normalized_query,
            has_global_scholarship_context=has_global_scholarship_context,
            target_major=target_major,
        ),
    }
    return state


def _load_active_majors_for_context(db, *, limit: int) -> list[Major | _MajorSnapshot]:
    cached = get_cached_active_majors()
    if cached is not None:
        hydrated = [_major_snapshot_from_cache(item) for item in cached]
        return [item for item in hydrated if item is not None]

    rows = (
        db.query(Major)
        .filter(Major.is_active.is_(True))
        .order_by(Major.updated_at.desc())
        .limit(limit)
        .all()
    )
    set_cached_active_majors([_serialize_major_for_cache(row) for row in rows])
    return rows


def _serialize_major_for_cache(row: Major) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "code": row.code,
        "name": row.name,
        "description": row.description,
        "degree_type": row.degree_type,
        "major_type": row.major_type.value if row.major_type else None,
    }


def _major_snapshot_from_cache(payload: dict[str, Any]) -> _MajorSnapshot | None:
    code = str(payload.get("code") or "").strip()
    name = str(payload.get("name") or "").strip()
    major_id = str(payload.get("id") or "").strip()
    if not major_id or not code or not name:
        return None

    major_type = _parse_major_type(payload.get("major_type"))
    description_raw = payload.get("description")
    degree_type_raw = payload.get("degree_type")
    return _MajorSnapshot(
        id=major_id,
        code=code,
        name=name,
        description=(str(description_raw).strip() if description_raw not in (None, "") else None),
        degree_type=(str(degree_type_raw).strip() if degree_type_raw not in (None, "") else None),
        major_type=major_type,
    )


def _parse_major_type(value: Any) -> MajorType | None:
    raw = str(value or "").strip().upper()
    if not raw:
        return None
    try:
        return MajorType(raw)
    except ValueError:
        return None


def _apply_common_typos(value: str) -> str:
    text = value or ""
    replacements = {
        r"\bnghanh\b": "nganh",
        r"\bsau dao hoc\b": "sau dai hoc",
        r"\bthac sy\b": "thac si",
        r"\bviuni\b": "vinuni",
    }
    for pattern, replacement in replacements.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text.strip()


def _recent_history_focus(history: list[dict[str, Any]], majors: list[Major], limit: int = 8) -> dict[str, Any]:
    lines: list[str] = []
    latest_topic: str | None = None

    for item in reversed(history[-limit:]):
        content = str(item.get("content", "") or "").strip()
        if not content:
            continue

        normalized = normalize_text(content)
        lines.append(normalized)
        latest_topic = latest_topic or _infer_topic(normalized)

        if _looks_like_broad_major_list(normalized):
            continue

        mentions = find_mentioned_majors(normalized, majors)
        if len(mentions) == 1:
            return {
                "major": mentions[0],
                "topic": latest_topic,
                "text": normalized,
            }

    return {
        "major": None,
        "topic": latest_topic,
        "text": "\n".join(reversed(lines)),
    }


def _build_resolved_query(
    *,
    query: str,
    normalized_query: str,
    topic: str | None,
    target_major: Major | None,
    target_level: str | None,
    history_major: Major | None,
    history_level: str | None,
    has_global_scholarship_context: bool,
) -> str | None:
    if _is_grad_program_list_query(normalized_query):
        return "cac nganh sau dai hoc thac si tien si VinUniversity"

    if _is_undergrad_program_list_query(normalized_query):
        return "cac nganh dai hoc cu nhan VinUniversity"

    if _is_global_program_list_query(normalized_query):
        return "tat ca cac nganh chuong trinh VinUniversity"

    if _is_global_scholarship_query(normalized_query) and not target_major:
        return "tat ca cac loai hoc bong VinUniversity"

    if _is_generic_institution_scholarship_query(normalized_query) and not target_major:
        return "tat ca cac loai hoc bong VinUniversity"

    if (
        _is_scholarship_follow_up_query(normalized_query)
        and has_global_scholarship_context
        and not target_major
    ):
        return "dieu kien nhan hoc bong VinUniversity"

    is_follow_up = _is_contextual_follow_up(normalized_query)
    is_level_only = _is_level_only(normalized_query)
    is_topic_only = _is_topic_only(normalized_query)
    has_current_major = bool(target_major and target_major is not history_major)

    if is_level_only and history_major:
        target_major = history_major
        target_level = target_level or history_level

    if not target_major:
        return None

    if not (is_follow_up or is_level_only or is_topic_only or topic or has_current_major):
        return None

    parts: list[str] = []
    if topic:
        parts.append(_topic_to_phrase(topic))
    major_name_norm = normalize_text(target_major.name)
    if target_level and target_level not in major_name_norm:
        parts.append(target_level)
    parts.append(target_major.name)

    resolved = " ".join(part for part in parts if part).strip()
    if not resolved or normalize_text(resolved) == normalized_query:
        return None
    return resolved


def _infer_topic(value: str) -> str | None:
    curriculum_tokens = [
        "mon hoc",
        "cac mon",
        "khoa hoc",
        "courses",
        "course",
        "curriculum",
        "chuong trinh hoc",
        "cau truc chuong trinh",
        "khung chuong trinh",
    ]
    credit_tokens = [
        "tin chi",
        "so tin chi",
        "bao nhieu tin chi",
        "credits",
    ]
    if any(token in value for token in credit_tokens):
        return "course_credits"
    if any(token in value for token in curriculum_tokens):
        return "curriculum"
    if any(token in value for token in ["hoc phi", "tuition", "chi phi", "phi dao tao"]):
        return "tuition"
    if any(token in value for token in ["hoc bong", "scholarship", "ho tro tai chinh"]):
        return "scholarship"
    requirement_tokens = [
        "dieu kien",
        "yeu cau",
        "requirement",
        "diem dau vao",
        "dau vao",
        "nhap hoc",
        "ho so ung tuyen",
        "ho so tuyen sinh",
    ]
    if any(token in value for token in requirement_tokens):
        return "requirement"
    if any(token in value for token in ["deadline", "thoi han", "lich tuyen sinh"]):
        return "deadline"
    if "ung tuyen" in value and any(token in value for token in ["chuan bi", "can gi", "can phai", "ho so"]):
        return "requirement"
    if any(token in value for token in ["nganh", "chuong trinh", "program", "major"]):
        return "program"
    return None


def _infer_level(value: str) -> str | None:
    if any(token in value for token in ["tien si", "phd", "doctor"]):
        return "tien si"
    if any(token in value for token in ["thac si", "master", "mba", "msc"]):
        return "thac si"
    if any(token in value for token in ["sau dai hoc", "graduate", "postgraduate"]):
        return "sau dai hoc"
    if any(token in value for token in ["dai hoc", "cu nhan", "undergrad", "bachelor"]):
        return "cu nhan"
    return None


def _major_type_to_level(major: Major | None) -> str | None:
    if not major or not major.major_type:
        return None
    if major.major_type == MajorType.UNDERGRAD_MAJOR:
        return "cu nhan"
    if major.major_type == MajorType.GRAD_MAJOR:
        return "sau dai hoc"
    if major.major_type == MajorType.CERTIFICATE_PROGRAM:
        return "chung chi"
    return None


def _topic_to_phrase(topic: str) -> str:
    return {
        "tuition": "hoc phi",
        "scholarship": "hoc bong",
        "requirement": "dieu kien tuyen sinh",
        "deadline": "thoi han ung tuyen",
        "curriculum": "chuong trinh hoc cac mon hoc",
        "course_credits": "so tin chi mon hoc",
        "program": "thong tin chuong trinh",
    }.get(topic, topic)


def _is_contextual_follow_up(value: str) -> bool:
    markers = [
        "thi sao",
        "con sao",
        "vay sao",
        "the sao",
        "what about",
        "how about",
    ]
    return any(marker in value for marker in markers)


def _is_topic_only(value: str) -> bool:
    return value.strip() in {
        "hoc phi",
        "hoc phi thi sao",
        "hoc bong",
        "hoc bong thi sao",
        "dieu kien",
        "dieu kien dau vao",
        "yeu cau",
        "yeu cau dau vao",
        "ho so ung tuyen",
        "quy trinh ung tuyen",
        "deadline",
        "thoi han",
        "cac mon hoc",
        "mon hoc",
        "khoa hoc",
        "chuong trinh hoc",
        "cau truc chuong trinh",
        "tin chi",
        "bao nhieu tin chi",
    }


def _is_level_only(value: str) -> bool:
    return value.strip() in {
        "dai hoc",
        "cu nhan",
        "undergraduate",
        "bachelor",
        "thac si",
        "master",
        "tien si",
        "phd",
        "sau dai hoc",
    }


def _is_grad_program_list_query(value: str) -> bool:
    has_program_list = any(token in value for token in ["cac nganh", "tat ca nganh", "chuong trinh"])
    has_grad = any(token in value for token in ["sau dai hoc", "thac si", "tien si", "graduate", "master", "phd"])
    return has_program_list and has_grad


def _is_undergrad_program_list_query(value: str) -> bool:
    has_program_list = any(token in value for token in ["cac nganh", "tat ca nganh", "chuong trinh"])
    has_undergrad = any(token in value for token in ["dai hoc", "cu nhan", "undergraduate", "bachelor"])
    return has_program_list and has_undergrad


def _should_use_history_major(
    value: str,
    *,
    current_major: Major | None,
    has_global_scholarship_context: bool,
) -> bool:
    if current_major:
        return False
    if _is_global_scholarship_query(value) or _is_global_program_list_query(value):
        return False
    if has_global_scholarship_context and _is_scholarship_follow_up_query(value):
        return False
    return _can_use_history_context(value)


def _can_use_history_context(value: str) -> bool:
    return (
        _has_contextual_major_reference(value)
        or _is_topic_only(value)
        or _is_level_only(value)
        or _is_contextual_follow_up(value)
    )


def _has_contextual_major_reference(value: str) -> bool:
    markers = [
        "nganh nay",
        "nganh do",
        "nganh tren",
        "nganh vua noi",
        "nganh vua hoi",
        "chuong trinh nay",
        "chuong trinh do",
        "chuong trinh tren",
        "chuong trinh vua noi",
        "chuong trinh vua hoi",
        "major nay",
        "major do",
        "that major",
        "program nay",
        "program do",
        "that program",
    ]
    return any(marker in value for marker in markers)


def _recent_history_text(history: list[dict[str, Any]], limit: int = 8) -> str:
    lines: list[str] = []
    for item in history[-limit:]:
        content = str(item.get("content", "") or "").strip()
        if content:
            lines.append(normalize_text(content))
    return "\n".join(lines)


def _is_global_program_list_query(value: str) -> bool:
    user_history_markers = [
        "toi quan tam",
        "toi dang quan tam",
        "minh quan tam",
        "lich su",
        "doan chat",
        "truoc do",
    ]
    if any(marker in value for marker in user_history_markers):
        return False

    has_program = any(token in value for token in ["nganh", "chuong trinh", "program", "major"])
    if not has_program:
        return False

    strong_broad_markers = [
        "tat ca",
        "toan bo",
        "danh sach",
        "all",
        "list of",
    ]
    weak_broad_markers = [
        "cac nganh",
        "nhung nganh",
    ]
    institution_markers = [
        "vinuni",
        "vinuniversity",
        "truong",
        "dao tao",
        "dang dao tao",
        "hien dang dao tao",
        "hien co",
        "co nhung",
    ]
    has_institution = any(marker in value for marker in institution_markers)
    return any(marker in value for marker in strong_broad_markers) or (
        has_institution and any(marker in value for marker in weak_broad_markers)
    )


def _is_global_scholarship_query(value: str) -> bool:
    has_scholarship = any(token in value for token in ["hoc bong", "scholarship", "financial aid"])
    if not has_scholarship:
        return False

    broad_markers = [
        "tat ca",
        "toan bo",
        "cac loai",
        "nhung loai",
        "loai hoc bong",
        "cac hoc bong",
        "nhung hoc bong",
        "hoc bong nao",
        "co hoc bong",
        "danh sach",
        "all",
        "types of",
    ]
    return any(marker in value for marker in broad_markers)


def _is_generic_institution_scholarship_query(value: str) -> bool:
    has_scholarship = any(token in value for token in ["hoc bong", "scholarship", "financial aid"])
    if not has_scholarship:
        return False

    institution_markers = [
        "vinuni",
        "vinuniversity",
        "truong",
        "nha truong",
    ]
    if not any(marker in value for marker in institution_markers):
        return False

    specific_program_markers = [
        "nganh nay",
        "chuong trinh nay",
        "major nay",
        "program nay",
    ]
    return not any(marker in value for marker in specific_program_markers)


def _is_scholarship_follow_up_query(value: str) -> bool:
    has_scholarship = any(token in value for token in ["hoc bong", "scholarship", "financial aid"])
    if not has_scholarship:
        return False

    follow_up_markers = [
        "dieu kien",
        "yeu cau",
        "tieu chi",
        "lam gi",
        "lam sao",
        "can gi",
        "can phai",
        "nhan hoc bong",
        "dat hoc bong",
        "eligible",
        "eligibility",
        "criteria",
        "requirement",
    ]
    return any(marker in value for marker in follow_up_markers)


def _has_global_scholarship_context(history_text: str) -> bool:
    if _is_global_scholarship_query(history_text):
        return True

    scholarship_list_markers = [
        "women in tech",
        "dean choi grant",
        "ho tro tai chinh",
        "financial aid",
        "cac loai hoc bong",
        "nhung hoc bong",
    ]
    return any(marker in history_text for marker in scholarship_list_markers)


def _infer_scope(
    value: str,
    *,
    has_global_scholarship_context: bool,
    target_major: Major | None,
) -> str | None:
    if target_major:
        return "major"
    if _is_global_program_list_query(value):
        return "global_program_list"
    if _is_global_scholarship_query(value):
        return "global_scholarship"
    if _is_generic_institution_scholarship_query(value):
        return "global_scholarship"
    if has_global_scholarship_context and _is_scholarship_follow_up_query(value):
        return "global_scholarship"
    return None


def _looks_like_broad_major_list(value: str) -> bool:
    list_markers = [
        "tat ca cac nganh",
        "tat ca nganh",
        "cac nganh vinuni",
        "list of majors",
        "hien dang dao tao",
    ]
    if any(marker in value for marker in list_markers):
        return True

    return value.count("major type") >= 2 or value.count("major id") >= 2
