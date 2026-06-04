import re
import unicodedata
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from src.models.enums import LeadStatus, LeadTemperature
from src.models.lead import Lead


def get_lead_or_404(db, lead_id: UUID) -> Lead:
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


def list_leads(
    db,
    *,
    limit: int = 20,
    offset: int = 0,
    status: LeadStatus | None = None,
    temperature: LeadTemperature | None = None,
    assigned_staff_id: UUID | None = None,
    q: str | None = None,
    score_sort: Literal["asc", "desc"] | None = None,
):
    normalized_limit = max(1, min(limit, 100))
    normalized_offset = max(0, offset)
    query = db.query(Lead)

    if status is not None:
        query = query.filter(Lead.status == status)
    if temperature is not None:
        query = query.filter(Lead.temperature == temperature)
    if assigned_staff_id is not None:
        query = query.filter(Lead.assigned_staff_id == assigned_staff_id)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Lead.full_name.ilike(pattern),
                Lead.email.ilike(pattern),
                Lead.phone.ilike(pattern),
                Lead.high_school.ilike(pattern),
                Lead.province.ilike(pattern),
            )
        )

    total = query.count()
    if score_sort == "desc":
        query = query.order_by(Lead.score.desc(), Lead.created_at.desc())
    elif score_sort == "asc":
        query = query.order_by(Lead.score.asc(), Lead.created_at.desc())
    else:
        query = query.order_by(Lead.created_at.desc(), Lead.updated_at.desc())

    rows = query.offset(normalized_offset).limit(normalized_limit).all()
    return {
        "items": rows,
        "total": total,
        "limit": normalized_limit,
        "offset": normalized_offset,
        "has_more": normalized_offset + len(rows) < total,
    }


def create_or_get_lead_by_contact(
    db,
    *,
    full_name: str,
    email: str | None,
    phone: str | None,
    auto_commit: bool = True,
) -> tuple[Lead, bool]:
    if not full_name or not full_name.strip():
        raise HTTPException(status_code=400, detail="full_name is required")
    if not (email or phone):
        raise HTTPException(status_code=400, detail="email or phone is required")

    normalized_email = email.lower().strip() if email else None
    normalized_phone = phone.strip() if phone else None

    lead = None
    if normalized_email:
        lead = db.query(Lead).filter(Lead.email == normalized_email).first()
    if not lead and normalized_phone:
        lead = db.query(Lead).filter(Lead.phone == normalized_phone).first()

    if lead:
        if full_name and lead.full_name != full_name.strip():
            lead.full_name = full_name.strip()
        if normalized_email and not lead.email:
            lead.email = normalized_email
        if normalized_phone and not lead.phone:
            lead.phone = normalized_phone
        if auto_commit:
            db.commit()
            db.refresh(lead)
        else:
            db.flush()
        return lead, False

    lead = Lead(
        full_name=full_name.strip(),
        email=normalized_email,
        phone=normalized_phone,
    )
    db.add(lead)
    if auto_commit:
        db.commit()
        db.refresh(lead)
    else:
        db.flush()
    return lead, True


def extract_lead_updates_from_text(text: str) -> dict:
    updates: dict = {}
    q = text.strip()
    normalized = _normalize_for_matching(q)

    email_match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", q)
    if email_match:
        updates["email"] = email_match.group(0).lower()

    phone_match = re.search(r"(?:\+?84|0)(?:[\s.-]?\d){9,10}", q)
    if phone_match:
        updates["phone"] = re.sub(r"(?<!^)[^\d]", "", phone_match.group(0))

    gpa_value = _extract_number_after_labels(
        normalized,
        ["gpa", "diem tb", "diem trung binh"],
        r"\d{1,2}(?:\.\d+)?",
    )
    if gpa_value:
        updates["gpa"] = _safe_float(gpa_value)

    ielts_value = _extract_number_after_labels(
        normalized,
        ["ielts"],
        r"\d{1,2}(?:\.\d+)?",
    )
    if ielts_value:
        updates["ielts"] = _safe_float(ielts_value)

    sat_value = _extract_number_after_labels(normalized, ["sat"], r"\d{3,4}")
    if sat_value:
        updates["sat"] = _safe_int(sat_value)

    act_value = _extract_number_after_labels(normalized, ["act"], r"\d{1,2}")
    if act_value:
        updates["act"] = _safe_int(act_value)

    high_school = _extract_profile_text_after_markers(
        normalized,
        ["hoc truong", "truong thpt", "truong cap 3", "high school", "truong"],
    )
    if high_school:
        updates["high_school"] = high_school

    province = _extract_profile_text_after_markers(
        normalized,
        ["o tinh", "o thanh pho", "den tu", "tinh", "thanh pho", "province", "city"],
    )
    if province:
        updates["province"] = province

    return {k: v for k, v in updates.items() if v not in (None, "")}


def apply_lead_updates(db, *, lead_id: UUID, updates: dict, auto_commit: bool = True) -> Lead:
    if not updates:
        return get_lead_or_404(db, lead_id)

    lead = get_lead_or_404(db, lead_id)
    model_fields = _lead_model_fields()

    for field, value in updates.items():
        if field not in model_fields:
            continue
        setattr(lead, field, value)

    if auto_commit:
        db.commit()
        db.refresh(lead)
    else:
        db.flush()
    return lead


def update_lead(lead_id: UUID, data, db) -> Lead:
    lead = get_lead_or_404(db, lead_id)
    payload = data.model_dump(exclude_unset=True)
    model_fields = _lead_model_fields()

    if "email" in payload and payload["email"]:
        payload["email"] = payload["email"].strip().lower()
    if "phone" in payload and payload["phone"]:
        payload["phone"] = payload["phone"].strip()
    if "full_name" in payload and payload["full_name"]:
        payload["full_name"] = payload["full_name"].strip()

    for field, value in payload.items():
        if field in model_fields:
            setattr(lead, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Lead email or phone already exists")

    db.refresh(lead)
    recomputed = recompute_lead_scoring(db, lead_id=lead.id)
    if "status" in payload:
        recomputed.status = payload["status"]
        db.commit()
        db.refresh(recomputed)
    return recomputed


def next_missing_profile_question(lead: Lead, *, focus: str | None = None) -> str | None:
    field_questions = {
        "gpa": "Nếu tiện, bạn có thể chia sẻ GPA hiện tại để mình tư vấn học bổng sát hơn.",
        "ielts": "Nếu đã có IELTS, bạn có thể chia sẻ điểm hiện tại để mình tư vấn sát hơn.",
        "sat": "Nếu có SAT, bạn có thể chia sẻ mức điểm hiện tại.",
        "act": "Nếu có ACT, bạn có thể chia sẻ mức điểm hiện tại.",
        "high_school": "Bạn đang học trường THPT nào? Mình sẽ dùng thông tin này để tư vấn sát hơn.",
        "province": "Bạn đang ở tỉnh/thành nào? Mình sẽ gợi ý thông tin phù hợp hơn.",
        "email": "Nếu muốn team gửi thông tin chi tiết, bạn có thể để lại email.",
        "phone": "Nếu muốn được tư vấn nhanh hơn, bạn có thể để lại số điện thoại.",
    }
    priority_by_focus = {
        "scholarship_lookup": ["gpa", "ielts", "sat", "act", "high_school", "province", "email", "phone"],
        "tuition_lookup": ["high_school", "province", "email", "phone", "gpa", "ielts", "sat", "act"],
        "program_info": ["high_school", "province", "email", "phone", "gpa", "ielts", "sat", "act"],
        "admission_requirement": ["high_school", "province", "gpa", "ielts", "sat", "act", "email", "phone"],
        "school_info": ["high_school", "province", "email", "phone"],
        "default": ["high_school", "province", "gpa", "ielts", "sat", "act", "email", "phone"],
    }

    model_fields = _lead_model_fields()
    priority = priority_by_focus.get(focus or "", priority_by_focus["default"])
    for field in priority:
        if field not in model_fields:
            continue
        if field in {"email", "phone"} and (lead.email or lead.phone):
            continue
        if _is_missing_profile_value(getattr(lead, field, None)):
            return field_questions[field]
    return None


def _extract_number_after_labels(normalized: str, labels: list[str], number_pattern: str) -> str | None:
    joined_labels = "|".join(re.escape(label) for label in labels)
    match = re.search(
        rf"\b(?:{joined_labels})\b(?:\s+(?!\d)\w+){{0,6}}\s*(?:[:=]|la|duoc|dat)?\s*({number_pattern})",
        normalized,
        re.IGNORECASE,
    )
    return match.group(1) if match else None


def _extract_profile_text_after_markers(normalized: str, markers: list[str]) -> str | None:
    for marker in markers:
        match = re.search(
            rf"\b{re.escape(marker)}\b(?:\s+(?:cua|toi|em|minh|dang|hoc|la|o))*\s*(?:[:=]|la|o)?\s*([a-z0-9][a-z0-9\s]{{1,80}})",
            normalized,
            re.IGNORECASE,
        )
        if not match:
            continue
        cleaned = _clean_profile_text_value(match.group(1))
        if cleaned:
            return cleaned
    return None


def _clean_profile_text_value(value: str) -> str | None:
    cleaned = " ".join((value or "").strip().split())
    if not cleaned:
        return None

    stop_tokens = [
        " va ",
        " nhung ",
        " con ",
        " cua ",
        " toi ",
        " em ",
        " minh ",
        " muon ",
        " can ",
        " hoc phi ",
        " hoc bong ",
        " nganh ",
        " chuong trinh ",
    ]
    padded = f" {cleaned} "
    cut_at: int | None = None
    for token in stop_tokens:
        idx = padded.find(token)
        if idx > 0:
            cut_at = idx if cut_at is None else min(cut_at, idx)
    if cut_at is not None:
        cleaned = padded[:cut_at].strip()

    cleaned = cleaned.strip(" .,:;")
    if len(cleaned) < 2:
        return None
    return cleaned.title()


def _normalize_for_matching(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("\u0111", "d").replace("\u0110", "D")
    normalized = re.sub(r"(?<=\d),(?=\d)", ".", normalized)
    normalized = normalized.replace("/", " ")
    normalized = re.sub(r"[^\w\s@.+-]", " ", normalized, flags=re.UNICODE)
    normalized = normalized.lower().strip()
    return " ".join(normalized.split())


def _is_missing_profile_value(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, (list, dict, set, tuple)):
        return len(value) == 0
    return False


def _lead_model_fields() -> set[str]:
    return {col.name for col in Lead.__table__.columns}


def _safe_float(value: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _safe_int(value: str) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def recompute_lead_scoring(db, *, lead_id: UUID, auto_commit: bool = True) -> Lead:
    lead = get_lead_or_404(db, lead_id)

    profile_score = 0
    if lead.email:
        profile_score += 10
    if lead.phone:
        profile_score += 10
    if lead.high_school:
        profile_score += 6
    if lead.province:
        profile_score += 4
    if lead.gpa is not None:
        profile_score += 10
    if lead.ielts is not None:
        profile_score += 8
    if lead.sat is not None:
        profile_score += 6
    if lead.act is not None:
        profile_score += 6

    # Aggregate lead activity impact.
    activity_delta = 0
    for activity in lead.activities:
        activity_delta += int(activity.score_delta or 0)

    final_score = max(0, min(100, profile_score + activity_delta))
    lead.score = final_score

    if final_score >= 70:
        lead.temperature = LeadTemperature.HOT
    elif final_score >= 40:
        lead.temperature = LeadTemperature.WARM
    else:
        lead.temperature = LeadTemperature.COLD

    if lead.status == LeadStatus.NEW:
        lead.status = LeadStatus.CONTACTED

    if auto_commit:
        db.commit()
        db.refresh(lead)
    else:
        db.flush()
    return lead


def mark_lead_interacted(db, *, lead_id: UUID, auto_commit: bool = True) -> Lead:
    lead = get_lead_or_404(db, lead_id)
    lead.last_interaction_at = datetime.now(timezone.utc)
    if auto_commit:
        db.commit()
        db.refresh(lead)
    else:
        db.flush()
    return lead
