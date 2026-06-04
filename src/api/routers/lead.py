from uuid import UUID
from typing import Literal

from fastapi import APIRouter, Depends, Query

from src.api.deps import require_role
from src.db import session
from src.models.enums import LeadStatus, LeadTemperature, StaffRole
from src.schemas.application import ApplicationListOut
from src.schemas.lead import (
    LeadListOut,
    LeadOut,
    LeadUpdate,
)
from src.schemas.lead_activity import LeadActivityListOut
from src.schemas.lead_major_interest import LeadMajorInterestListOut
from src.services import (
    admin_analytics_service,
    application_service,
    lead_activity_service,
    lead_major_interest_service,
    lead_service,
)


router = APIRouter(prefix="/leads", tags=["Lead"])
staff_required = require_role([StaffRole.ADMIN, StaffRole.COUNSELOR])


@router.get("", response_model=LeadListOut)
def list_leads(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status: LeadStatus | None = Query(default=None),
    temperature: LeadTemperature | None = Query(default=None),
    assigned_staff_id: UUID | None = Query(default=None),
    q: str | None = Query(default=None, min_length=1),
    score_sort: Literal["asc", "desc"] | None = Query(
        default=None,
        description="Sort by lead score. Use desc for high-to-low, asc for low-to-high.",
    ),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return lead_service.list_leads(
        db,
        limit=limit,
        offset=offset,
        status=status,
        temperature=temperature,
        assigned_staff_id=assigned_staff_id,
        q=q,
        score_sort=score_sort,
    )


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(
    lead_id: UUID,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return lead_service.get_lead_or_404(db, lead_id)


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: UUID,
    data: LeadUpdate,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return lead_service.update_lead(lead_id, data, db)


@router.get("/{lead_id}/applications", response_model=ApplicationListOut)
def list_lead_applications(
    lead_id: UUID,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return application_service.list_applications(
        db,
        lead_id=lead_id,
        limit=limit,
        offset=offset,
    )


@router.get("/{lead_id}/activities", response_model=LeadActivityListOut)
def list_lead_activities(
    lead_id: UUID,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return lead_activity_service.list_lead_activities(
        db,
        lead_id=lead_id,
        limit=limit,
        offset=offset,
    )


@router.get("/{lead_id}/score-history")
def get_lead_score_history(
    lead_id: UUID,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return admin_analytics_service.get_lead_score_history(db, lead_id)


@router.get("/{lead_id}/interests", response_model=LeadMajorInterestListOut)
def list_lead_interests(
    lead_id: UUID,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return lead_major_interest_service.list_lead_interests(db, lead_id=lead_id)
