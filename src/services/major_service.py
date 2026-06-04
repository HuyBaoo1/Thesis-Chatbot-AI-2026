from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from src.models.major import Major
from src.services.major_cache_service import invalidate_major_caches, invalidate_tuition_caches


def get_major_or_404(major_id: UUID, db):
    major = db.query(Major).filter(Major.id == major_id).first()
    if not major:
        raise HTTPException(status_code=404, detail="Major not found")
    return major


def list_majors(db, limit: int, offset: int, q: str | None = None, major_type=None):
    query = db.query(Major)

    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(
            or_(Major.name.ilike(search_term), Major.code.ilike(search_term))
        )

    if major_type:
        query = query.filter(Major.major_type == major_type)

    total = query.count()
    items = query.order_by(Major.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def create_major(data, db):
    existing_major = db.query(Major).filter(Major.code == data.code).first()
    if existing_major:
        raise HTTPException(status_code=400, detail="Major code already exists")

    major = Major(**data.model_dump())
    db.add(major)
    db.commit()
    invalidate_major_caches()
    db.refresh(major)
    return major


def update_major(major_id: UUID, data, db):
    major = get_major_or_404(major_id, db)
    payload = data.model_dump(exclude_unset=True)

    if "code" in payload:
        existing_major = (
            db.query(Major)
            .filter(Major.code == payload["code"], Major.id != major.id)
            .first()
        )
        if existing_major:
            raise HTTPException(status_code=400, detail="Major code already exists")

    for field, value in payload.items():
        setattr(major, field, value)

    db.commit()
    invalidate_major_caches()
    invalidate_tuition_caches(major_id=major.id)
    db.refresh(major)
    return major


def update_major_status(major_id: UUID, data, db):
    major = get_major_or_404(major_id, db)
    major.is_active = data.is_active
    db.commit()
    invalidate_major_caches()
    invalidate_tuition_caches(major_id=major.id)
    db.refresh(major)
    return major


def delete_major(major_id: UUID, db):
    major = get_major_or_404(major_id, db)
    major_cache_id = major.id
    db.delete(major)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete this major because it is still referenced by other records",
        )
    invalidate_major_caches()
    invalidate_tuition_caches(major_id=major_cache_id)
    return {"message": "Major deleted successfully"}
