from uuid import UUID

from fastapi import HTTPException

from src.models.scholarship_policy import ScholarshipPolicy
from src.models.major import Major
from src.services.major_service import get_major_or_404


def get_scholarship_policy_or_404(policy_id: UUID, db):
    policy = db.query(ScholarshipPolicy).filter(ScholarshipPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Scholarship policy not found")
    return policy


def list_scholarship_policies(db, limit: int, offset: int):
    query = db.query(ScholarshipPolicy)
    total = query.count()
    items = query.order_by(ScholarshipPolicy.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def create_scholarship_policy(data, db):
    if data.major_id:
        get_major_or_404(data.major_id, db)

    policy = ScholarshipPolicy(**data.model_dump())
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


def update_scholarship_policy(policy_id: UUID, data, db):
    policy = get_scholarship_policy_or_404(policy_id, db)
    payload = data.model_dump(exclude_unset=True)

    if "major_id" in payload and payload["major_id"] is not None:
        get_major_or_404(payload["major_id"], db)

    for field, value in payload.items():
        setattr(policy, field, value)

    db.commit()
    db.refresh(policy)
    return policy


def delete_scholarship_policy(policy_id: UUID, db):
    policy = get_scholarship_policy_or_404(policy_id, db)
    db.delete(policy)
    db.commit()
    return {"message": "Scholarship policy deleted successfully"}


def get_scholarship_policies_by_major(db, *, name_or_code: str, year: int | None = None):
    q = (name_or_code or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="name_or_code is required")

    major = (
        db.query(Major)
        .filter(Major.is_active.is_(True))
        .filter((Major.code.ilike(f"%{q}%")) | (Major.name.ilike(f"%{q}%")))
        .first()
    )
    if not major:
        return {"major": None, "items": []}

    query = (
        db.query(ScholarshipPolicy)
        .filter(
            ScholarshipPolicy.is_active.is_(True),
            (ScholarshipPolicy.major_id == major.id) | (ScholarshipPolicy.major_id.is_(None)),
        )
        .order_by(ScholarshipPolicy.year.desc(), ScholarshipPolicy.created_at.desc())
    )
    if year is not None:
        query = query.filter(ScholarshipPolicy.year == year)

    items = query.all()
    return {"major": major, "items": items}
