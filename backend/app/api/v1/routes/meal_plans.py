"""Meal Plan API Routes"""

import math
from datetime import datetime, date, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy import select, func, desc, asc, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.meal_plan import MealPlan, Meal, MealType
from app.models.recipe import Recipe, RecipeIngredient
from app.models.grocery import ShoppingList, ShoppingListItem
from app.schemas.meal_plan import (
    MealCreate,
    MealUpdate,
    MealResponse,
    MealPlanCreate,
    MealPlanUpdate,
    MealPlanResponse,
    MealPlanWithMeals,
    MealPlanListItem,
    MealPlanListResponse,
    MealPlanFilters,
    MealBulkCreate,
    RepeatMealPlanRequest,
    BulkMealActionRequest,
    BulkMealPlanActionRequest,
    BulkActionResponse,
    MealPlanAnalytics,
    MealsByType,
    MealsByRecipe,
    WeeklyOverview,
    MealPlanHistory,
    MonthlyMealPlanData,
    GenerateShoppingListRequest,
    GenerateShoppingListResponse,
    ParseMealPlanTextRequest,
    ParseMealPlanResponse,
    ParsedMealPlanMeal,
    CombinedWeekPlan,
    MealWithProfile,
    ProfileInfo,
)
from app.models.profile import Profile
from app.services.ai_service import ai_service

router = APIRouter(prefix="/meal-plans")


# ============ Helper Functions ============

def get_week_bounds(d: date) -> tuple[date, date]:
    """Get Monday and Sunday of the week containing the date."""
    monday = d - timedelta(days=d.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


async def build_meal_response(meal: Meal, recipe: Optional[Recipe] = None) -> MealResponse:
    """Build MealResponse from Meal model."""
    return MealResponse(
        id=meal.id,
        meal_plan_id=meal.meal_plan_id,
        date=meal.date,
        meal_type=meal.meal_type,
        recipe_id=meal.recipe_id,
        custom_name=meal.custom_name,
        servings=meal.servings,
        notes=meal.notes,
        is_leftover=meal.is_leftover,
        leftover_from_meal_id=meal.leftover_from_meal_id,
        created_at=meal.created_at,
        recipe_name=recipe.name if recipe else None,
        recipe_image_url=recipe.image_url if recipe else None,
        recipe_prep_time=recipe.prep_time if recipe else None,
        recipe_cook_time=recipe.cook_time if recipe else None,
    )


# ============ Meal Plan CRUD ============

@router.get("", response_model=MealPlanListResponse)
async def get_meal_plans(
    search: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    is_template: Optional[bool] = None,
    is_archived: Optional[bool] = False,
    profile_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("date_start"),
    sort_order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get paginated list of meal plans with filters."""
    query = select(MealPlan).where(MealPlan.user_id == current_user.id)

    # Filter by profile (None = all members/shared)
    if profile_id:
        query = query.where(MealPlan.profile_id == profile_id)

    # Apply filters
    if search:
        query = query.where(MealPlan.name.ilike(f"%{search}%"))

    if date_from:
        query = query.where(MealPlan.date_end >= date_from)

    if date_to:
        query = query.where(MealPlan.date_start <= date_to)

    if is_template is not None:
        query = query.where(MealPlan.is_template == is_template)

    if is_archived is not None:
        query = query.where(MealPlan.is_archived == is_archived)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply sorting
    sort_column = getattr(MealPlan, sort_by, MealPlan.date_start)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    # Apply pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    # Load meal count
    query = query.options(selectinload(MealPlan.meals))

    result = await db.execute(query)
    plans = result.scalars().all()

    items = [
        MealPlanListItem(
            id=p.id,
            profile_id=p.profile_id,
            name=p.name,
            date_start=p.date_start,
            date_end=p.date_end,
            servings=p.servings,
            is_template=p.is_template,
            is_archived=p.is_archived,
            created_at=p.created_at,
            meal_count=len(p.meals),
        )
        for p in plans
    ]

    return MealPlanListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.get("/current-week", response_model=Optional[MealPlanWithMeals])
async def get_current_week_plan(
    profile_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the meal plan for the current week (if exists)."""
    today = date.today()
    monday, sunday = get_week_bounds(today)

    # Build base conditions
    conditions = [
        MealPlan.user_id == current_user.id,
        MealPlan.date_start <= sunday,
        MealPlan.date_end >= monday,
        MealPlan.is_archived == False,
        MealPlan.is_template == False,
    ]

    # Filter by profile if specified
    if profile_id:
        conditions.append(MealPlan.profile_id == profile_id)

    query = (
        select(MealPlan)
        .where(*conditions)
        .options(selectinload(MealPlan.meals).selectinload(Meal.recipe))
        .order_by(desc(MealPlan.created_at))
        .limit(1)
    )

    result = await db.execute(query)
    plan = result.scalar_one_or_none()

    if not plan:
        return None

    meals = []
    for meal in sorted(plan.meals, key=lambda m: (m.date, m.meal_type)):
        meals.append(await build_meal_response(meal, meal.recipe))

    return MealPlanWithMeals(
        id=plan.id,
        user_id=plan.user_id,
        name=plan.name,
        date_start=plan.date_start,
        date_end=plan.date_end,
        servings=plan.servings,
        is_template=plan.is_template,
        is_archived=plan.is_archived,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        meals=meals,
    )


@router.get("/current-week/combined", response_model=CombinedWeekPlan)
async def get_combined_week_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get combined meal plans for all profiles for the current week."""
    today = date.today()
    monday, sunday = get_week_bounds(today)

    # Get all meal plans for the current week (all profiles)
    query = (
        select(MealPlan)
        .where(
            MealPlan.user_id == current_user.id,
            MealPlan.date_start <= sunday,
            MealPlan.date_end >= monday,
            MealPlan.is_archived == False,
            MealPlan.is_template == False,
        )
        .options(
            selectinload(MealPlan.meals).selectinload(Meal.recipe),
            selectinload(MealPlan.profile),
        )
    )

    result = await db.execute(query)
    plans = result.scalars().all()

    if not plans:
        return CombinedWeekPlan(
            date_start=monday,
            date_end=sunday,
            meals=[],
            profiles=[],
            plan_count=0,
        )

    # Get all profiles for reference
    profiles_query = select(Profile).where(
        Profile.user_id == current_user.id,
        Profile.is_archived == False
    )
    profiles_result = await db.execute(profiles_query)
    profiles = profiles_result.scalars().all()
    profiles_map = {p.id: p for p in profiles}

    # Combine all meals with profile info
    all_meals: List[MealWithProfile] = []
    seen_profile_ids = set()

    for plan in plans:
        profile = profiles_map.get(plan.profile_id) if plan.profile_id else None
        if plan.profile_id:
            seen_profile_ids.add(plan.profile_id)

        for meal in plan.meals:
            # Only include meals within the week bounds
            if monday <= meal.date <= sunday:
                meal_response = MealWithProfile(
                    id=meal.id,
                    meal_plan_id=meal.meal_plan_id,
                    date=meal.date,
                    meal_type=meal.meal_type,
                    recipe_id=meal.recipe_id,
                    custom_name=meal.custom_name,
                    servings=meal.servings,
                    notes=meal.notes,
                    is_leftover=meal.is_leftover,
                    leftover_from_meal_id=meal.leftover_from_meal_id,
                    created_at=meal.created_at,
                    recipe_name=meal.recipe.name if meal.recipe else None,
                    recipe_image_url=meal.recipe.image_url if meal.recipe else None,
                    recipe_prep_time=meal.recipe.prep_time if meal.recipe else None,
                    recipe_cook_time=meal.recipe.cook_time if meal.recipe else None,
                    profile_id=plan.profile_id,
                    profile_name=profile.name if profile else None,
                    profile_color=profile.color if profile else None,
                )
                all_meals.append(meal_response)

    # Sort meals by date and meal type
    all_meals.sort(key=lambda m: (m.date, m.meal_type))

    # Build profile info list (only profiles that have plans)
    profile_infos = [
        ProfileInfo(id=p.id, name=p.name, color=p.color)
        for p in profiles
        if p.id in seen_profile_ids
    ]

    return CombinedWeekPlan(
        date_start=monday,
        date_end=sunday,
        meals=all_meals,
        profiles=profile_infos,
        plan_count=len(plans),
    )


# ============ Analytics (must be before /{plan_id} route) ============

@router.get("/analytics/overview", response_model=MealPlanAnalytics)
async def get_meal_plan_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get meal plan analytics overview."""
    # Total counts
    total_plans_query = select(func.count()).select_from(MealPlan).where(
        MealPlan.user_id == current_user.id,
        MealPlan.is_archived == False
    )
    total_plans = (await db.execute(total_plans_query)).scalar() or 0

    total_meals_query = (
        select(func.count())
        .select_from(Meal)
        .join(MealPlan)
        .where(MealPlan.user_id == current_user.id, MealPlan.is_archived == False)
    )
    total_meals = (await db.execute(total_meals_query)).scalar() or 0

    archived_query = select(func.count()).select_from(MealPlan).where(
        MealPlan.user_id == current_user.id,
        MealPlan.is_archived == True
    )
    total_archived = (await db.execute(archived_query)).scalar() or 0

    # By meal type
    by_type_query = (
        select(Meal.meal_type, func.count().label("count"))
        .join(MealPlan)
        .where(MealPlan.user_id == current_user.id, MealPlan.is_archived == False)
        .group_by(Meal.meal_type)
    )
    by_type_result = await db.execute(by_type_query)
    by_meal_type = [
        MealsByType(meal_type=r.meal_type, count=r.count)
        for r in by_type_result.all()
    ]

    # Most planned recipes
    recipe_count_query = (
        select(Meal.recipe_id, func.count().label("count"))
        .join(MealPlan)
        .where(
            MealPlan.user_id == current_user.id,
            MealPlan.is_archived == False,
            Meal.recipe_id.isnot(None)
        )
        .group_by(Meal.recipe_id)
        .order_by(desc("count"))
        .limit(10)
    )
    recipe_count_result = await db.execute(recipe_count_query)
    recipe_counts = recipe_count_result.all()

    # Get recipe details
    recipe_ids = [r.recipe_id for r in recipe_counts]
    recipes_map = {}
    if recipe_ids:
        recipes_query = select(Recipe).where(Recipe.id.in_(recipe_ids))
        recipes_result = await db.execute(recipes_query)
        recipes_map = {r.id: r for r in recipes_result.scalars().all()}

    most_planned_recipes = [
        MealsByRecipe(
            recipe_id=r.recipe_id,
            recipe_name=recipes_map[r.recipe_id].name if r.recipe_id in recipes_map else "Unknown",
            count=r.count,
            category=recipes_map[r.recipe_id].category if r.recipe_id in recipes_map else None,
        )
        for r in recipe_counts
        if r.recipe_id in recipes_map
    ]

    # Current week overview
    today = date.today()
    monday, sunday = get_week_bounds(today)

    current_week_query = (
        select(MealPlan)
        .where(
            MealPlan.user_id == current_user.id,
            MealPlan.date_start <= sunday,
            MealPlan.date_end >= monday,
            MealPlan.is_archived == False,
            MealPlan.is_template == False,
        )
        .options(selectinload(MealPlan.meals))
        .limit(1)
    )
    current_week_result = await db.execute(current_week_query)
    current_plan = current_week_result.scalar_one_or_none()

    current_week = None
    if current_plan:
        week_meals = [m for m in current_plan.meals if monday <= m.date <= sunday]
        unique_recipes = len(set(m.recipe_id for m in week_meals if m.recipe_id))
        current_week = WeeklyOverview(
            week_start=monday,
            week_end=sunday,
            total_meals=len(week_meals),
            meals_with_recipes=len([m for m in week_meals if m.recipe_id]),
            unique_recipes=unique_recipes,
        )

    # Calculate averages
    avg_meals = total_meals / total_plans if total_plans > 0 else 0

    # Recipe variety - count of unique recipes used
    unique_recipes_query = (
        select(func.count(func.distinct(Meal.recipe_id)))
        .join(MealPlan)
        .where(
            MealPlan.user_id == current_user.id,
            MealPlan.is_archived == False,
            Meal.recipe_id.isnot(None)
        )
    )
    unique_count = (await db.execute(unique_recipes_query)).scalar() or 0

    return MealPlanAnalytics(
        total_meal_plans=total_plans,
        total_meals=total_meals,
        total_archived=total_archived,
        by_meal_type=by_meal_type,
        most_planned_recipes=most_planned_recipes,
        current_week=current_week,
        avg_meals_per_plan=round(avg_meals, 1),
        recipe_variety_score=unique_count,
    )


@router.get("/history", response_model=MealPlanHistory)
async def get_meal_plan_history(
    months: int = Query(3, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get meal plan history over time."""
    from dateutil.relativedelta import relativedelta

    end_date = datetime.utcnow()
    monthly_data = []

    for i in range(months):
        month_start = end_date - relativedelta(months=i+1)
        month_end = end_date - relativedelta(months=i)

        # Plans created
        plans_query = select(func.count()).select_from(MealPlan).where(
            MealPlan.user_id == current_user.id,
            MealPlan.created_at >= month_start,
            MealPlan.created_at < month_end,
        )
        plans_created = (await db.execute(plans_query)).scalar() or 0

        # Meals planned
        meals_query = (
            select(func.count())
            .select_from(Meal)
            .join(MealPlan)
            .where(
                MealPlan.user_id == current_user.id,
                Meal.created_at >= month_start,
                Meal.created_at < month_end,
            )
        )
        meals_planned = (await db.execute(meals_query)).scalar() or 0

        # Unique recipes
        unique_query = (
            select(func.count(func.distinct(Meal.recipe_id)))
            .join(MealPlan)
            .where(
                MealPlan.user_id == current_user.id,
                Meal.created_at >= month_start,
                Meal.created_at < month_end,
                Meal.recipe_id.isnot(None),
            )
        )
        unique_recipes = (await db.execute(unique_query)).scalar() or 0

        monthly_data.append(MonthlyMealPlanData(
            month=month_start.strftime("%Y-%m"),
            month_label=month_start.strftime("%b %Y"),
            plans_created=plans_created,
            meals_planned=meals_planned,
            unique_recipes=unique_recipes,
        ))

    monthly_data.reverse()

    return MealPlanHistory(
        period_months=months,
        total_plans=sum(m.plans_created for m in monthly_data),
        total_meals=sum(m.meals_planned for m in monthly_data),
        monthly_data=monthly_data,
    )


# ============ Get Single Meal Plan ============

@router.get("/{plan_id}", response_model=MealPlanWithMeals)
async def get_meal_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single meal plan by ID with all meals."""
    query = (
        select(MealPlan)
        .where(MealPlan.id == plan_id, MealPlan.user_id == current_user.id)
        .options(selectinload(MealPlan.meals).selectinload(Meal.recipe))
    )
    result = await db.execute(query)
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    meals = []
    for meal in sorted(plan.meals, key=lambda m: (m.date, m.meal_type)):
        meals.append(await build_meal_response(meal, meal.recipe))

    return MealPlanWithMeals(
        id=plan.id,
        user_id=plan.user_id,
        name=plan.name,
        date_start=plan.date_start,
        date_end=plan.date_end,
        servings=plan.servings,
        is_template=plan.is_template,
        is_archived=plan.is_archived,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        meals=meals,
    )


@router.post("", response_model=MealPlanResponse)
async def create_meal_plan(
    data: MealPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new meal plan."""
    if data.date_end < data.date_start:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    plan = MealPlan(
        user_id=current_user.id,
        profile_id=data.profile_id,
        name=data.name,
        date_start=data.date_start,
        date_end=data.date_end,
        servings=data.servings,
        is_template=data.is_template,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    return MealPlanResponse(
        id=plan.id,
        user_id=plan.user_id,
        profile_id=plan.profile_id,
        name=plan.name,
        date_start=plan.date_start,
        date_end=plan.date_end,
        servings=plan.servings,
        is_template=plan.is_template,
        is_archived=plan.is_archived,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        meal_count=0,
    )


@router.put("/{plan_id}", response_model=MealPlanResponse)
async def update_meal_plan(
    plan_id: UUID,
    data: MealPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a meal plan."""
    query = select(MealPlan).where(
        MealPlan.id == plan_id,
        MealPlan.user_id == current_user.id
    ).options(selectinload(MealPlan.meals))
    result = await db.execute(query)
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plan, field, value)

    await db.commit()
    await db.refresh(plan)

    return MealPlanResponse(
        id=plan.id,
        user_id=plan.user_id,
        name=plan.name,
        date_start=plan.date_start,
        date_end=plan.date_end,
        servings=plan.servings,
        is_template=plan.is_template,
        is_archived=plan.is_archived,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        meal_count=len(plan.meals),
    )


@router.delete("/{plan_id}")
async def delete_meal_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a meal plan and all its meals."""
    query = select(MealPlan).where(
        MealPlan.id == plan_id,
        MealPlan.user_id == current_user.id
    )
    result = await db.execute(query)
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    await db.delete(plan)
    await db.commit()

    return {"success": True, "message": "Meal plan deleted"}


# ============ Repeat/Copy Meal Plan ============

@router.post("/repeat", response_model=MealPlanWithMeals)
async def repeat_meal_plan(
    data: RepeatMealPlanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Copy a meal plan to new dates."""
    # Get source plan
    query = (
        select(MealPlan)
        .where(MealPlan.id == data.source_meal_plan_id, MealPlan.user_id == current_user.id)
        .options(selectinload(MealPlan.meals))
    )
    result = await db.execute(query)
    source_plan = result.scalar_one_or_none()

    if not source_plan:
        raise HTTPException(status_code=404, detail="Source meal plan not found")

    # Calculate date offset
    days_offset = (data.new_start_date - source_plan.date_start).days
    new_end_date = source_plan.date_end + timedelta(days=days_offset)

    # Create new plan
    new_plan = MealPlan(
        user_id=current_user.id,
        name=data.new_name or f"Copy of {source_plan.name}",
        date_start=data.new_start_date,
        date_end=new_end_date,
        servings=source_plan.servings,
        is_template=False,
    )
    db.add(new_plan)
    await db.flush()

    # Copy meals with adjusted dates
    for source_meal in source_plan.meals:
        new_meal = Meal(
            meal_plan_id=new_plan.id,
            date=source_meal.date + timedelta(days=days_offset),
            meal_type=source_meal.meal_type,
            recipe_id=source_meal.recipe_id,
            custom_name=source_meal.custom_name,
            servings=source_meal.servings,
            notes=source_meal.notes,
            is_leftover=source_meal.is_leftover,
        )
        db.add(new_meal)

    await db.commit()

    # Reload with meals
    query = (
        select(MealPlan)
        .where(MealPlan.id == new_plan.id)
        .options(selectinload(MealPlan.meals).selectinload(Meal.recipe))
    )
    result = await db.execute(query)
    plan = result.scalar_one()

    meals = []
    for meal in sorted(plan.meals, key=lambda m: (m.date, m.meal_type)):
        meals.append(await build_meal_response(meal, meal.recipe))

    return MealPlanWithMeals(
        id=plan.id,
        user_id=plan.user_id,
        name=plan.name,
        date_start=plan.date_start,
        date_end=plan.date_end,
        servings=plan.servings,
        is_template=plan.is_template,
        is_archived=plan.is_archived,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        meals=meals,
    )


# ============ Meal CRUD ============

@router.post("/{plan_id}/meals", response_model=MealResponse)
async def create_meal(
    plan_id: UUID,
    data: MealCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a meal to a meal plan."""
    # Verify plan exists
    plan_query = select(MealPlan).where(
        MealPlan.id == plan_id,
        MealPlan.user_id == current_user.id
    )
    plan_result = await db.execute(plan_query)
    plan = plan_result.scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    # Verify date is within plan range
    if not (plan.date_start <= data.date <= plan.date_end):
        raise HTTPException(
            status_code=400,
            detail=f"Meal date must be between {plan.date_start} and {plan.date_end}"
        )

    # Verify recipe if provided
    recipe = None
    if data.recipe_id:
        recipe_query = select(Recipe).where(
            Recipe.id == data.recipe_id,
            Recipe.user_id == current_user.id
        )
        recipe_result = await db.execute(recipe_query)
        recipe = recipe_result.scalar_one_or_none()
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")

    meal = Meal(
        meal_plan_id=plan_id,
        date=data.date,
        meal_type=data.meal_type.value,
        recipe_id=data.recipe_id,
        custom_name=data.custom_name,
        servings=data.servings or plan.servings,
        notes=data.notes,
        is_leftover=data.is_leftover,
        leftover_from_meal_id=data.leftover_from_meal_id,
    )
    db.add(meal)
    await db.commit()
    await db.refresh(meal)

    return await build_meal_response(meal, recipe)


@router.post("/{plan_id}/meals/bulk", response_model=List[MealResponse])
async def bulk_create_meals(
    plan_id: UUID,
    data: MealBulkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add multiple meals to a meal plan."""
    # Verify plan exists
    plan_query = select(MealPlan).where(
        MealPlan.id == plan_id,
        MealPlan.user_id == current_user.id
    )
    plan_result = await db.execute(plan_query)
    plan = plan_result.scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    # Get all recipe IDs
    recipe_ids = [m.recipe_id for m in data.meals if m.recipe_id]
    recipes_map = {}
    if recipe_ids:
        recipes_query = select(Recipe).where(
            Recipe.id.in_(recipe_ids),
            Recipe.user_id == current_user.id
        )
        recipes_result = await db.execute(recipes_query)
        recipes_map = {r.id: r for r in recipes_result.scalars().all()}

    created_meals = []
    for meal_data in data.meals:
        # Validate date
        if not (plan.date_start <= meal_data.date <= plan.date_end):
            continue  # Skip invalid dates

        meal = Meal(
            meal_plan_id=plan_id,
            date=meal_data.date,
            meal_type=meal_data.meal_type.value,
            recipe_id=meal_data.recipe_id,
            custom_name=meal_data.custom_name,
            servings=meal_data.servings or plan.servings,
            notes=meal_data.notes,
            is_leftover=meal_data.is_leftover,
            leftover_from_meal_id=meal_data.leftover_from_meal_id,
        )
        db.add(meal)
        created_meals.append((meal, recipes_map.get(meal_data.recipe_id)))

    await db.commit()

    responses = []
    for meal, recipe in created_meals:
        await db.refresh(meal)
        responses.append(await build_meal_response(meal, recipe))

    return responses


@router.put("/{plan_id}/meals/{meal_id}", response_model=MealResponse)
async def update_meal(
    plan_id: UUID,
    meal_id: UUID,
    data: MealUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a meal."""
    # Verify ownership
    query = (
        select(Meal)
        .join(MealPlan)
        .where(
            Meal.id == meal_id,
            Meal.meal_plan_id == plan_id,
            MealPlan.user_id == current_user.id
        )
    )
    result = await db.execute(query)
    meal = result.scalar_one_or_none()

    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    # Get recipe if updating
    recipe = None
    update_data = data.model_dump(exclude_unset=True)

    if "recipe_id" in update_data and update_data["recipe_id"]:
        recipe_query = select(Recipe).where(
            Recipe.id == update_data["recipe_id"],
            Recipe.user_id == current_user.id
        )
        recipe_result = await db.execute(recipe_query)
        recipe = recipe_result.scalar_one_or_none()
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")

    for field, value in update_data.items():
        if field == "meal_type" and value:
            value = value.value if hasattr(value, "value") else value
        setattr(meal, field, value)

    await db.commit()
    await db.refresh(meal)

    # Load recipe if not already loaded
    if meal.recipe_id and not recipe:
        recipe_query = select(Recipe).where(Recipe.id == meal.recipe_id)
        recipe_result = await db.execute(recipe_query)
        recipe = recipe_result.scalar_one_or_none()

    return await build_meal_response(meal, recipe)


@router.delete("/{plan_id}/meals/{meal_id}")
async def delete_meal(
    plan_id: UUID,
    meal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a meal from a plan."""
    query = (
        select(Meal)
        .join(MealPlan)
        .where(
            Meal.id == meal_id,
            Meal.meal_plan_id == plan_id,
            MealPlan.user_id == current_user.id
        )
    )
    result = await db.execute(query)
    meal = result.scalar_one_or_none()

    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    await db.delete(meal)
    await db.commit()

    return {"success": True, "message": "Meal deleted"}


@router.post("/{plan_id}/meals/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_meals(
    plan_id: UUID,
    data: BulkMealActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple meals from a plan."""
    query = (
        select(Meal)
        .join(MealPlan)
        .where(
            Meal.id.in_(data.meal_ids),
            Meal.meal_plan_id == plan_id,
            MealPlan.user_id == current_user.id
        )
    )
    result = await db.execute(query)
    meals = result.scalars().all()

    count = len(meals)
    for meal in meals:
        await db.delete(meal)

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=count,
        message=f"Deleted {count} meals",
    )


# ============ Bulk Meal Plan Actions ============

@router.post("/bulk-archive", response_model=BulkActionResponse)
async def bulk_archive_meal_plans(
    data: BulkMealPlanActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive multiple meal plans."""
    query = select(MealPlan).where(
        MealPlan.id.in_(data.ids),
        MealPlan.user_id == current_user.id
    )
    result = await db.execute(query)
    plans = result.scalars().all()

    for plan in plans:
        plan.is_archived = True

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(plans),
        message=f"Archived {len(plans)} meal plans",
    )


@router.post("/bulk-unarchive", response_model=BulkActionResponse)
async def bulk_unarchive_meal_plans(
    data: BulkMealPlanActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unarchive multiple meal plans."""
    query = select(MealPlan).where(
        MealPlan.id.in_(data.ids),
        MealPlan.user_id == current_user.id
    )
    result = await db.execute(query)
    plans = result.scalars().all()

    for plan in plans:
        plan.is_archived = False

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(plans),
        message=f"Unarchived {len(plans)} meal plans",
    )


@router.post("/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_meal_plans(
    data: BulkMealPlanActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple meal plans."""
    query = select(MealPlan).where(
        MealPlan.id.in_(data.ids),
        MealPlan.user_id == current_user.id
    )
    result = await db.execute(query)
    plans = result.scalars().all()

    count = len(plans)
    for plan in plans:
        await db.delete(plan)

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=count,
        message=f"Deleted {count} meal plans",
    )


# ============ Shopping List Generation ============

@router.post("/generate-shopping-list", response_model=GenerateShoppingListResponse)
async def generate_shopping_list(
    data: GenerateShoppingListRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a shopping list from a meal plan's recipes."""
    # Get meal plan with meals and recipes
    query = (
        select(MealPlan)
        .where(MealPlan.id == data.meal_plan_id, MealPlan.user_id == current_user.id)
        .options(
            selectinload(MealPlan.meals)
            .selectinload(Meal.recipe)
            .selectinload(Recipe.ingredients)
        )
    )
    result = await db.execute(query)
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    # Collect all ingredients from recipes
    exclude_recipe_ids = set(data.exclude_recipe_ids or [])
    ingredients_map = {}  # {ingredient_name: {quantity, unit}}

    for meal in plan.meals:
        if not meal.recipe or meal.recipe.id in exclude_recipe_ids:
            continue

        scale_factor = (meal.servings or plan.servings) / meal.recipe.servings

        for ing in meal.recipe.ingredients:
            key = f"{ing.ingredient_name.lower()}|{ing.unit or ''}"
            if key in ingredients_map:
                # Add quantities
                if ing.quantity and ingredients_map[key]["quantity"]:
                    ingredients_map[key]["quantity"] += float(ing.quantity) * scale_factor
            else:
                ingredients_map[key] = {
                    "name": ing.ingredient_name,
                    "quantity": float(ing.quantity) * scale_factor if ing.quantity else None,
                    "unit": ing.unit,
                    "category": ing.category,
                }

    # Create or get shopping list
    if data.shopping_list_id:
        list_query = select(ShoppingList).where(
            ShoppingList.id == data.shopping_list_id,
            ShoppingList.user_id == current_user.id
        )
        list_result = await db.execute(list_query)
        shopping_list = list_result.scalar_one_or_none()
        if not shopping_list:
            raise HTTPException(status_code=404, detail="Shopping list not found")
    else:
        list_name = data.shopping_list_name or f"Shopping for {plan.name}"
        shopping_list = ShoppingList(
            user_id=current_user.id,
            name=list_name,
            meal_plan_id=plan.id,
        )
        db.add(shopping_list)
        await db.flush()

    # Add items to shopping list
    items_added = 0
    for ing_data in ingredients_map.values():
        item = ShoppingListItem(
            shopping_list_id=shopping_list.id,
            ingredient_name=ing_data["name"],
            quantity=ing_data["quantity"],
            unit=ing_data["unit"],
            category=ing_data["category"],
        )
        db.add(item)
        items_added += 1

    await db.commit()

    return GenerateShoppingListResponse(
        shopping_list_id=shopping_list.id,
        items_added=items_added,
        success=True,
        message=f"Added {items_added} items to shopping list",
    )


# ============ Import/Parse ============

@router.post("/parse-text", response_model=ParseMealPlanResponse)
async def parse_meal_plan_text(
    data: ParseMealPlanTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse free-form text into a meal plan."""
    try:
        # Default start date to next Monday
        if data.start_date:
            start_date = data.start_date
        else:
            today = date.today()
            days_until_monday = (7 - today.weekday()) % 7
            if days_until_monday == 0:
                days_until_monday = 7
            start_date = today + timedelta(days=days_until_monday)

        parsed_result = await ai_service.parse_meal_plan_text(
            text=data.text,
            start_date=start_date,
            default_servings=data.default_servings,
            db=db,
            user_id=current_user.id,
        )

        return parsed_result
    except Exception as e:
        print(f"[Meal Plan Parse] Error: {e}")
        return ParseMealPlanResponse(
            name="",
            date_start=date.today(),
            date_end=date.today(),
            meals=[],
            success=False,
            message=str(e),
        )


@router.post("/parse-voice", response_model=ParseMealPlanResponse)
async def parse_meal_plan_voice(
    audio: UploadFile = File(...),
    language: str = Form("auto"),
    start_date: Optional[date] = Form(None),
    default_servings: int = Form(2),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transcribe voice recording and parse as meal plan."""
    try:
        audio_content = await audio.read()

        # Default start date
        if not start_date:
            today = date.today()
            days_until_monday = (7 - today.weekday()) % 7
            if days_until_monday == 0:
                days_until_monday = 7
            start_date = today + timedelta(days=days_until_monday)

        parsed_result = await ai_service.parse_meal_plan_voice(
            audio_content=audio_content,
            filename=audio.filename or "recording.webm",
            language=language,
            start_date=start_date,
            default_servings=default_servings,
            db=db,
            user_id=current_user.id,
        )

        return parsed_result
    except Exception as e:
        print(f"[Meal Plan Voice Parse] Error: {e}")
        return ParseMealPlanResponse(
            name="",
            date_start=date.today(),
            date_end=date.today(),
            meals=[],
            success=False,
            message=str(e),
        )


@router.post("/parse-image", response_model=ParseMealPlanResponse)
async def parse_meal_plan_image(
    image: UploadFile = File(...),
    start_date: Optional[date] = Form(None),
    default_servings: int = Form(2),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse meal plan from image (handwritten plan, screenshot)."""
    try:
        image_content = await image.read()

        # Default start date
        if not start_date:
            today = date.today()
            days_until_monday = (7 - today.weekday()) % 7
            if days_until_monday == 0:
                days_until_monday = 7
            start_date = today + timedelta(days=days_until_monday)

        parsed_result = await ai_service.parse_meal_plan_image(
            image_content=image_content,
            filename=image.filename or "image.jpg",
            start_date=start_date,
            default_servings=default_servings,
            db=db,
            user_id=current_user.id,
        )

        return parsed_result
    except Exception as e:
        print(f"[Meal Plan Image Parse] Error: {e}")
        return ParseMealPlanResponse(
            name="",
            date_start=date.today(),
            date_end=date.today(),
            meals=[],
            success=False,
            message=str(e),
        )
