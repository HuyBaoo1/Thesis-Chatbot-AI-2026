from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from src.models.tuition_policy import TuitionPolicy
from src.services.major_cache_service import invalidate_tuition_caches
from src.services.major_matcher import find_major_by_text
from src.services.major_service import get_major_or_404


def get_tuition_policy_or_404(policy_id: UUID, db):
    policy = db.query(TuitionPolicy).filter(TuitionPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Tuition policy not found")
    return policy


def get_tuition_policies_by_major_id(
    major_id: UUID,
    db,
    *,
    year: int | None = None,
    limit: int = 10,
    offset: int = 0,
):
    get_major_or_404(major_id, db)

    query = (
        db.query(TuitionPolicy)
        .filter(
            TuitionPolicy.major_id == major_id,
            TuitionPolicy.is_active.is_(True),
        )
        .order_by(TuitionPolicy.year.desc(), TuitionPolicy.created_at.desc())
    )
    if year is not None:
        query = query.filter(TuitionPolicy.year == year)

    total = query.count()
    items = query.offset(offset).limit(limit).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def list_tuition_policies(
    db,
    limit: int,
    offset: int,
    *,
    year: int | None = None,
    major_id: UUID | None = None,
    fee_type=None,
):
    query = db.query(TuitionPolicy)

    if year is not None:
        query = query.filter(TuitionPolicy.year == year)

    if major_id is not None:
        get_major_or_404(major_id, db)
        query = query.filter(TuitionPolicy.major_id == major_id)

    if fee_type is not None:
        query = query.filter(TuitionPolicy.fee_type == fee_type)

    total = query.count()
    items = (
        query.order_by(TuitionPolicy.year.desc(), TuitionPolicy.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def create_tuition_policy(data, db):
    get_major_or_404(data.major_id, db)
    existing = (
        db.query(TuitionPolicy)
        .filter(
            TuitionPolicy.major_id == data.major_id,
            TuitionPolicy.year == data.year,
            TuitionPolicy.fee_type == data.fee_type,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Tuition policy for this major, year, and fee type already exists",
        )

    policy = TuitionPolicy(**data.model_dump())
    db.add(policy)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Failed to create tuition policy: {str(getattr(exc, 'orig', exc))}",
        )
    invalidate_tuition_caches(major_id=policy.major_id)
    db.refresh(policy)
    return policy


def update_tuition_policy(policy_id: UUID, data, db):
    policy = get_tuition_policy_or_404(policy_id, db)
    old_major_id = policy.major_id
    payload = data.model_dump(exclude_unset=True)

    if "major_id" in payload:
        get_major_or_404(payload["major_id"], db)

    next_major_id = payload.get("major_id", policy.major_id)
    next_year = payload.get("year", policy.year)
    next_fee_type = payload.get("fee_type", policy.fee_type)
    duplicate = (
        db.query(TuitionPolicy)
        .filter(
            TuitionPolicy.major_id == next_major_id,
            TuitionPolicy.year == next_year,
            TuitionPolicy.fee_type == next_fee_type,
            TuitionPolicy.id != policy.id,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="Tuition policy for this major, year, and fee type already exists",
        )

    for field, value in payload.items():
        setattr(policy, field, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Failed to update tuition policy: {str(getattr(exc, 'orig', exc))}",
        )
    invalidate_tuition_caches(major_id=old_major_id)
    if policy.major_id != old_major_id:
        invalidate_tuition_caches(major_id=policy.major_id)
    db.refresh(policy)
    return policy


def update_tuition_policy_status(policy_id: UUID, data, db):
    policy = get_tuition_policy_or_404(policy_id, db)
    policy.is_active = data.is_active
    db.commit()
    invalidate_tuition_caches(major_id=policy.major_id)
    db.refresh(policy)
    return policy


def delete_tuition_policy(policy_id: UUID, db):
    policy = get_tuition_policy_or_404(policy_id, db)
    major_id = policy.major_id
    db.delete(policy)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete this tuition policy because it is still referenced by other records",
        )
    invalidate_tuition_caches(major_id=major_id)
    return {"message": "Tuition policy deleted successfully"}


def get_tuition_policies_by_major(
    db,
    *,
    name_or_code: str,
    year: int | None = None,
    limit: int = 10,
):
    q = (name_or_code or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="name_or_code is required")

    major = find_major_by_text(db, q)
    if not major:
        return {"major": None, "items": []}

    query = (
        db.query(TuitionPolicy)
        .filter(
            TuitionPolicy.major_id == major.id,
            TuitionPolicy.is_active.is_(True),
        )
        .order_by(TuitionPolicy.year.desc(), TuitionPolicy.created_at.desc())
    )
    if year is not None:
        query = query.filter(TuitionPolicy.year == year)

    items = query.limit(max(1, min(limit, 50))).all()
    return {"major": major, "items": items}
