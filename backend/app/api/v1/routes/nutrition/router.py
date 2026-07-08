"""Nutrition API routes - Goals, Logs, Aggregation, and Analytics.

Thin route handlers: validate the request (via the FastAPI signature) and
delegate to ``service``.
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import date
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.api.v1.routes.nutrition import service
from app.api.v1.routes.nutrition.schemas import (
    NutritionGoalCreate,
    NutritionGoalUpdate,
    NutritionGoalResponse,
    NutritionLogCreate,
    NutritionLogUpdate,
    NutritionLogResponse,
    NutritionLogListResponse,
    HealthMetricCreate,
    HealthMetricResponse,
    HealthMetricListResponse,
    DailyNutritionWithGoals,
    WeeklyNutritionSummary,
    NutritionAnalytics,
    CalculateRecipeNutritionRequest,
    CalculateFoodNutritionRequest,
    NutritionEstimate,
)

router = APIRouter()


# ============ Nutrition Goals ============

@router.get("/goals", response_model=List[NutritionGoalResponse])
async def list_nutrition_goals(
    active_only: bool = Query(True, description="Only return active goals"),
    profile_id: Optional[UUID] = Query(None, description="Filter by profile ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's nutrition goals."""
    return await service.list_nutrition_goals(
        db, current_user, active_only=active_only, profile_id=profile_id
    )


@router.get("/goals/active", response_model=Optional[NutritionGoalResponse])
async def get_active_goal(
    profile_id: Optional[UUID] = Query(None, description="Filter by profile ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the user's currently active nutrition goal."""
    return await service.get_active_goal(db, current_user, profile_id=profile_id)


@router.post("/goals", response_model=NutritionGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_nutrition_goal(
    request: NutritionGoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new nutrition goal. Deactivates any existing active goals for the same profile."""
    return await service.create_nutrition_goal(db, current_user, request)


@router.put("/goals/{goal_id}", response_model=NutritionGoalResponse)
async def update_nutrition_goal(
    goal_id: UUID,
    request: NutritionGoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a nutrition goal."""
    return await service.update_nutrition_goal(db, current_user, goal_id, request)


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_nutrition_goal(
    goal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a nutrition goal."""
    await service.delete_nutrition_goal(db, current_user, goal_id)


# ============ Custom Nutrition Logs ============

@router.get("/logs", response_model=NutritionLogListResponse)
async def list_nutrition_logs(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    meal_type: Optional[str] = Query(None),
    profile_id: Optional[UUID] = Query(None, description="Filter by profile ID"),
    is_archived: bool = Query(False),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List custom nutrition log entries."""
    return await service.list_nutrition_logs(
        db,
        current_user,
        date_from=date_from,
        date_to=date_to,
        meal_type=meal_type,
        profile_id=profile_id,
        is_archived=is_archived,
        page=page,
        per_page=per_page,
    )


@router.post("/logs", response_model=NutritionLogResponse, status_code=status.HTTP_201_CREATED)
async def create_nutrition_log(
    request: NutritionLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a custom nutrition log entry."""
    return await service.create_nutrition_log(db, current_user, request)


@router.put("/logs/{log_id}", response_model=NutritionLogResponse)
async def update_nutrition_log(
    log_id: UUID,
    request: NutritionLogUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a nutrition log entry."""
    return await service.update_nutrition_log(db, current_user, log_id, request)


@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_nutrition_log(
    log_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a nutrition log entry."""
    await service.delete_nutrition_log(db, current_user, log_id)


# ============ Health Metrics ============

@router.get("/health-metrics", response_model=HealthMetricListResponse)
async def list_health_metrics(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List health metrics."""
    return await service.list_health_metrics(
        db,
        current_user,
        date_from=date_from,
        date_to=date_to,
        page=page,
        per_page=per_page,
    )


@router.post("/health-metrics", response_model=HealthMetricResponse, status_code=status.HTTP_201_CREATED)
async def create_health_metric(
    request: HealthMetricCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update health metric for a date."""
    return await service.create_health_metric(db, current_user, request)


@router.delete("/health-metrics/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_health_metric(
    metric_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a health metric."""
    await service.delete_health_metric(db, current_user, metric_id)


# ============ Aggregated Nutrition Data ============

@router.get("/daily/{target_date}", response_model=DailyNutritionWithGoals)
async def get_daily_nutrition(
    target_date: date,
    profile_id: Optional[UUID] = Query(None, description="Filter by profile ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated nutrition for a specific day from all sources."""
    return await service.get_daily_nutrition(db, current_user, target_date, profile_id=profile_id)


@router.get("/weekly", response_model=WeeklyNutritionSummary)
async def get_weekly_nutrition(
    start_date: Optional[date] = Query(None, description="Start date (defaults to current week)"),
    profile_id: Optional[UUID] = Query(None, description="Filter by profile ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get weekly nutrition summary."""
    return await service.get_weekly_nutrition(db, current_user, start_date=start_date, profile_id=profile_id)


@router.get("/analytics", response_model=NutritionAnalytics)
async def get_nutrition_analytics(
    days: int = Query(30, ge=7, le=365, description="Number of days to analyze"),
    profile_id: Optional[UUID] = Query(None, description="Filter by profile ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get nutrition analytics for a period."""
    return await service.get_nutrition_analytics(db, current_user, days=days, profile_id=profile_id)


# ============ Nutrition Calculation Endpoints ============

@router.post("/calculate/recipe", response_model=NutritionEstimate)
async def calculate_recipe_nutrition(
    request: CalculateRecipeNutritionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate and optionally save nutrition for a recipe."""
    return await service.calculate_recipe_nutrition(db, current_user, request)


@router.post("/calculate/food", response_model=NutritionEstimate)
async def calculate_food_nutrition(
    request: CalculateFoodNutritionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Estimate nutrition for a food item by description."""
    return await service.calculate_food_nutrition(db, current_user, request)
