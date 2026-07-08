"""Service layer for nutrition operations.

Business/DB logic extracted verbatim from the nutrition route handlers.
Ownership lookups use ``get_owned_or_404``. This module raises ``HTTPException``
directly to preserve the exact status codes and detail strings of the original
handlers.
"""
from datetime import date, timedelta
from typing import Optional, List
from uuid import UUID
import math

from fastapi import HTTPException, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_owned_or_404
from app.models.user import User
from app.models.nutrition import NutritionGoal, NutritionLog, HealthMetric
from app.models.meal_plan import Meal, MealPlan
from app.models.restaurant import RestaurantMeal
from app.models.recipe import Recipe
from app.services.ai_service import ai_service
from app.schemas.nutrition import (
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
    NutritionEntry,
    NutritionSource,
    DailyNutritionSummary,
    DailyNutritionWithGoals,
    WeeklyNutritionSummary,
    NutritionAnalytics,
    CalculateRecipeNutritionRequest,
    CalculateFoodNutritionRequest,
    NutritionEstimate,
)


# ============ Nutrition Goals ============

async def list_nutrition_goals(
    db: AsyncSession,
    current_user: User,
    active_only: bool = True,
    profile_id: Optional[UUID] = None,
) -> List[NutritionGoalResponse]:
    """List user's nutrition goals."""
    query = select(NutritionGoal).where(NutritionGoal.user_id == current_user.id)

    if active_only:
        query = query.where(NutritionGoal.is_active == True)

    # Filter by profile (None = all members/shared)
    if profile_id:
        query = query.where(NutritionGoal.profile_id == profile_id)

    query = query.order_by(NutritionGoal.created_at.desc())

    result = await db.execute(query)
    goals = result.scalars().all()

    return [NutritionGoalResponse.model_validate(g) for g in goals]


async def get_active_goal(
    db: AsyncSession,
    current_user: User,
    profile_id: Optional[UUID] = None,
) -> Optional[NutritionGoalResponse]:
    """Get the user's currently active nutrition goal."""
    query = select(NutritionGoal).where(
        and_(
            NutritionGoal.user_id == current_user.id,
            NutritionGoal.is_active == True
        )
    )

    # Filter by profile (None = all members/shared)
    if profile_id:
        query = query.where(NutritionGoal.profile_id == profile_id)

    result = await db.execute(
        query.order_by(NutritionGoal.created_at.desc()).limit(1)
    )
    goal = result.scalar_one_or_none()

    if not goal:
        return None

    return NutritionGoalResponse.model_validate(goal)


async def create_nutrition_goal(
    db: AsyncSession,
    current_user: User,
    request: NutritionGoalCreate,
) -> NutritionGoalResponse:
    """Create a new nutrition goal. Deactivates any existing active goals for the same profile."""
    # Deactivate existing active goals for the same profile only
    deactivate_conditions = [
        NutritionGoal.user_id == current_user.id,
        NutritionGoal.is_active == True
    ]
    # Only deactivate goals for the same profile (or shared goals if no profile specified)
    if request.profile_id:
        deactivate_conditions.append(NutritionGoal.profile_id == request.profile_id)
    else:
        deactivate_conditions.append(NutritionGoal.profile_id.is_(None))

    existing_goals = await db.execute(
        select(NutritionGoal).where(and_(*deactivate_conditions))
    )
    for goal in existing_goals.scalars().all():
        goal.is_active = False

    # Create new goal
    goal = NutritionGoal(
        user_id=current_user.id,
        profile_id=request.profile_id,
        daily_calories=request.daily_calories,
        daily_protein_g=request.daily_protein_g,
        daily_carbs_g=request.daily_carbs_g,
        daily_fat_g=request.daily_fat_g,
        daily_fiber_g=request.daily_fiber_g,
        daily_sugar_g=request.daily_sugar_g,
        daily_sodium_mg=request.daily_sodium_mg,
        goal_type=request.goal_type.value if request.goal_type else None,
        start_date=request.start_date or date.today(),
        is_active=True,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)

    return NutritionGoalResponse.model_validate(goal)


async def update_nutrition_goal(
    db: AsyncSession,
    current_user: User,
    goal_id: UUID,
    request: NutritionGoalUpdate,
) -> NutritionGoalResponse:
    """Update a nutrition goal."""
    goal = await get_owned_or_404(
        db, NutritionGoal, goal_id, current_user,
        detail="Nutrition goal not found",
    )

    # If activating this goal, deactivate other goals for the same profile
    if request.is_active is True and not goal.is_active:
        deactivate_conditions = [
            NutritionGoal.user_id == current_user.id,
            NutritionGoal.is_active == True,
            NutritionGoal.id != goal_id
        ]
        if goal.profile_id:
            deactivate_conditions.append(NutritionGoal.profile_id == goal.profile_id)
        else:
            deactivate_conditions.append(NutritionGoal.profile_id.is_(None))

        existing_goals = await db.execute(
            select(NutritionGoal).where(and_(*deactivate_conditions))
        )
        for existing_goal in existing_goals.scalars().all():
            existing_goal.is_active = False

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "goal_type" and value is not None:
            setattr(goal, field, value.value)
        else:
            setattr(goal, field, value)

    await db.commit()
    await db.refresh(goal)

    return NutritionGoalResponse.model_validate(goal)


async def delete_nutrition_goal(
    db: AsyncSession,
    current_user: User,
    goal_id: UUID,
) -> None:
    """Delete a nutrition goal."""
    goal = await get_owned_or_404(
        db, NutritionGoal, goal_id, current_user,
        detail="Nutrition goal not found",
    )

    await db.delete(goal)
    await db.commit()


# ============ Custom Nutrition Logs ============

async def list_nutrition_logs(
    db: AsyncSession,
    current_user: User,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    meal_type: Optional[str] = None,
    profile_id: Optional[UUID] = None,
    is_archived: bool = False,
    page: int = 1,
    per_page: int = 50,
) -> NutritionLogListResponse:
    """List custom nutrition log entries."""
    query = select(NutritionLog).where(
        and_(
            NutritionLog.user_id == current_user.id,
            NutritionLog.is_archived == is_archived
        )
    )

    if date_from:
        query = query.where(NutritionLog.date >= date_from)
    if date_to:
        query = query.where(NutritionLog.date <= date_to)
    if meal_type:
        query = query.where(NutritionLog.meal_type == meal_type)
    # Filter by profile (None = all members/shared)
    if profile_id:
        query = query.where(NutritionLog.profile_id == profile_id)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.order_by(NutritionLog.date.desc(), NutritionLog.created_at.desc())
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    logs = result.scalars().all()

    total_pages = math.ceil(total / per_page) if total > 0 else 1

    return NutritionLogListResponse(
        items=[NutritionLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


async def create_nutrition_log(
    db: AsyncSession,
    current_user: User,
    request: NutritionLogCreate,
) -> NutritionLogResponse:
    """Create a custom nutrition log entry."""
    log = NutritionLog(
        user_id=current_user.id,
        profile_id=request.profile_id,
        date=request.date,
        meal_type=request.meal_type.value if request.meal_type else None,
        meal_id=request.meal_id,
        restaurant_meal_id=request.restaurant_meal_id,
        name=request.name,
        manual_entry=request.manual_entry,
        calories=request.calories,
        protein_g=request.protein_g,
        carbs_g=request.carbs_g,
        fat_g=request.fat_g,
        fiber_g=request.fiber_g,
        sugar_g=request.sugar_g,
        sodium_mg=request.sodium_mg,
        notes=request.notes,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    return NutritionLogResponse.model_validate(log)


async def update_nutrition_log(
    db: AsyncSession,
    current_user: User,
    log_id: UUID,
    request: NutritionLogUpdate,
) -> NutritionLogResponse:
    """Update a nutrition log entry."""
    log = await get_owned_or_404(
        db, NutritionLog, log_id, current_user,
        detail="Nutrition log not found",
    )

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "meal_type" and value is not None:
            setattr(log, field, value.value)
        else:
            setattr(log, field, value)

    await db.commit()
    await db.refresh(log)

    return NutritionLogResponse.model_validate(log)


async def delete_nutrition_log(
    db: AsyncSession,
    current_user: User,
    log_id: UUID,
) -> None:
    """Delete a nutrition log entry."""
    log = await get_owned_or_404(
        db, NutritionLog, log_id, current_user,
        detail="Nutrition log not found",
    )

    await db.delete(log)
    await db.commit()


# ============ Health Metrics ============

async def list_health_metrics(
    db: AsyncSession,
    current_user: User,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    per_page: int = 50,
) -> HealthMetricListResponse:
    """List health metrics."""
    query = select(HealthMetric).where(HealthMetric.user_id == current_user.id)

    if date_from:
        query = query.where(HealthMetric.date >= date_from)
    if date_to:
        query = query.where(HealthMetric.date <= date_to)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.order_by(HealthMetric.date.desc())
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    metrics = result.scalars().all()

    total_pages = math.ceil(total / per_page) if total > 0 else 1

    return HealthMetricListResponse(
        items=[HealthMetricResponse.model_validate(m) for m in metrics],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


async def create_health_metric(
    db: AsyncSession,
    current_user: User,
    request: HealthMetricCreate,
) -> HealthMetricResponse:
    """Create or update health metric for a date."""
    # Check if metric exists for this date
    existing = await db.execute(
        select(HealthMetric).where(
            and_(
                HealthMetric.user_id == current_user.id,
                HealthMetric.date == request.date
            )
        )
    )
    metric = existing.scalar_one_or_none()

    if metric:
        # Update existing
        for field, value in request.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(metric, field, value)
    else:
        # Create new
        metric = HealthMetric(
            user_id=current_user.id,
            **request.model_dump()
        )
        db.add(metric)

    await db.commit()
    await db.refresh(metric)

    return HealthMetricResponse.model_validate(metric)


async def delete_health_metric(
    db: AsyncSession,
    current_user: User,
    metric_id: UUID,
) -> None:
    """Delete a health metric."""
    metric = await get_owned_or_404(
        db, HealthMetric, metric_id, current_user,
        detail="Health metric not found",
    )

    await db.delete(metric)
    await db.commit()


# ============ Aggregated Nutrition Data ============

async def get_daily_nutrition(
    db: AsyncSession,
    current_user: User,
    target_date: date,
    profile_id: Optional[UUID] = None,
) -> DailyNutritionWithGoals:
    """Get aggregated nutrition for a specific day from all sources."""
    entries: List[NutritionEntry] = []

    # 1. Get meals from Meal Planner (with recipe nutrition)
    # Build conditions for meal plan query
    meal_conditions = [
        MealPlan.user_id == current_user.id,
        Meal.date == target_date
    ]
    # Filter by profile if specified
    if profile_id:
        meal_conditions.append(MealPlan.profile_id == profile_id)

    meal_result = await db.execute(
        select(Meal)
        .join(MealPlan)
        .options(selectinload(Meal.recipe).selectinload(Recipe.nutrition))
        .where(and_(*meal_conditions))
    )
    meals = meal_result.scalars().all()

    for meal in meals:
        if meal.recipe:
            # Meal with recipe - use recipe nutrition if available
            name = meal.recipe.name
            calories = None
            protein_g = None
            carbs_g = None
            fat_g = None
            fiber_g = None
            sugar_g = None
            sodium_mg = None

            if meal.recipe.nutrition:
                nutr = meal.recipe.nutrition
                servings_multiplier = (meal.servings or meal.recipe.servings or 1) / (meal.recipe.servings or 1)
                calories = int(float(nutr.calories) * servings_multiplier) if nutr.calories else None
                protein_g = float(nutr.protein_g) * servings_multiplier if nutr.protein_g else None
                carbs_g = float(nutr.carbs_g) * servings_multiplier if nutr.carbs_g else None
                fat_g = float(nutr.fat_g) * servings_multiplier if nutr.fat_g else None
                fiber_g = float(nutr.fiber_g) * servings_multiplier if nutr.fiber_g else None
                sugar_g = float(nutr.sugar_g) * servings_multiplier if nutr.sugar_g else None
                sodium_mg = float(nutr.sodium_mg) * servings_multiplier if nutr.sodium_mg else None

            entries.append(NutritionEntry(
                id=meal.id,
                source=NutritionSource.MEAL_PLAN,
                source_id=meal.recipe_id,
                name=name,
                meal_type=meal.meal_type,
                date=target_date,
                calories=calories,
                protein_g=protein_g,
                carbs_g=carbs_g,
                fat_g=fat_g,
                fiber_g=fiber_g,
                sugar_g=sugar_g,
                sodium_mg=sodium_mg,
            ))
        elif meal.custom_name:
            # Custom meal without recipe
            entries.append(NutritionEntry(
                id=meal.id,
                source=NutritionSource.MEAL_PLAN,
                source_id=None,
                name=meal.custom_name,
                meal_type=meal.meal_type,
                date=target_date,
            ))

    # 2. Get restaurant meals
    restaurant_result = await db.execute(
        select(RestaurantMeal).where(
            and_(
                RestaurantMeal.user_id == current_user.id,
                RestaurantMeal.meal_date == target_date,
                RestaurantMeal.is_archived == False
            )
        )
    )
    restaurant_meals = restaurant_result.scalars().all()

    for rm in restaurant_meals:
        items_str = ", ".join(rm.items_ordered) if rm.items_ordered else ""
        name = f"{rm.restaurant_name}"
        if items_str:
            name += f": {items_str[:50]}..." if len(items_str) > 50 else f": {items_str}"

        entries.append(NutritionEntry(
            id=rm.id,
            source=NutritionSource.RESTAURANT,
            source_id=rm.id,
            name=name,
            meal_type=rm.meal_type,
            date=target_date,
            calories=rm.estimated_calories,
            protein_g=float(rm.estimated_protein_g) if rm.estimated_protein_g else None,
            carbs_g=float(rm.estimated_carbs_g) if rm.estimated_carbs_g else None,
            fat_g=float(rm.estimated_fat_g) if rm.estimated_fat_g else None,
            fiber_g=float(rm.estimated_fiber_g) if rm.estimated_fiber_g else None,
            sugar_g=float(rm.estimated_sugar_g) if rm.estimated_sugar_g else None,
            sodium_mg=float(rm.estimated_sodium_mg) if rm.estimated_sodium_mg else None,
        ))

    # 3. Get custom nutrition logs
    log_conditions = [
        NutritionLog.user_id == current_user.id,
        NutritionLog.date == target_date,
        NutritionLog.is_archived == False,
        NutritionLog.meal_id.is_(None),  # Only standalone custom entries
        NutritionLog.restaurant_meal_id.is_(None),
    ]
    # Filter by profile if specified
    if profile_id:
        log_conditions.append(NutritionLog.profile_id == profile_id)

    log_result = await db.execute(
        select(NutritionLog).where(and_(*log_conditions))
    )
    logs = log_result.scalars().all()

    for log in logs:
        entries.append(NutritionEntry(
            id=log.id,
            source=NutritionSource.CUSTOM,
            source_id=log.id,
            name=log.name or "Custom entry",
            meal_type=log.meal_type,
            date=target_date,
            calories=log.calories,
            protein_g=float(log.protein_g) if log.protein_g else None,
            carbs_g=float(log.carbs_g) if log.carbs_g else None,
            fat_g=float(log.fat_g) if log.fat_g else None,
            fiber_g=float(log.fiber_g) if log.fiber_g else None,
            sugar_g=float(log.sugar_g) if log.sugar_g else None,
            sodium_mg=float(log.sodium_mg) if log.sodium_mg else None,
        ))

    # Calculate totals
    total_calories = sum(e.calories or 0 for e in entries)
    total_protein = sum(e.protein_g or 0 for e in entries)
    total_carbs = sum(e.carbs_g or 0 for e in entries)
    total_fat = sum(e.fat_g or 0 for e in entries)
    total_fiber = sum(e.fiber_g or 0 for e in entries)
    total_sugar = sum(e.sugar_g or 0 for e in entries)
    total_sodium = sum(e.sodium_mg or 0 for e in entries)

    # Get active goal(s)
    # For "All Members" (no profile_id): aggregate all active goals
    # For specific profile: get that profile's goal
    goal_response = None
    aggregated_goal_calories = None
    aggregated_goal_protein = None
    aggregated_goal_carbs = None
    aggregated_goal_fat = None
    aggregated_goal_fiber = None
    aggregated_goal_sugar = None
    aggregated_goal_sodium = None

    if profile_id:
        # Single profile - get specific goal
        goal_result = await db.execute(
            select(NutritionGoal).where(
                and_(
                    NutritionGoal.user_id == current_user.id,
                    NutritionGoal.is_active == True,
                    NutritionGoal.profile_id == profile_id
                )
            ).limit(1)
        )
        goal = goal_result.scalar_one_or_none()
        if goal:
            goal_response = NutritionGoalResponse.model_validate(goal)
            aggregated_goal_calories = goal.daily_calories
            aggregated_goal_protein = goal.daily_protein_g
            aggregated_goal_carbs = goal.daily_carbs_g
            aggregated_goal_fat = goal.daily_fat_g
            aggregated_goal_fiber = goal.daily_fiber_g
            aggregated_goal_sugar = goal.daily_sugar_g
            aggregated_goal_sodium = goal.daily_sodium_mg
    else:
        # All Members - aggregate all active goals from all profiles
        goals_result = await db.execute(
            select(NutritionGoal).where(
                and_(
                    NutritionGoal.user_id == current_user.id,
                    NutritionGoal.is_active == True
                )
            )
        )
        all_goals = goals_result.scalars().all()

        if all_goals:
            # Sum up all goals
            aggregated_goal_calories = sum(g.daily_calories or 0 for g in all_goals) or None
            aggregated_goal_protein = sum(g.daily_protein_g or 0 for g in all_goals) or None
            aggregated_goal_carbs = sum(g.daily_carbs_g or 0 for g in all_goals) or None
            aggregated_goal_fat = sum(g.daily_fat_g or 0 for g in all_goals) or None
            aggregated_goal_fiber = sum(g.daily_fiber_g or 0 for g in all_goals) or None
            aggregated_goal_sugar = sum(g.daily_sugar_g or 0 for g in all_goals) or None
            aggregated_goal_sodium = sum(g.daily_sodium_mg or 0 for g in all_goals) or None

            # Create an aggregated goal response for display
            # Use the first goal as a template but with summed values
            goal_response = NutritionGoalResponse(
                id=all_goals[0].id,
                user_id=current_user.id,
                profile_id=None,
                daily_calories=aggregated_goal_calories,
                daily_protein_g=aggregated_goal_protein,
                daily_carbs_g=aggregated_goal_carbs,
                daily_fat_g=aggregated_goal_fat,
                daily_fiber_g=aggregated_goal_fiber,
                daily_sugar_g=aggregated_goal_sugar,
                daily_sodium_mg=aggregated_goal_sodium,
                goal_type=all_goals[0].goal_type,
                start_date=all_goals[0].start_date,
                is_active=True,
                created_at=all_goals[0].created_at,
                updated_at=all_goals[0].updated_at,
            )

    # Calculate percentages
    def calc_percent(actual: float, target: Optional[int]) -> Optional[float]:
        if target and target > 0:
            return round((actual / target) * 100, 1)
        return None

    return DailyNutritionWithGoals(
        date=target_date,
        total_calories=total_calories,
        total_protein_g=round(total_protein, 1),
        total_carbs_g=round(total_carbs, 1),
        total_fat_g=round(total_fat, 1),
        total_fiber_g=round(total_fiber, 1),
        total_sugar_g=round(total_sugar, 1),
        total_sodium_mg=round(total_sodium, 1),
        meal_count=len(entries),
        entries=entries,
        goal=goal_response,
        calories_percent=calc_percent(total_calories, aggregated_goal_calories),
        protein_percent=calc_percent(total_protein, aggregated_goal_protein),
        carbs_percent=calc_percent(total_carbs, aggregated_goal_carbs),
        fat_percent=calc_percent(total_fat, aggregated_goal_fat),
        fiber_percent=calc_percent(total_fiber, aggregated_goal_fiber),
        sugar_percent=calc_percent(total_sugar, aggregated_goal_sugar),
        sodium_percent=calc_percent(total_sodium, aggregated_goal_sodium),
    )


async def get_weekly_nutrition(
    db: AsyncSession,
    current_user: User,
    start_date: Optional[date] = None,
    profile_id: Optional[UUID] = None,
) -> WeeklyNutritionSummary:
    """Get weekly nutrition summary."""
    if not start_date:
        today = date.today()
        start_date = today - timedelta(days=today.weekday())  # Monday of current week

    end_date = start_date + timedelta(days=6)

    days = []
    total_calories = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0
    total_fiber = 0
    total_meals = 0

    for i in range(7):
        day_date = start_date + timedelta(days=i)
        # Reuse daily endpoint logic (with profile filtering)
        daily = await get_daily_nutrition(db, current_user, day_date, profile_id)
        days.append(DailyNutritionSummary(
            date=daily.date,
            total_calories=daily.total_calories,
            total_protein_g=daily.total_protein_g,
            total_carbs_g=daily.total_carbs_g,
            total_fat_g=daily.total_fat_g,
            total_fiber_g=daily.total_fiber_g,
            total_sugar_g=daily.total_sugar_g,
            total_sodium_mg=daily.total_sodium_mg,
            meal_count=daily.meal_count,
            entries=daily.entries,
        ))
        total_calories += daily.total_calories
        total_protein += daily.total_protein_g
        total_carbs += daily.total_carbs_g
        total_fat += daily.total_fat_g
        total_fiber += daily.total_fiber_g
        total_meals += daily.meal_count

    return WeeklyNutritionSummary(
        start_date=start_date,
        end_date=end_date,
        days=days,
        avg_daily_calories=round(total_calories / 7, 1),
        avg_daily_protein_g=round(total_protein / 7, 1),
        avg_daily_carbs_g=round(total_carbs / 7, 1),
        avg_daily_fat_g=round(total_fat / 7, 1),
        avg_daily_fiber_g=round(total_fiber / 7, 1),
        total_meals=total_meals,
    )


async def get_nutrition_analytics(
    db: AsyncSession,
    current_user: User,
    days: int = 30,
    profile_id: Optional[UUID] = None,
) -> NutritionAnalytics:
    """Get nutrition analytics for a period."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    daily_data = []
    total_calories = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0
    total_fiber = 0
    total_sugar = 0
    total_sodium = 0
    total_meals = 0
    meals_from_plan = 0
    meals_from_restaurant = 0
    meals_custom = 0
    days_logged = 0
    days_meeting_goal = 0

    # Get active goal(s) for achievement calculation
    # For "All Members": aggregate all active goals
    # For specific profile: get that profile's goal
    aggregated_goal_calories = None

    if profile_id:
        goal_result = await db.execute(
            select(NutritionGoal).where(
                and_(
                    NutritionGoal.user_id == current_user.id,
                    NutritionGoal.is_active == True,
                    NutritionGoal.profile_id == profile_id
                )
            ).limit(1)
        )
        goal = goal_result.scalar_one_or_none()
        if goal:
            aggregated_goal_calories = goal.daily_calories
    else:
        # All Members - sum all active goals
        goals_result = await db.execute(
            select(NutritionGoal).where(
                and_(
                    NutritionGoal.user_id == current_user.id,
                    NutritionGoal.is_active == True
                )
            )
        )
        all_goals = goals_result.scalars().all()
        if all_goals:
            aggregated_goal_calories = sum(g.daily_calories or 0 for g in all_goals) or None

    for i in range(days):
        day_date = start_date + timedelta(days=i)
        daily = await get_daily_nutrition(db, current_user, day_date, profile_id)

        daily_data.append(DailyNutritionSummary(
            date=daily.date,
            total_calories=daily.total_calories,
            total_protein_g=daily.total_protein_g,
            total_carbs_g=daily.total_carbs_g,
            total_fat_g=daily.total_fat_g,
            total_fiber_g=daily.total_fiber_g,
            total_sugar_g=daily.total_sugar_g,
            total_sodium_mg=daily.total_sodium_mg,
            meal_count=daily.meal_count,
            entries=[],  # Don't include entries in analytics for performance
        ))

        if daily.meal_count > 0:
            days_logged += 1
            total_calories += daily.total_calories
            total_protein += daily.total_protein_g
            total_carbs += daily.total_carbs_g
            total_fat += daily.total_fat_g
            total_fiber += daily.total_fiber_g
            total_sugar += daily.total_sugar_g
            total_sodium += daily.total_sodium_mg
            total_meals += daily.meal_count

            # Count by source
            for entry in daily.entries:
                if entry.source == NutritionSource.MEAL_PLAN:
                    meals_from_plan += 1
                elif entry.source == NutritionSource.RESTAURANT:
                    meals_from_restaurant += 1
                else:
                    meals_custom += 1

            # Check goal achievement
            if aggregated_goal_calories:
                # Consider within 10% of goal as meeting it
                if 0.9 * aggregated_goal_calories <= daily.total_calories <= 1.1 * aggregated_goal_calories:
                    days_meeting_goal += 1

    # Calculate averages
    divisor = days_logged if days_logged > 0 else 1

    return NutritionAnalytics(
        period_days=days,
        start_date=start_date,
        end_date=end_date,
        avg_daily_calories=round(total_calories / divisor, 1),
        avg_daily_protein_g=round(total_protein / divisor, 1),
        avg_daily_carbs_g=round(total_carbs / divisor, 1),
        avg_daily_fat_g=round(total_fat / divisor, 1),
        avg_daily_fiber_g=round(total_fiber / divisor, 1),
        avg_daily_sugar_g=round(total_sugar / divisor, 1),
        avg_daily_sodium_mg=round(total_sodium / divisor, 1),
        goal_achievement_rate=round((days_meeting_goal / days_logged) * 100, 1) if days_logged > 0 else None,
        days_logged=days_logged,
        total_meals=total_meals,
        meals_from_plan=meals_from_plan,
        meals_from_restaurant=meals_from_restaurant,
        meals_custom=meals_custom,
        daily_data=daily_data,
    )


# ============ Nutrition Calculation Endpoints ============

async def calculate_recipe_nutrition(
    db: AsyncSession,
    current_user: User,
    request: CalculateRecipeNutritionRequest,
) -> NutritionEstimate:
    """Calculate and optionally save nutrition for a recipe."""
    # Get recipe with ingredients
    recipe = await get_owned_or_404(
        db, Recipe, request.recipe_id, current_user,
        detail="Recipe not found",
        options=[selectinload(Recipe.ingredients), selectinload(Recipe.nutrition)],
    )

    # Prepare ingredients for AI
    ingredients = [
        {
            "ingredient_name": ing.ingredient_name,
            "quantity": float(ing.quantity) if ing.quantity else None,
            "unit": ing.unit,
        }
        for ing in recipe.ingredients
    ]

    # Calculate nutrition
    nutrition = await ai_service.calculate_recipe_nutrition(
        recipe_name=recipe.name,
        ingredients=ingredients,
        servings=recipe.servings or 1,
    )

    if not nutrition:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not calculate nutrition for this recipe"
        )

    # Update or create recipe nutrition
    if recipe.nutrition:
        recipe.nutrition.calories = nutrition.get("calories")
        recipe.nutrition.protein_g = nutrition.get("protein_g")
        recipe.nutrition.carbs_g = nutrition.get("carbs_g")
        recipe.nutrition.fat_g = nutrition.get("fat_g")
        recipe.nutrition.fiber_g = nutrition.get("fiber_g")
        recipe.nutrition.sugar_g = nutrition.get("sugar_g")
        recipe.nutrition.sodium_mg = nutrition.get("sodium_mg")
    else:
        from app.models.recipe import RecipeNutrition
        recipe_nutrition = RecipeNutrition(
            recipe_id=recipe.id,
            calories=nutrition.get("calories"),
            protein_g=nutrition.get("protein_g"),
            carbs_g=nutrition.get("carbs_g"),
            fat_g=nutrition.get("fat_g"),
            fiber_g=nutrition.get("fiber_g"),
            sugar_g=nutrition.get("sugar_g"),
            sodium_mg=nutrition.get("sodium_mg"),
        )
        db.add(recipe_nutrition)

    await db.commit()

    return NutritionEstimate(
        name=recipe.name,
        calories=nutrition.get("calories"),
        protein_g=nutrition.get("protein_g"),
        carbs_g=nutrition.get("carbs_g"),
        fat_g=nutrition.get("fat_g"),
        fiber_g=nutrition.get("fiber_g"),
        sugar_g=nutrition.get("sugar_g"),
        sodium_mg=nutrition.get("sodium_mg"),
    )


async def calculate_food_nutrition(
    db: AsyncSession,
    current_user: User,
    request: CalculateFoodNutritionRequest,
) -> NutritionEstimate:
    """Estimate nutrition for a food item by description."""
    nutrition = await ai_service.estimate_food_nutrition(request.description)

    if not nutrition:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not estimate nutrition for this food"
        )

    return NutritionEstimate(
        name=nutrition.get("name", request.description),
        calories=nutrition.get("calories"),
        protein_g=nutrition.get("protein_g"),
        carbs_g=nutrition.get("carbs_g"),
        fat_g=nutrition.get("fat_g"),
        fiber_g=nutrition.get("fiber_g"),
        sugar_g=nutrition.get("sugar_g"),
        sodium_mg=nutrition.get("sodium_mg"),
    )
