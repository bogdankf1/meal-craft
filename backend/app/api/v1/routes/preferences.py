"""
User preferences API endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import attributes
from pydantic import BaseModel
from typing import Optional, Dict, Literal

from app.core.database import get_db
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()


# Onboarding step status type
OnboardingStepStatus = Literal["pending", "skipped", "completed"]


# Onboarding step IDs
ONBOARDING_STEPS = [
    "household",
    "groceries",
    "pantry",
    "nutrition",
    "recipes",
    "meal_plan",
]


class OnboardingStepState(BaseModel):
    """State for a single onboarding step."""
    status: OnboardingStepStatus = "pending"


class OnboardingState(BaseModel):
    """Overall onboarding state."""
    is_dismissed: bool = False
    steps: Dict[str, OnboardingStepState] = {}

    class Config:
        from_attributes = True


class OnboardingStepUpdate(BaseModel):
    """Request body for updating a single step."""
    step_id: str
    status: OnboardingStepStatus


class OnboardingDismissUpdate(BaseModel):
    """Request body for dismissing onboarding."""
    is_dismissed: bool


class OnboardingStatusResponse(BaseModel):
    """Response with derived completion status for all steps."""
    steps: Dict[str, bool]  # step_id -> is_completed (based on actual data)


# Column visibility models for each module
class RecipesColumnVisibility(BaseModel):
    """Column visibility for recipes table."""
    name: bool = True
    category: bool = True
    cuisine_type: bool = True
    time: bool = True
    servings: bool = True
    difficulty: bool = True
    rating: bool = True
    times_cooked: bool = True
    created_at: bool = True


class GroceriesColumnVisibility(BaseModel):
    """Column visibility for groceries table."""
    item_name: bool = True
    category: bool = True
    quantity: bool = True
    purchase_date: bool = True
    expiry_date: bool = True
    cost: bool = True
    store: bool = True


class PantryColumnVisibility(BaseModel):
    """Column visibility for pantry table."""
    item_name: bool = True
    storage_location: bool = True
    category: bool = True
    quantity: bool = True
    expiry_date: bool = True
    created_at: bool = True


class MealPlansColumnVisibility(BaseModel):
    """Column visibility for meal plans table."""
    name: bool = True
    date_range: bool = True
    meals: bool = True
    servings: bool = True
    status: bool = True


class ShoppingListsColumnVisibility(BaseModel):
    """Column visibility for shopping lists table."""
    name: bool = True
    status: bool = True
    progress: bool = True
    estimated_cost: bool = True
    created_at: bool = True
    completed_at: bool = True


class RestaurantMealsColumnVisibility(BaseModel):
    """Column visibility for restaurant meals table."""
    restaurant: bool = True
    date: bool = True
    meal_type: bool = True
    order_type: bool = True
    items: bool = True
    rating: bool = True
    feeling: bool = True


class KitchenEquipmentColumnVisibility(BaseModel):
    """Column visibility for kitchen equipment table."""
    name: bool = True
    category: bool = True
    brand: bool = True
    condition: bool = True
    location: bool = True
    maintenance: bool = True
    created_at: bool = True


class ColumnVisibility(BaseModel):
    """Column visibility preferences for all modules."""
    recipes: RecipesColumnVisibility = RecipesColumnVisibility()
    groceries: GroceriesColumnVisibility = GroceriesColumnVisibility()
    pantry: PantryColumnVisibility = PantryColumnVisibility()
    mealPlans: MealPlansColumnVisibility = MealPlansColumnVisibility()
    shoppingLists: ShoppingListsColumnVisibility = ShoppingListsColumnVisibility()
    restaurantMeals: RestaurantMealsColumnVisibility = RestaurantMealsColumnVisibility()
    kitchenEquipment: KitchenEquipmentColumnVisibility = KitchenEquipmentColumnVisibility()


class UIVisibility(BaseModel):
    """UI visibility preferences."""
    showStatsCards: bool = True
    showSearchBar: bool = True
    showFilters: bool = True
    showDateRange: bool = True
    showViewSelector: bool = True
    showSorting: bool = True
    showPageTitle: bool = True
    showPageSubtitle: bool = True
    showInsights: bool = True
    showColumnSelector: bool = True  # Column visibility selector toggle
    # Common tabs
    showArchiveTab: bool = True
    showWasteTab: bool = True
    showAnalysisTab: bool = True
    showHistoryTab: bool = True
    # Module-specific tabs
    showMaintenanceTab: bool = True  # Kitchen Equipment
    showGoalsTab: bool = True  # Nutrition
    showSeasonalCalendarTab: bool = True  # Seasonality
    showLocalSpecialtiesTab: bool = True  # Seasonality
    showThisMonthTab: bool = True  # Seasonality
    showMySkillsTab: bool = True  # Learning
    showLibraryTab: bool = True  # Learning
    showLearningPathsTab: bool = True  # Learning
    showCollectionsTab: bool = True  # Recipes
    # Sidebar navigation - Planning
    showSidebarMealPlanner: bool = True
    showSidebarRecipes: bool = True
    showSidebarShoppingLists: bool = True
    # Sidebar navigation - Inventory
    showSidebarGroceries: bool = True
    showSidebarPantry: bool = True
    showSidebarKitchenEquipment: bool = True
    # Sidebar navigation - Tracking
    showSidebarRestaurants: bool = True
    showSidebarNutrition: bool = True
    # Sidebar navigation - Lifestyle
    showSidebarSeasonality: bool = True
    showSidebarLearning: bool = True
    # Sidebar navigation - Tools
    showSidebarExport: bool = True
    showSidebarBackups: bool = True
    showSidebarHelp: bool = True
    # Dashboard content
    showDashboardStats: bool = True
    showDashboardUpcomingMeals: bool = True
    showDashboardExpiringSoon: bool = True
    showDashboardRecentActivity: bool = True
    showDashboardQuickActions: bool = True
    showDashboardWasteAnalytics: bool = True
    showDashboardSkillsProgress: bool = True
    showDashboardSeasonalInsights: bool = True
    showDashboardNutrition: bool = True


class UIPreferencesResponse(BaseModel):
    """Response with UI preferences."""
    uiVisibility: UIVisibility
    columnVisibility: ColumnVisibility

    class Config:
        from_attributes = True


class UIPreferencesUpdate(BaseModel):
    """Request body for updating UI preferences."""
    uiVisibility: Optional[UIVisibility] = None
    columnVisibility: Optional[ColumnVisibility] = None


# Default UI visibility preferences
DEFAULT_UI_VISIBILITY = {
    "showStatsCards": True,
    "showSearchBar": True,
    "showFilters": True,
    "showDateRange": True,
    "showViewSelector": True,
    "showSorting": True,
    "showPageTitle": True,
    "showPageSubtitle": True,
    "showInsights": True,
    "showColumnSelector": True,
    # Common tabs
    "showArchiveTab": True,
    "showWasteTab": True,
    "showAnalysisTab": True,
    "showHistoryTab": True,
    # Module-specific tabs
    "showMaintenanceTab": True,
    "showGoalsTab": True,
    "showSeasonalCalendarTab": True,
    "showLocalSpecialtiesTab": True,
    "showThisMonthTab": True,
    "showMySkillsTab": True,
    "showLibraryTab": True,
    "showLearningPathsTab": True,
    "showCollectionsTab": True,
    # Sidebar navigation - Planning
    "showSidebarMealPlanner": True,
    "showSidebarRecipes": True,
    "showSidebarShoppingLists": True,
    # Sidebar navigation - Inventory
    "showSidebarGroceries": True,
    "showSidebarPantry": True,
    "showSidebarKitchenEquipment": True,
    # Sidebar navigation - Tracking
    "showSidebarRestaurants": True,
    "showSidebarNutrition": True,
    # Sidebar navigation - Lifestyle
    "showSidebarSeasonality": True,
    "showSidebarLearning": True,
    # Sidebar navigation - Tools
    "showSidebarExport": True,
    "showSidebarBackups": True,
    "showSidebarHelp": True,
    # Dashboard content
    "showDashboardStats": True,
    "showDashboardUpcomingMeals": True,
    "showDashboardExpiringSoon": True,
    "showDashboardRecentActivity": True,
    "showDashboardQuickActions": True,
    "showDashboardWasteAnalytics": True,
    "showDashboardSkillsProgress": True,
    "showDashboardSeasonalInsights": True,
    "showDashboardNutrition": True,
}

# Default column visibility preferences
DEFAULT_COLUMN_VISIBILITY = {
    "recipes": {
        "name": True,
        "category": True,
        "cuisine_type": True,
        "time": True,
        "servings": True,
        "difficulty": True,
        "rating": True,
        "times_cooked": True,
        "created_at": True,
    },
    "groceries": {
        "item_name": True,
        "category": True,
        "quantity": True,
        "purchase_date": True,
        "expiry_date": True,
        "cost": True,
        "store": True,
    },
    "pantry": {
        "item_name": True,
        "storage_location": True,
        "category": True,
        "quantity": True,
        "expiry_date": True,
        "created_at": True,
    },
    "mealPlans": {
        "name": True,
        "date_range": True,
        "meals": True,
        "servings": True,
        "status": True,
    },
    "shoppingLists": {
        "name": True,
        "status": True,
        "progress": True,
        "estimated_cost": True,
        "created_at": True,
        "completed_at": True,
    },
    "restaurantMeals": {
        "restaurant": True,
        "date": True,
        "meal_type": True,
        "order_type": True,
        "items": True,
        "rating": True,
        "feeling": True,
    },
    "kitchenEquipment": {
        "name": True,
        "category": True,
        "brand": True,
        "condition": True,
        "location": True,
        "maintenance": True,
        "created_at": True,
    },
}


@router.get("/ui", response_model=UIPreferencesResponse)
async def get_ui_preferences(
    current_user: User = Depends(get_current_user),
):
    """
    Get current user's UI preferences.
    """
    ui_prefs = current_user.ui_preferences or {}
    ui_visibility = ui_prefs.get("uiVisibility", DEFAULT_UI_VISIBILITY)
    column_visibility = ui_prefs.get("columnVisibility", DEFAULT_COLUMN_VISIBILITY)

    # Merge with defaults to ensure all fields are present
    merged_visibility = {**DEFAULT_UI_VISIBILITY, **ui_visibility}

    # Merge column visibility with defaults (deep merge per module)
    merged_column_visibility = {}
    for module, default_cols in DEFAULT_COLUMN_VISIBILITY.items():
        user_cols = column_visibility.get(module, {})
        merged_column_visibility[module] = {**default_cols, **user_cols}

    return UIPreferencesResponse(
        uiVisibility=UIVisibility(**merged_visibility),
        columnVisibility=ColumnVisibility(**merged_column_visibility)
    )


@router.put("/ui", response_model=UIPreferencesResponse)
async def update_ui_preferences(
    request: UIPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update current user's UI preferences.
    """
    # Get existing preferences or create new dict copy to ensure change detection
    existing_prefs = current_user.ui_preferences or {}
    ui_prefs = dict(existing_prefs)  # Create a new dict to ensure SQLAlchemy detects change

    # Update visibility if provided
    if request.uiVisibility:
        ui_prefs["uiVisibility"] = request.uiVisibility.model_dump()

    # Update column visibility if provided
    if request.columnVisibility:
        ui_prefs["columnVisibility"] = request.columnVisibility.model_dump()

    # Save to database - assign new dict and flag as modified for SQLAlchemy
    current_user.ui_preferences = ui_prefs
    attributes.flag_modified(current_user, "ui_preferences")
    await db.commit()
    await db.refresh(current_user)

    # Return merged with defaults
    ui_visibility = ui_prefs.get("uiVisibility", DEFAULT_UI_VISIBILITY)
    merged_visibility = {**DEFAULT_UI_VISIBILITY, **ui_visibility}

    # Merge column visibility with defaults
    column_visibility = ui_prefs.get("columnVisibility", DEFAULT_COLUMN_VISIBILITY)
    merged_column_visibility = {}
    for module, default_cols in DEFAULT_COLUMN_VISIBILITY.items():
        user_cols = column_visibility.get(module, {})
        merged_column_visibility[module] = {**default_cols, **user_cols}

    return UIPreferencesResponse(
        uiVisibility=UIVisibility(**merged_visibility),
        columnVisibility=ColumnVisibility(**merged_column_visibility)
    )


# Default onboarding state
DEFAULT_ONBOARDING_STATE = {
    "is_dismissed": False,
    "steps": {step: {"status": "pending"} for step in ONBOARDING_STEPS}
}


@router.get("/onboarding", response_model=OnboardingState)
async def get_onboarding_state(
    current_user: User = Depends(get_current_user),
):
    """
    Get current user's onboarding state.
    """
    ui_prefs = current_user.ui_preferences or {}
    onboarding = ui_prefs.get("onboarding", DEFAULT_ONBOARDING_STATE)

    # Ensure all steps exist with defaults
    steps = {}
    for step in ONBOARDING_STEPS:
        step_data = onboarding.get("steps", {}).get(step, {"status": "pending"})
        steps[step] = OnboardingStepState(**step_data)

    return OnboardingState(
        is_dismissed=onboarding.get("is_dismissed", False),
        steps=steps
    )


@router.put("/onboarding/step", response_model=OnboardingState)
async def update_onboarding_step(
    request: OnboardingStepUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a single onboarding step status.
    """
    if request.step_id not in ONBOARDING_STEPS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid step_id: {request.step_id}")

    # Get existing preferences
    existing_prefs = current_user.ui_preferences or {}
    ui_prefs = dict(existing_prefs)

    # Get or create onboarding state
    onboarding = ui_prefs.get("onboarding", dict(DEFAULT_ONBOARDING_STATE))
    onboarding = dict(onboarding)  # Ensure it's a new dict

    if "steps" not in onboarding:
        onboarding["steps"] = {step: {"status": "pending"} for step in ONBOARDING_STEPS}
    else:
        onboarding["steps"] = dict(onboarding["steps"])

    # Update the step
    onboarding["steps"][request.step_id] = {"status": request.status}

    # Save to database
    ui_prefs["onboarding"] = onboarding
    current_user.ui_preferences = ui_prefs
    attributes.flag_modified(current_user, "ui_preferences")
    await db.commit()
    await db.refresh(current_user)

    # Return updated state
    steps = {}
    for step in ONBOARDING_STEPS:
        step_data = onboarding.get("steps", {}).get(step, {"status": "pending"})
        steps[step] = OnboardingStepState(**step_data)

    return OnboardingState(
        is_dismissed=onboarding.get("is_dismissed", False),
        steps=steps
    )


@router.put("/onboarding/dismiss", response_model=OnboardingState)
async def dismiss_onboarding(
    request: OnboardingDismissUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dismiss or un-dismiss the onboarding flow.
    """
    # Get existing preferences
    existing_prefs = current_user.ui_preferences or {}
    ui_prefs = dict(existing_prefs)

    # Get or create onboarding state
    onboarding = ui_prefs.get("onboarding", dict(DEFAULT_ONBOARDING_STATE))
    onboarding = dict(onboarding)

    # Update dismissed state
    onboarding["is_dismissed"] = request.is_dismissed

    # Save to database
    ui_prefs["onboarding"] = onboarding
    current_user.ui_preferences = ui_prefs
    attributes.flag_modified(current_user, "ui_preferences")
    await db.commit()
    await db.refresh(current_user)

    # Return updated state
    steps = {}
    for step in ONBOARDING_STEPS:
        step_data = onboarding.get("steps", {}).get(step, {"status": "pending"})
        steps[step] = OnboardingStepState(**step_data)

    return OnboardingState(
        is_dismissed=onboarding.get("is_dismissed", False),
        steps=steps
    )


@router.get("/onboarding/status", response_model=OnboardingStatusResponse)
async def get_onboarding_derived_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get derived completion status for onboarding steps based on actual user data.
    This checks if each step would be considered "complete" based on actual data.
    """
    from app.services.onboarding_service import OnboardingService

    service = OnboardingService(db, current_user)
    status = await service.get_derived_status()

    return OnboardingStatusResponse(steps=status)
