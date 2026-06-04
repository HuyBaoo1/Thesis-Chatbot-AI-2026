from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from src.api.deps import require_role
from src.db import session
from src.models.enums import AdmissionStage, StaffRole
from src.schemas.application import (
    ApplicationCreate,
    ApplicationListOut,
    ApplicationOut,
    ApplicationStageUpdate,
    ApplicationUpdate,
)
from src.services import application_service


router = APIRouter(prefix="/applications", tags=["Application"])
staff_required = require_role([StaffRole.ADMIN, StaffRole.COUNSELOR])


@router.get("", response_model=ApplicationListOut)
def list_applications(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    lead_id: UUID | None = Query(default=None),
    major_id: UUID | None = Query(default=None),
    stage: AdmissionStage | None = Query(default=None),
    admission_year: int | None = Query(default=None, ge=2000, le=2100),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return application_service.list_applications(
        db,
        limit=limit,
        offset=offset,
        lead_id=lead_id,
        major_id=major_id,
        stage=stage,
        admission_year=admission_year,
    )


@router.get("/{application_id}", response_model=ApplicationOut)
def get_application(
    application_id: UUID,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return application_service.get_application_or_404(db, application_id)


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    data: ApplicationCreate,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return application_service.create_application(data, db)


@router.patch("/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: UUID,
    data: ApplicationUpdate,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return application_service.update_application(application_id, data, db)


@router.patch("/{application_id}/stage", response_model=ApplicationOut)
def update_application_stage(
    application_id: UUID,
    data: ApplicationStageUpdate,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return application_service.update_application_stage(application_id, data.stage, db)
