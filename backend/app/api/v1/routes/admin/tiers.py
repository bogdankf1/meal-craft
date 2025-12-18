"""
Admin tier management endpoints.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_admin_user
from app.models.user import User
from app.api.v1.routes.admin.service import AdminService
from app.api.v1.routes.admin.schemas import (
    TierBase,
    TierUpdate,
    FeatureBase,
    TierFeatureResponse,
    TierFeatureAssignment,
)

router = APIRouter(prefix="/tiers", tags=["Admin - Tiers"])


@router.get("", response_model=List[TierBase])
async def get_tiers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get all subscription tiers."""
    service = AdminService(db)
    return await service.get_tiers()


@router.get("/features/all", response_model=List[FeatureBase])
async def get_all_features(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get all available features."""
    service = AdminService(db)
    return await service.get_all_features()


@router.get("/features/comparison")
async def get_features_comparison(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get all features for all tiers for comparison table."""
    service = AdminService(db)
    return await service.get_all_tiers_features()


@router.get("/{tier_id}", response_model=TierBase)
async def get_tier(
    tier_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get a specific tier by ID."""
    service = AdminService(db)
    tier = await service.get_tier_by_id(tier_id)
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tier not found",
        )
    return tier


@router.patch("/{tier_id}", response_model=TierBase)
async def update_tier(
    tier_id: UUID,
    update_data: TierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update tier details."""
    service = AdminService(db)
    tier = await service.update_tier(
        tier_id=tier_id,
        display_name=update_data.display_name,
        price_monthly=update_data.price_monthly,
        features=update_data.features,
    )
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tier not found",
        )
    return tier


@router.get("/{tier_id}/features", response_model=List[TierFeatureResponse])
async def get_tier_features(
    tier_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get features assigned to a tier."""
    service = AdminService(db)
    return await service.get_tier_features(tier_id)


@router.post("/{tier_id}/features", response_model=TierFeatureResponse)
async def assign_feature_to_tier(
    tier_id: UUID,
    assignment: TierFeatureAssignment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Assign or update a feature for a tier."""
    service = AdminService(db)
    result = await service.assign_feature_to_tier(
        tier_id=tier_id,
        feature_id=assignment.feature_id,
        enabled=assignment.enabled,
        limit_value=assignment.limit_value,
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tier or feature not found",
        )
    return result
