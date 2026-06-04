from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from src.api.deps import require_role
from src.db import session
from src.models.enums import FeeType, StaffRole
from src.schemas.tuition_policy import (
    TuitionPolicyCreate,
    TuitionPolicyListOut,
    TuitionPolicyOut,
    TuitionPolicyStatusUpdate,
    TuitionPolicyUpdate,
)
from src.services import tuition_policy_service

router = APIRouter(prefix="/tuition-policies", tags=["Tuition Policy"])
admin_required = require_role([StaffRole.ADMIN])
staff_required = require_role([StaffRole.ADMIN, StaffRole.COUNSELOR])


@router.get("", response_model=TuitionPolicyListOut)
def list_tuition_policies(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    year: int | None = Query(default=None, ge=2000, le=2100),
    major_id: UUID | None = Query(default=None),
    fee_type: FeeType | None = Query(default=None),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return tuition_policy_service.list_tuition_policies(
        db,
        limit,
        offset,
        year=year,
        major_id=major_id,
        fee_type=fee_type,
    )


@router.get("/major/{major_id}", response_model=TuitionPolicyListOut)
def get_tuition_policies_by_major_id(
    major_id: UUID,
    year: int | None = Query(default=None, ge=2000, le=2100),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return tuition_policy_service.get_tuition_policies_by_major_id(
        major_id,
        db,
        year=year,
        limit=limit,
        offset=offset,
    )


@router.get("/{policy_id}", response_model=TuitionPolicyOut)
def get_tuition_policy(
    policy_id: UUID,
    user: dict = Depends(staff_required),
    db: session = Depends(session.get_db),
):
    return tuition_policy_service.get_tuition_policy_or_404(policy_id, db)


@router.post("", response_model=TuitionPolicyOut, status_code=status.HTTP_201_CREATED)
def create_tuition_policy(
    data: TuitionPolicyCreate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return tuition_policy_service.create_tuition_policy(data, db)


@router.patch("/{policy_id}", response_model=TuitionPolicyOut)
def update_tuition_policy(
    policy_id: UUID,
    data: TuitionPolicyUpdate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return tuition_policy_service.update_tuition_policy(policy_id, data, db)


@router.patch("/{policy_id}/status", response_model=TuitionPolicyOut)
def update_tuition_policy_status(
    policy_id: UUID,
    data: TuitionPolicyStatusUpdate,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return tuition_policy_service.update_tuition_policy_status(policy_id, data, db)


@router.delete("/{policy_id}")
def delete_tuition_policy(
    policy_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return tuition_policy_service.delete_tuition_policy(policy_id, db)
