from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from src.api.deps import require_role
from src.db import session
from src.models.enums import StaffRole
from src.schemas.staff import StaffCreate, StaffListOut, StaffOut, StaffStatusUpdate, StaffUpdate
from src.services import staff_service


router = APIRouter(prefix="/staffs", tags=["Staff"])
admin_required = require_role([StaffRole.ADMIN])


@router.get("", response_model=StaffListOut)
def list_staffs(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None),
    role: StaffRole | None = Query(default=None),
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return staff_service.list_staffs(db, limit=limit, offset=offset, q=q, role=role)


@router.get("/{staff_id}", response_model=StaffOut)
def get_staff(
    staff_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return staff_service.get_staff_or_404(staff_id, db)


@router.post("", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
def create_staff(
    data: StaffCreate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return staff_service.create_staff(data, db)


@router.patch("/{staff_id}", response_model=StaffOut)
def update_staff(
    staff_id: UUID,
    data: StaffUpdate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return staff_service.update_staff(staff_id, data, db)


@router.patch("/{staff_id}/status", response_model=StaffOut)
def update_staff_status(
    staff_id: UUID,
    data: StaffStatusUpdate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return staff_service.update_staff_status(staff_id, data, user, db)


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff(
    staff_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return staff_service.delete_staff(staff_id, user, db)
