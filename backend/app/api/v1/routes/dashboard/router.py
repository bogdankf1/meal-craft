"""
Dashboard API router.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.api.v1.routes.dashboard.schemas import DashboardResponse
from app.api.v1.routes.dashboard import service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get aggregated dashboard data for the current user.

    Returns statistics and data from all modules:
    - Meal planning stats
    - Pantry inventory stats
    - Recipe collection stats
    - Budget/spending stats
    - Nutrition goal progress
    - Upcoming meals
    - Expiring items
    - Recent activity
    - Waste analytics
    - Skills progress
    - Seasonal produce
    - Equipment maintenance alerts
    """
    return await service.get_dashboard_data(db, current_user.id)
