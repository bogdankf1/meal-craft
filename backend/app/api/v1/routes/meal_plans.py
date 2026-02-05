"""Meal Plan API Routes"""

import math
from datetime import datetime, date, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy import select, func, desc, asc, or_
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
    ShoppingListPreviewResponse,
    ShoppingListItemPreview,
    ParseMealPlanTextRequest,
    ParseMealPlanResponse,
    ParsedMealPlanMeal,
    CombinedWeekPlan,
    MealWithProfile,
    ProfileInfo,
    MarkMealCookedRequest,
    MarkMealCookedResponse,
    IngredientDeductionSummary,
    MealAvailabilityResponse,
    MealIngredientAvailability,
    SimpleMealCreate,
    SimpleMealUpdate,
    SimpleMealResponse,
    WeekMealsResponse,
)
from app.models.profile import Profile
from app.models.recipe import CookingHistory
from app.models.pantry import PantryItem
from app.services.ai_service import ai_service
from app.services.pantry_service import PantryService

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
    # When a specific profile is selected, show plans for that profile
    # Legacy plans (profile_id = null) are shown only for the user's first profile
    if profile_id:
        # Check if this is the user's first (primary) profile
        first_profile_query = select(Profile.id).where(
            Profile.user_id == current_user.id,
            Profile.is_archived == False
        ).order_by(Profile.created_at).limit(1)
        first_profile_result = await db.execute(first_profile_query)
        first_profile_id = first_profile_result.scalar_one_or_none()

        if first_profile_id and profile_id == first_profile_id:
            # Primary profile: include legacy plans (profile_id = null)
            query = query.where(
                or_(MealPlan.profile_id == profile_id, MealPlan.profile_id.is_(None))
            )
        else:
            # Non-primary profile: only show plans explicitly for this profile
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
    # Legacy plans (profile_id = null) are shown only for the user's first profile
    if profile_id:
        # Check if this is the user's first (primary) profile
        first_profile_query = select(Profile.id).where(
            Profile.user_id == current_user.id,
            Profile.is_archived == False
        ).order_by(Profile.created_at).limit(1)
        first_profile_result = await db.execute(first_profile_query)
        first_profile_id = first_profile_result.scalar_one_or_none()

        if first_profile_id and profile_id == first_profile_id:
            # Primary profile: include legacy plans (profile_id = null)
            conditions.append(
                or_(MealPlan.profile_id == profile_id, MealPlan.profile_id.is_(None))
            )
        else:
            # Non-primary profile: only show plans explicitly for this profile
            conditions.append(MealPlan.profile_id == profile_id)

    query = (
        select(MealPlan)
        .where(*conditions)
        .options(selectinload(MealPlan.meals).selectinload(Meal.recipe))
        .order_by(
            MealPlan.profile_id.is_(None),  # Non-NULL profile_id first
            desc(MealPlan.created_at)
        )
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
    target_date: Optional[date] = Query(None, description="Target date to find the week for"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get combined meal plans for all profiles for a specific week."""
    reference_date = target_date if target_date else date.today()
    monday, sunday = get_week_bounds(reference_date)

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


# ============ Calendar-Centric Endpoints (Simple Meal CRUD) ============

@router.get("/week", response_model=WeekMealsResponse)
async def get_week_meals(
    target_date: Optional[date] = Query(None, description="Any date within the target week (defaults to today)"),
    profile_id: Optional[UUID] = Query(None, description="Filter by profile. None = all members (shared + all profiles)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all meals for a week, regardless of which plan they belong to.

    - If profile_id is None: Returns shared meals (profile_id=null) + all profile meals
    - If profile_id is set: Returns shared meals + meals for that specific profile
    """
    reference_date = target_date if target_date else date.today()
    monday, sunday = get_week_bounds(reference_date)

    # Get all meal plans for the week
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

    # Get all profiles for reference
    profiles_query = select(Profile).where(
        Profile.user_id == current_user.id,
        Profile.is_archived == False
    )
    profiles_result = await db.execute(profiles_query)
    profiles = profiles_result.scalars().all()
    profiles_map = {p.id: p for p in profiles}

    # Collect meals based on profile_id filter
    all_meals: List[MealWithProfile] = []
    seen_profile_ids = set()

    for plan in plans:
        # If profile_id filter is set, only include meals from:
        # - Plans with matching profile_id
        # - Plans with profile_id = null (shared meals)
        if profile_id is not None:
            if plan.profile_id is not None and plan.profile_id != profile_id:
                continue

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

    # Build profile info list
    profile_infos = [
        ProfileInfo(id=p.id, name=p.name, color=p.color)
        for p in profiles
        if p.id in seen_profile_ids
    ]

    return WeekMealsResponse(
        date_start=monday,
        date_end=sunday,
        meals=all_meals,
        profiles=profile_infos,
    )


@router.post("/meals", response_model=SimpleMealResponse)
async def create_meal_simple(
    data: SimpleMealCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a meal for a specific date.

    Auto-creates a MealPlan for the week if one doesn't exist.
    - If profile_id is None: Creates shared meal (in a shared plan)
    - If profile_id is set: Creates meal for that profile (in profile's plan)
    """
    # Calculate week bounds from the meal date
    monday, sunday = get_week_bounds(data.date)

    # Verify profile if provided
    profile = None
    if data.profile_id:
        profile_query = select(Profile).where(
            Profile.id == data.profile_id,
            Profile.user_id == current_user.id,
            Profile.is_archived == False,
        )
        profile_result = await db.execute(profile_query)
        profile = profile_result.scalar_one_or_none()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

    # Find existing MealPlan for user + profile_id + week
    plan_query = select(MealPlan).where(
        MealPlan.user_id == current_user.id,
        MealPlan.date_start == monday,
        MealPlan.date_end == sunday,
        MealPlan.is_archived == False,
        MealPlan.is_template == False,
    )

    # Match profile_id (including null for shared plans)
    if data.profile_id:
        plan_query = plan_query.where(MealPlan.profile_id == data.profile_id)
    else:
        plan_query = plan_query.where(MealPlan.profile_id.is_(None))

    plan_result = await db.execute(plan_query)
    plan = plan_result.scalar_one_or_none()

    # If no plan exists, create one
    if not plan:
        plan_name = f"Week of {monday.strftime('%b %d')}"
        if profile:
            plan_name = f"{profile.name} - {plan_name}"

        plan = MealPlan(
            user_id=current_user.id,
            profile_id=data.profile_id,
            name=plan_name,
            date_start=monday,
            date_end=sunday,
            servings=data.servings or 2,
        )
        db.add(plan)
        await db.flush()

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

    # Create the meal
    meal = Meal(
        meal_plan_id=plan.id,
        date=data.date,
        meal_type=data.meal_type.value,
        recipe_id=data.recipe_id,
        custom_name=data.custom_name,
        servings=data.servings or plan.servings,
        notes=data.notes,
        is_leftover=data.is_leftover,
    )
    db.add(meal)
    await db.commit()
    await db.refresh(meal)

    return SimpleMealResponse(
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
        profile_id=data.profile_id,
        profile_name=profile.name if profile else None,
        profile_color=profile.color if profile else None,
    )


@router.put("/meals/{meal_id}", response_model=SimpleMealResponse)
async def update_meal_simple(
    meal_id: UUID,
    data: SimpleMealUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a meal directly by its ID (without needing plan ID)."""
    # Find meal and verify ownership
    query = (
        select(Meal)
        .join(MealPlan)
        .where(
            Meal.id == meal_id,
            MealPlan.user_id == current_user.id
        )
        .options(selectinload(Meal.meal_plan).selectinload(MealPlan.profile))
    )
    result = await db.execute(query)
    meal = result.scalar_one_or_none()

    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    # Get recipe if updating
    recipe = None
    update_data = data.model_dump(exclude_unset=True, by_alias=True)

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

    plan = meal.meal_plan
    profile = plan.profile if plan else None

    return SimpleMealResponse(
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
        profile_id=plan.profile_id if plan else None,
        profile_name=profile.name if profile else None,
        profile_color=profile.color if profile else None,
    )


@router.delete("/meals/{meal_id}")
async def delete_meal_simple(
    meal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a meal directly by its ID (without needing plan ID)."""
    # Find meal and verify ownership
    query = (
        select(Meal)
        .join(MealPlan)
        .where(
            Meal.id == meal_id,
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
    """Generate a shopping list from a meal plan's recipes.

    When check_pantry is True (default), subtracts available pantry stock
    from needed quantities so you only buy what you actually need.
    """
    from app.utils.ingredient_matcher import (
        find_pantry_match,
        calculate_available_quantity,
    )

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

    # Get pantry items if checking pantry
    pantry_items = []
    if data.check_pantry:
        pantry_query = select(PantryItem).where(
            PantryItem.user_id == current_user.id,
            PantryItem.is_archived == False,
            PantryItem.is_wasted == False,
        )
        pantry_result = await db.execute(pantry_query)
        pantry_items = list(pantry_result.scalars().all())

    # Collect all ingredients from recipes
    exclude_recipe_ids = set(data.exclude_recipe_ids or [])
    ingredients_map = {}  # {key: {name, quantity, unit, category}}

    for meal in plan.meals:
        if not meal.recipe or meal.recipe.id in exclude_recipe_ids:
            continue

        scale_factor = (meal.servings or plan.servings) / (meal.recipe.servings or 1)

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

    # Add items to shopping list (checking pantry if enabled)
    items_added = 0
    items_skipped = 0
    items_reduced = 0
    total_ingredients = len(ingredients_map)

    for ing_data in ingredients_map.values():
        needed_qty = ing_data["quantity"]
        to_buy_qty = needed_qty

        # Check pantry stock
        if data.check_pantry and pantry_items and needed_qty:
            pantry_match = find_pantry_match(ing_data["name"], pantry_items)
            if pantry_match:
                available = calculate_available_quantity(pantry_match, ing_data["unit"])
                if available is not None and available > 0:
                    if available >= needed_qty:
                        # Have enough in pantry, skip this item
                        items_skipped += 1
                        continue
                    else:
                        # Reduce quantity by what's available
                        to_buy_qty = needed_qty - available
                        items_reduced += 1

        item = ShoppingListItem(
            shopping_list_id=shopping_list.id,
            ingredient_name=ing_data["name"],
            quantity=to_buy_qty,
            unit=ing_data["unit"],
            category=ing_data["category"],
        )
        db.add(item)
        items_added += 1

    # Optionally add low-stock pantry items
    if data.include_low_stock and pantry_items:
        for pantry_item in pantry_items:
            if (pantry_item.minimum_quantity and
                pantry_item.quantity is not None and
                float(pantry_item.quantity) < float(pantry_item.minimum_quantity)):
                # Add low stock item to shopping list
                item = ShoppingListItem(
                    shopping_list_id=shopping_list.id,
                    ingredient_name=pantry_item.item_name,
                    quantity=float(pantry_item.minimum_quantity) - float(pantry_item.quantity),
                    unit=pantry_item.unit,
                    category=pantry_item.category,
                )
                db.add(item)
                items_added += 1

    await db.commit()

    message_parts = [f"Added {items_added} items to shopping list"]
    if items_skipped > 0:
        message_parts.append(f"{items_skipped} already in pantry")
    if items_reduced > 0:
        message_parts.append(f"{items_reduced} reduced by pantry stock")

    return GenerateShoppingListResponse(
        shopping_list_id=shopping_list.id,
        items_added=items_added,
        items_skipped=items_skipped,
        items_reduced=items_reduced,
        total_ingredients=total_ingredients,
        success=True,
        message=", ".join(message_parts),
    )


@router.post("/{plan_id}/shopping-list-preview", response_model=ShoppingListPreviewResponse)
async def preview_shopping_list(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview what shopping list would look like before creating.

    Shows which items are already in pantry vs need to be purchased.
    """
    from app.utils.ingredient_matcher import (
        find_pantry_match,
        calculate_available_quantity,
    )

    # Get meal plan with meals and recipes
    query = (
        select(MealPlan)
        .where(MealPlan.id == plan_id, MealPlan.user_id == current_user.id)
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

    # Get pantry items
    pantry_query = select(PantryItem).where(
        PantryItem.user_id == current_user.id,
        PantryItem.is_archived == False,
        PantryItem.is_wasted == False,
    )
    pantry_result = await db.execute(pantry_query)
    pantry_items = list(pantry_result.scalars().all())

    # Collect all ingredients from recipes
    ingredients_map = {}

    for meal in plan.meals:
        if not meal.recipe:
            continue

        scale_factor = (meal.servings or plan.servings) / (meal.recipe.servings or 1)

        for ing in meal.recipe.ingredients:
            key = f"{ing.ingredient_name.lower()}|{ing.unit or ''}"
            if key in ingredients_map:
                if ing.quantity and ingredients_map[key]["quantity"]:
                    ingredients_map[key]["quantity"] += float(ing.quantity) * scale_factor
            else:
                ingredients_map[key] = {
                    "name": ing.ingredient_name,
                    "quantity": float(ing.quantity) * scale_factor if ing.quantity else 0,
                    "unit": ing.unit,
                    "category": ing.category,
                }

    # Build preview with pantry info
    items = []
    items_from_pantry = 0
    items_to_buy = 0

    for key, ing_data in ingredients_map.items():
        needed_qty = ing_data["quantity"] or 0
        in_pantry = 0.0
        pantry_item_id = None
        pantry_item_name = None

        if pantry_items:
            pantry_match = find_pantry_match(ing_data["name"], pantry_items)
            if pantry_match:
                available = calculate_available_quantity(pantry_match, ing_data["unit"])
                if available is not None:
                    in_pantry = min(available, needed_qty)
                    pantry_item_id = pantry_match.id
                    pantry_item_name = pantry_match.item_name

        to_buy = max(0, needed_qty - in_pantry)

        if to_buy > 0:
            items_to_buy += 1
        else:
            items_from_pantry += 1

        items.append(ShoppingListItemPreview(
            ingredient_name=ing_data["name"],
            total_needed=needed_qty,
            unit=ing_data["unit"],
            category=ing_data["category"],
            in_pantry=in_pantry,
            to_buy=to_buy,
            pantry_item_id=pantry_item_id,
            pantry_item_name=pantry_item_name,
        ))

    # Get low stock pantry items
    low_stock_items = []
    for pantry_item in pantry_items:
        if (pantry_item.minimum_quantity and
            pantry_item.quantity is not None and
            float(pantry_item.quantity) < float(pantry_item.minimum_quantity)):
            low_stock_items.append(ShoppingListItemPreview(
                ingredient_name=pantry_item.item_name,
                total_needed=float(pantry_item.minimum_quantity),
                unit=pantry_item.unit,
                category=pantry_item.category,
                in_pantry=float(pantry_item.quantity),
                to_buy=float(pantry_item.minimum_quantity) - float(pantry_item.quantity),
                pantry_item_id=pantry_item.id,
                pantry_item_name=pantry_item.item_name,
            ))

    return ShoppingListPreviewResponse(
        meal_plan_id=plan_id,
        meal_plan_name=plan.name,
        items=items,
        total_items=len(items),
        items_from_pantry=items_from_pantry,
        items_to_buy=items_to_buy,
        low_stock_items=low_stock_items,
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


# ============ Cooking & Pantry Integration ============

@router.post("/{plan_id}/meals/{meal_id}/cook", response_model=MarkMealCookedResponse)
async def mark_meal_cooked(
    plan_id: UUID,
    meal_id: UUID,
    data: MarkMealCookedRequest = MarkMealCookedRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a meal as cooked and optionally deduct ingredients from pantry.

    This endpoint:
    1. Records the meal in cooking history
    2. Optionally deducts recipe ingredients from pantry
    3. Updates recipe's times_cooked counter
    """
    # Verify meal exists and belongs to user's plan
    query = (
        select(Meal)
        .join(MealPlan)
        .where(
            Meal.id == meal_id,
            Meal.meal_plan_id == plan_id,
            MealPlan.user_id == current_user.id
        )
        .options(selectinload(Meal.recipe).selectinload(Recipe.ingredients))
    )
    result = await db.execute(query)
    meal = result.scalar_one_or_none()

    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    servings = data.servings or meal.servings or (meal.recipe.servings if meal.recipe else 2)

    # If no recipe, just acknowledge cooking
    if not meal.recipe_id or not meal.recipe:
        return MarkMealCookedResponse(
            success=True,
            meal_id=meal_id,
            servings=servings,
            pantry_deducted=False,
            message="Meal marked as cooked (no recipe to deduct from pantry)",
        )

    recipe = meal.recipe

    # Create cooking history record
    cooking_history = CookingHistory(
        user_id=current_user.id,
        recipe_id=recipe.id,
        cooked_at=datetime.utcnow(),
        servings_made=servings,
        notes=data.notes,
    )
    db.add(cooking_history)

    # Update recipe times_cooked
    recipe.times_cooked = (recipe.times_cooked or 0) + 1

    # Deduct from pantry if requested
    deductions = []
    fully_satisfied = 0
    partially_satisfied = 0
    not_found = 0

    if data.deduct_from_pantry and recipe.ingredients:
        pantry_service = PantryService(db)
        deduction_result = await pantry_service.deduct_recipe_ingredients(
            user_id=current_user.id,
            recipe_id=recipe.id,
            servings=servings,
            meal_id=meal_id,
        )

        fully_satisfied = deduction_result.fully_satisfied
        partially_satisfied = deduction_result.partially_satisfied
        not_found = deduction_result.not_found

        for d in deduction_result.deductions:
            deductions.append(IngredientDeductionSummary(
                ingredient_name=d.ingredient_name,
                needed_quantity=d.needed_quantity,
                needed_unit=d.needed_unit,
                deducted_quantity=d.deducted_quantity,
                missing_quantity=d.missing_quantity,
                pantry_item_name=d.pantry_item_name,
                fully_satisfied=d.fully_satisfied,
            ))

    await db.commit()
    await db.refresh(cooking_history)

    return MarkMealCookedResponse(
        success=True,
        meal_id=meal_id,
        recipe_id=recipe.id,
        recipe_name=recipe.name,
        servings=servings,
        pantry_deducted=data.deduct_from_pantry,
        deductions=deductions,
        total_ingredients=len(recipe.ingredients),
        fully_satisfied=fully_satisfied,
        partially_satisfied=partially_satisfied,
        not_found=not_found,
        message=f"Meal cooked! {fully_satisfied + partially_satisfied} of {len(recipe.ingredients)} ingredients deducted from pantry." if data.deduct_from_pantry else "Meal marked as cooked.",
        cooking_history_id=cooking_history.id,
    )


@router.get("/{plan_id}/meals/{meal_id}/availability", response_model=MealAvailabilityResponse)
async def check_meal_availability(
    plan_id: UUID,
    meal_id: UUID,
    servings: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if pantry has enough ingredients to make this meal.

    Returns availability status for each ingredient, including:
    - Whether the ingredient is available in pantry
    - How much is needed vs available
    - Maximum servings possible with current pantry
    """
    # Verify meal exists and belongs to user's plan
    query = (
        select(Meal)
        .join(MealPlan)
        .where(
            Meal.id == meal_id,
            Meal.meal_plan_id == plan_id,
            MealPlan.user_id == current_user.id
        )
        .options(selectinload(Meal.recipe).selectinload(Recipe.ingredients))
    )
    result = await db.execute(query)
    meal = result.scalar_one_or_none()

    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    # If no recipe, always "available"
    if not meal.recipe_id or not meal.recipe:
        return MealAvailabilityResponse(
            meal_id=meal_id,
            meal_plan_id=plan_id,
            custom_name=meal.custom_name,
            servings=servings or meal.servings or 1,
            can_make=True,
            available_servings=servings or meal.servings or 1,
        )

    recipe = meal.recipe
    check_servings = servings or meal.servings or recipe.servings or 2

    pantry_service = PantryService(db)
    availability = await pantry_service.check_recipe_availability(
        user_id=current_user.id,
        recipe_id=recipe.id,
        servings=check_servings,
    )

    ingredients = []
    for ing in availability.ingredients:
        ingredients.append(MealIngredientAvailability(
            ingredient_name=ing.ingredient_name,
            needed_quantity=ing.needed_quantity,
            needed_unit=ing.needed_unit,
            available_quantity=ing.available_quantity,
            pantry_item_name=ing.pantry_item_name,
            is_available=ing.is_available,
            is_fully_available=ing.is_fully_available,
            missing_quantity=ing.missing_quantity,
        ))

    return MealAvailabilityResponse(
        meal_id=meal_id,
        meal_plan_id=plan_id,
        recipe_id=recipe.id,
        recipe_name=recipe.name,
        servings=check_servings,
        can_make=availability.can_make,
        available_servings=availability.available_servings,
        total_ingredients=availability.total_ingredients,
        available_count=availability.available_count,
        missing_count=availability.missing_count,
        ingredients=ingredients,
    )
