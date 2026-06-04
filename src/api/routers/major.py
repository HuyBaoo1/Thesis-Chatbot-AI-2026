from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from src.api.deps import require_role
from src.db import session
from src.models.enums import MajorType, StaffRole
from src.schemas.major import (
    MajorCreate,
    MajorListOut,
    MajorOut,
    MajorStatusUpdate,
    MajorUpdate,
)
from src.services import major_service


router = APIRouter(prefix="/majors", tags=["Major"])
admin_required = require_role([StaffRole.ADMIN])
staff_required = require_role([StaffRole.ADMIN, StaffRole.COUNSELOR])


@router.get("", response_model=MajorListOut)
def list_majors(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None),
    major_type: MajorType | None = Query(default=None),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return major_service.list_majors(db, limit, offset, q, major_type)


@router.get("/{major_id}", response_model=MajorOut)
def get_major(
    major_id: UUID,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return major_service.get_major_or_404(major_id, db)


@router.post("", response_model=MajorOut, status_code=status.HTTP_201_CREATED)
def create_major(
    data: MajorCreate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return major_service.create_major(data, db)


@router.patch("/{major_id}", response_model=MajorOut)
def update_major(
    major_id: UUID,
    data: MajorUpdate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return major_service.update_major(major_id, data, db)


@router.patch("/{major_id}/status", response_model=MajorOut)
def update_major_status(
    major_id: UUID,
    data: MajorStatusUpdate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return major_service.update_major_status(major_id, data, db)


@router.delete("/{major_id}")
def delete_major(
    major_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return major_service.delete_major(major_id, db)
