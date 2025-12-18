"""
Admin analytics endpoints.
"""
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_admin_user
from app.models.user import User
from app.api.v1.routes.admin.service import AdminService
from app.api.v1.routes.admin.schemas import (
    PlatformStats,
    UserAcquisition,
    EngagementMetrics,
    ModuleUsageStats,
)

router = APIRouter(prefix="/analytics", tags=["Admin - Analytics"])


@router.get("/platform-stats", response_model=PlatformStats)
async def get_platform_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get platform-wide statistics."""
    service = AdminService(db)
    stats = await service.get_platform_stats()
    return PlatformStats(**stats)


@router.get("/user-acquisition", response_model=List[UserAcquisition])
async def get_user_acquisition(
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get user acquisition data for the past N days."""
    service = AdminService(db)
    data = await service.get_user_acquisition_data(days)
    return [UserAcquisition(**item) for item in data]


@router.get("/engagement", response_model=EngagementMetrics)
async def get_engagement_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get user engagement metrics."""
    service = AdminService(db)
    metrics = await service.get_engagement_metrics()
    return EngagementMetrics(**metrics)


@router.get("/module-usage", response_model=List[ModuleUsageStats])
async def get_module_usage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get usage statistics for each module."""
    service = AdminService(db)
    stats = await service.get_module_usage_stats()
    return [ModuleUsageStats(**item) for item in stats]
