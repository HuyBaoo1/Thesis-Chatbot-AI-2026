from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from src.api.deps import require_role
from src.db import session
from src.models.enums import StaffRole
from src.schemas.scholarship_policy import (
    ScholarshipPolicyCreate,
    ScholarshipPolicyListOut,
    ScholarshipPolicyOut,
    ScholarshipPolicyUpdate,
)
from src.services import scholarship_policy_service


router = APIRouter(prefix="/scholarship-policies", tags=["Scholarship Policy"])
admin_required = require_role([StaffRole.ADMIN])
staff_required = require_role([StaffRole.ADMIN, StaffRole.COUNSELOR])


@router.get("", response_model=ScholarshipPolicyListOut)
def list_scholarship_policies(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return scholarship_policy_service.list_scholarship_policies(db, limit, offset)


@router.get("/{policy_id}", response_model=ScholarshipPolicyOut)
def get_scholarship_policy(
    policy_id: UUID,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return scholarship_policy_service.get_scholarship_policy_or_404(policy_id, db)


@router.post("", response_model=ScholarshipPolicyOut, status_code=status.HTTP_201_CREATED)
def create_scholarship_policy(
    data: ScholarshipPolicyCreate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return scholarship_policy_service.create_scholarship_policy(data, db)


@router.patch("/{policy_id}", response_model=ScholarshipPolicyOut)
def update_scholarship_policy(
    policy_id: UUID,
    data: ScholarshipPolicyUpdate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return scholarship_policy_service.update_scholarship_policy(policy_id, data, db)


@router.delete("/{policy_id}")
def delete_scholarship_policy(
    policy_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return scholarship_policy_service.delete_scholarship_policy(policy_id, db)
