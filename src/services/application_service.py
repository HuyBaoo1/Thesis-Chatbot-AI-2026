from uuid import UUID

from fastapi import HTTPException

from src.models.application import Application
from src.models.enums import AdmissionStage
from src.services.lead_service import get_lead_or_404
from src.services.major_service import get_major_or_404


def get_application_or_404(db, application_id: UUID) -> Application:
    item = db.get(Application, application_id)
    if not item:
        raise HTTPException(status_code=404, detail="Application not found")
    return item


def list_applications(
    db,
    *,
    limit: int = 20,
    offset: int = 0,
    lead_id: UUID | None = None,
    major_id: UUID | None = None,
    stage: AdmissionStage | None = None,
    admission_year: int | None = None,
) -> dict:
    normalized_limit = max(1, min(limit, 100))
    normalized_offset = max(0, offset)
    query = db.query(Application)

    if lead_id is not None:
        query = query.filter(Application.lead_id == lead_id)
    if major_id is not None:
        query = query.filter(Application.major_id == major_id)
    if stage is not None:
        query = query.filter(Application.stage == stage)
    if admission_year is not None:
        query = query.filter(Application.admission_year == admission_year)

    total = query.count()
    rows = (
        query
        .order_by(Application.updated_at.desc(), Application.created_at.desc())
        .offset(normalized_offset)
        .limit(normalized_limit)
        .all()
    )
    return {
        "items": rows,
        "total": total,
        "limit": normalized_limit,
        "offset": normalized_offset,
        "has_more": normalized_offset + len(rows) < total,
    }


def create_application(data, db) -> Application:
    get_lead_or_404(db, data.lead_id)
    get_major_or_404(data.major_id, db)
    item = Application(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_application(application_id: UUID, data, db) -> Application:
    item = get_application_or_404(db, application_id)
    payload = data.model_dump(exclude_unset=True)
    if payload.get("lead_id") is None and "lead_id" in payload:
        raise HTTPException(status_code=400, detail="lead_id cannot be null")
    if payload.get("major_id") is None and "major_id" in payload:
        raise HTTPException(status_code=400, detail="major_id cannot be null")
    if payload.get("admission_year") is None and "admission_year" in payload:
        raise HTTPException(status_code=400, detail="admission_year cannot be null")
    if payload.get("lead_id") is not None:
        get_lead_or_404(db, payload["lead_id"])
    if payload.get("major_id") is not None:
        get_major_or_404(payload["major_id"], db)

    for field, value in payload.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def update_application_stage(application_id: UUID, stage: AdmissionStage, db) -> Application:
    item = get_application_or_404(db, application_id)
    item.stage = stage
    db.commit()
    db.refresh(item)
    return item
