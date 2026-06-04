import re
import unicodedata
from uuid import UUID

from fastapi import HTTPException

from src.models.lead_major_interest import LeadMajorInterest
from src.models.major import Major
from src.services.lead_service import get_lead_or_404
from src.services.major_service import get_major_or_404

COMMON_MAJOR_ALIASES = {
    "cong nghe thong tin": {"cntt", "it"},
    "quan tri kinh doanh": {"qtkd", "business administration", "biz admin"},
    "ke toan": {"kt"},
    "tai chinh ngan hang": {"tcnh", "finance banking"},
    "y hoc co truyen": {"yhct"},
    "cong nghe sinh hoc": {"cnsh"},
}


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", (value or "").strip().lower())
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    normalized = normalized.replace("đ", "d")
    normalized = re.sub(r"[^\w\s]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def _contains_phrase(text: str, phrase: str) -> bool:
    if not text or not phrase:
        return False
    pattern = rf"(?<!\w){re.escape(phrase)}(?!\w)"
    return re.search(pattern, text) is not None


def _major_aliases(major: Major) -> set[str]:
    aliases: set[str] = set()

    normalized_name = _normalize_text(major.name or "")
    if normalized_name:
        aliases.update(COMMON_MAJOR_ALIASES.get(normalized_name, set()))

    normalized_code = _normalize_text(major.code or "")
    if normalized_code:
        aliases.add(normalized_code)

    return aliases


def upsert_major_interest_from_query(
    db,
    *,
    lead_id: UUID,
    query: str,
    auto_commit: bool = True,
) -> list[LeadMajorInterest]:
    q = _normalize_text(query)
    if not q:
        return []

    majors = db.query(Major).filter(Major.is_active.is_(True)).all()
    touched: list[LeadMajorInterest] = []
    for major in majors:
        score = 0
        normalized_name = _normalize_text(major.name or "")
        if _contains_phrase(q, normalized_name):
            score += 3
        normalized_code = _normalize_text(major.code or "")
        if _contains_phrase(q, normalized_code):
            score += 2
        if any(_contains_phrase(q, alias) for alias in _major_aliases(major) if alias != normalized_code):
            score += 2
        if score == 0:
            continue

        interest = (
            db.query(LeadMajorInterest)
            .filter(
                LeadMajorInterest.lead_id == lead_id,
                LeadMajorInterest.major_id == major.id,
            )
            .first()
        )
        if not interest:
            interest = LeadMajorInterest(
                lead_id=lead_id,
                major_id=major.id,
                priority=score,
            )
            db.add(interest)
        else:
            interest.priority = (interest.priority or 0) + score
        touched.append(interest)

    if touched:
        if auto_commit:
            db.commit()
            for item in touched:
                db.refresh(item)
        else:
            db.flush()
    return touched


def list_lead_interests(db, *, lead_id: UUID) -> dict:
    get_lead_or_404(db, lead_id)
    rows = (
        db.query(LeadMajorInterest)
        .filter(LeadMajorInterest.lead_id == lead_id)
        .order_by(LeadMajorInterest.priority.desc())
        .all()
    )
    return {
        "lead_id": lead_id,
        "items": [_serialize_interest(item) for item in rows],
        "total": len(rows),
    }


def upsert_lead_interest(db, *, lead_id: UUID, major_id: UUID, priority: int):
    get_lead_or_404(db, lead_id)
    get_major_or_404(major_id, db)
    item = (
        db.query(LeadMajorInterest)
        .filter(
            LeadMajorInterest.lead_id == lead_id,
            LeadMajorInterest.major_id == major_id,
        )
        .first()
    )
    if not item:
        item = LeadMajorInterest(lead_id=lead_id, major_id=major_id, priority=priority)
        db.add(item)
    else:
        item.priority = priority
    db.commit()
    return _serialize_interest(item)


def update_lead_interest(db, *, lead_id: UUID, major_id: UUID, priority: int):
    item = _get_interest_or_404(db, lead_id=lead_id, major_id=major_id)
    item.priority = priority
    db.commit()
    return _serialize_interest(item)


def delete_lead_interest(db, *, lead_id: UUID, major_id: UUID) -> dict:
    item = _get_interest_or_404(db, lead_id=lead_id, major_id=major_id)
    db.delete(item)
    db.commit()
    return {"message": "Lead major interest deleted successfully"}


def _get_interest_or_404(db, *, lead_id: UUID, major_id: UUID) -> LeadMajorInterest:
    item = (
        db.query(LeadMajorInterest)
        .filter(
            LeadMajorInterest.lead_id == lead_id,
            LeadMajorInterest.major_id == major_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Lead major interest not found")
    return item


def _serialize_interest(item: LeadMajorInterest) -> dict:
    major = item.major
    return {
        "lead_id": item.lead_id,
        "major_id": item.major_id,
        "priority": item.priority,
        "major_code": major.code if major else None,
        "major_name": major.name if major else None,
    }
