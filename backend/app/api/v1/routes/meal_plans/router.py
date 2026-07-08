"""Meal Plan API Routes.

Thin route handlers: validate the request (via the FastAPI signature) and
delegate to ``service``. Ownership lookups and pagination live in the service
layer via ``get_owned_or_404`` / ``paginate``.
"""

from datetime import date
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.api.v1.routes.meal_plans import service
from app.api.v1.routes.meal_plans.schemas import (
    MealCreate,
    MealUpdate,
    MealResponse,
    MealPlanCreate,
    MealPlanUpdate,
    MealPlanResponse,
    MealPlanWithMeals,
    MealPlanListResponse,
    MealBulkCreate,
    RepeatMealPlanRequest,
    BulkMealActionRequest,
    BulkMealPlanActionRequest,
    BulkActionResponse,
    MealPlanAnalytics,
    MealPlanHistory,
    GenerateShoppingListRequest,
    GenerateShoppingListResponse,
    ShoppingListPreviewResponse,
    ParseMealPlanTextRequest,
    ParseMealPlanResponse,
    CombinedWeekPlan,
    MarkMealCookedRequest,
    MarkMealCookedResponse,
    MealAvailabilityResponse,
    SimpleMealCreate,
    SimpleMealUpdate,
    SimpleMealResponse,
    WeekMealsResponse,
)

router = APIRouter(prefix="/meal-plans")


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
    return await service.get_meal_plans(
        db,
        current_user,
        search=search,
        date_from=date_from,
        date_to=date_to,
        is_template=is_template,
        is_archived=is_archived,
        profile_id=profile_id,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/current-week", response_model=Optional[MealPlanWithMeals])
async def get_current_week_plan(
    profile_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the meal plan for the current week (if exists)."""
    return await service.get_current_week_plan(db, current_user, profile_id=profile_id)


@router.get("/current-week/combined", response_model=CombinedWeekPlan)
async def get_combined_week_plans(
    target_date: Optional[date] = Query(None, description="Target date to find the week for"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get combined meal plans for all profiles for a specific week."""
    return await service.get_combined_week_plans(db, current_user, target_date=target_date)


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
    return await service.get_week_meals(db, current_user, target_date=target_date, profile_id=profile_id)


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
    return await service.create_meal_simple(db, current_user, data)


@router.put("/meals/{meal_id}", response_model=SimpleMealResponse)
async def update_meal_simple(
    meal_id: UUID,
    data: SimpleMealUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a meal directly by its ID (without needing plan ID)."""
    return await service.update_meal_simple(db, current_user, meal_id, data)


@router.delete("/meals/{meal_id}")
async def delete_meal_simple(
    meal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a meal directly by its ID (without needing plan ID)."""
    return await service.delete_meal_simple(db, current_user, meal_id)


# ============ Analytics (must be before /{plan_id} route) ============

@router.get("/analytics/overview", response_model=MealPlanAnalytics)
async def get_meal_plan_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get meal plan analytics overview."""
    return await service.get_meal_plan_analytics(db, current_user)


@router.get("/history", response_model=MealPlanHistory)
async def get_meal_plan_history(
    months: int = Query(3, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get meal plan history over time."""
    return await service.get_meal_plan_history(db, current_user, months=months)


# ============ Get Single Meal Plan ============

@router.get("/{plan_id}", response_model=MealPlanWithMeals)
async def get_meal_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single meal plan by ID with all meals."""
    return await service.get_meal_plan(db, current_user, plan_id)


@router.post("", response_model=MealPlanResponse)
async def create_meal_plan(
    data: MealPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new meal plan."""
    return await service.create_meal_plan(db, current_user, data)


@router.put("/{plan_id}", response_model=MealPlanResponse)
async def update_meal_plan(
    plan_id: UUID,
    data: MealPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a meal plan."""
    return await service.update_meal_plan(db, current_user, plan_id, data)


@router.delete("/{plan_id}")
async def delete_meal_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a meal plan and all its meals."""
    return await service.delete_meal_plan(db, current_user, plan_id)


# ============ Repeat/Copy Meal Plan ============

@router.post("/repeat", response_model=MealPlanWithMeals)
async def repeat_meal_plan(
    data: RepeatMealPlanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Copy a meal plan to new dates."""
    return await service.repeat_meal_plan(db, current_user, data)


# ============ Meal CRUD ============

@router.post("/{plan_id}/meals", response_model=MealResponse)
async def create_meal(
    plan_id: UUID,
    data: MealCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a meal to a meal plan."""
    return await service.create_meal(db, current_user, plan_id, data)


@router.post("/{plan_id}/meals/bulk", response_model=List[MealResponse])
async def bulk_create_meals(
    plan_id: UUID,
    data: MealBulkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add multiple meals to a meal plan."""
    return await service.bulk_create_meals(db, current_user, plan_id, data)


@router.put("/{plan_id}/meals/{meal_id}", response_model=MealResponse)
async def update_meal(
    plan_id: UUID,
    meal_id: UUID,
    data: MealUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a meal."""
    return await service.update_meal(db, current_user, plan_id, meal_id, data)


@router.delete("/{plan_id}/meals/{meal_id}")
async def delete_meal(
    plan_id: UUID,
    meal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a meal from a plan."""
    return await service.delete_meal(db, current_user, plan_id, meal_id)


@router.post("/{plan_id}/meals/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_meals(
    plan_id: UUID,
    data: BulkMealActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple meals from a plan."""
    return await service.bulk_delete_meals(db, current_user, plan_id, data)


# ============ Bulk Meal Plan Actions ============

@router.post("/bulk-archive", response_model=BulkActionResponse)
async def bulk_archive_meal_plans(
    data: BulkMealPlanActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive multiple meal plans."""
    return await service.bulk_archive_meal_plans(db, current_user, data)


@router.post("/bulk-unarchive", response_model=BulkActionResponse)
async def bulk_unarchive_meal_plans(
    data: BulkMealPlanActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unarchive multiple meal plans."""
    return await service.bulk_unarchive_meal_plans(db, current_user, data)


@router.post("/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_meal_plans(
    data: BulkMealPlanActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple meal plans."""
    return await service.bulk_delete_meal_plans(db, current_user, data)


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
    return await service.generate_shopping_list(db, current_user, data)


@router.post("/{plan_id}/shopping-list-preview", response_model=ShoppingListPreviewResponse)
async def preview_shopping_list(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview what shopping list would look like before creating.

    Shows which items are already in pantry vs need to be purchased.
    """
    return await service.preview_shopping_list(db, current_user, plan_id)


# ============ Import/Parse ============

@router.post("/parse-text", response_model=ParseMealPlanResponse)
async def parse_meal_plan_text(
    data: ParseMealPlanTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse free-form text into a meal plan."""
    return await service.parse_meal_plan_text(db, current_user, data)


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
    return await service.parse_meal_plan_voice(
        db,
        current_user,
        audio,
        language=language,
        start_date=start_date,
        default_servings=default_servings,
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
    return await service.parse_meal_plan_image(
        db,
        current_user,
        image,
        start_date=start_date,
        default_servings=default_servings,
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
    return await service.mark_meal_cooked(db, current_user, plan_id, meal_id, data)


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
    return await service.check_meal_availability(db, current_user, plan_id, meal_id, servings=servings)
