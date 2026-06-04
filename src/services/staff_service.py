from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import or_

from src.core.security import hash_password
from src.models.enums import StaffRole
from src.models.staff import Staff


def get_staff_or_404(staff_id: UUID, db):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff


def list_staffs(
    db,
    limit: int = 20,
    offset: int = 0,
    q: str | None = None,
    role: StaffRole | None = None,
):
    normalized_limit = max(1, min(limit, 100))
    normalized_offset = max(0, offset)
    query = db.query(Staff)

    if role is not None:
        query = query.filter(Staff.role == role)

    if q and q.strip():
        pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Staff.name.ilike(pattern),
                Staff.email.ilike(pattern),
            )
        )

    total = query.count()
    items = (
        query
        .order_by(Staff.created_at.desc())
        .offset(normalized_offset)
        .limit(normalized_limit)
        .all()
    )
    return {"items": items, "total": total, "limit": normalized_limit, "offset": normalized_offset}


def create_staff(data, db):
    existing_staff = db.query(Staff).filter(Staff.email == data.email).first()
    if existing_staff:
        raise HTTPException(status_code=400, detail="Email already exists")

    payload = data.model_dump()
    payload["password"] = hash_password(data.password)

    staff = Staff(**payload)
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


def update_staff(staff_id: UUID, data, db):
    staff = get_staff_or_404(staff_id, db)
    payload = data.model_dump(exclude_unset=True)

    if "email" in payload:
        email_owner = db.query(Staff).filter(Staff.email == payload["email"], Staff.id != staff_id).first()
        if email_owner:
            raise HTTPException(status_code=400, detail="Email already exists")

    if "password" in payload:
        payload["password"] = hash_password(payload["password"])

    for key, value in payload.items():
        setattr(staff, key, value)

    db.commit()
    db.refresh(staff)
    return staff


def update_staff_status(staff_id: UUID, data, user, db):
    if str(staff_id) == user.get("sub") and not data.is_active:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own account",
        )

    staff = get_staff_or_404(staff_id, db)
    staff.is_active = data.is_active
    db.commit()
    db.refresh(staff)
    return staff


def delete_staff(staff_id: UUID, user, db):
    if str(staff_id) == user.get("sub"):
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    staff = get_staff_or_404(staff_id, db)
    db.delete(staff)
    db.commit()
