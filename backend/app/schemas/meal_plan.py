"""Meal Plan Schemas"""

from datetime import datetime, date
from typing import Optional, List, Union
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


class MealType(str, Enum):
    """Meal type enum."""
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


# ============ Meal Schemas ============

class MealCreate(BaseModel):
    """Schema for creating a meal."""
    date: date
    meal_type: MealType
    recipe_id: Optional[UUID] = None
    custom_name: Optional[str] = Field(None, max_length=255)  # For non-recipe meals
    servings: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None
    is_leftover: bool = False
    leftover_from_meal_id: Optional[UUID] = None


class MealUpdate(BaseModel):
    """Schema for updating a meal."""
    date: Optional[date] = None
    meal_type: Optional[MealType] = None
    recipe_id: Optional[UUID] = None
    custom_name: Optional[str] = Field(None, max_length=255)
    servings: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None
    is_leftover: Optional[bool] = None
    leftover_from_meal_id: Optional[UUID] = None


class MealResponse(BaseModel):
    """Schema for meal response."""
    id: UUID
    meal_plan_id: UUID
    date: date
    meal_type: str
    recipe_id: Optional[UUID] = None
    custom_name: Optional[str] = None
    servings: Optional[int] = None
    notes: Optional[str] = None
    is_leftover: bool = False
    leftover_from_meal_id: Optional[UUID] = None
    created_at: datetime
    # Include recipe details when available
    recipe_name: Optional[str] = None
    recipe_image_url: Optional[str] = None
    recipe_prep_time: Optional[int] = None
    recipe_cook_time: Optional[int] = None

    class Config:
        from_attributes = True


# ============ Meal Plan Schemas ============

class MealPlanCreate(BaseModel):
    """Schema for creating a meal plan."""
    name: str = Field(..., min_length=1, max_length=255)
    date_start: date
    date_end: date
    servings: int = Field(default=2, ge=1)
    is_template: bool = False
    profile_id: Optional[UUID] = None  # Nullable = shared/all members


class MealPlanUpdate(BaseModel):
    """Schema for updating a meal plan."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    date_start: Optional[date] = None
    date_end: Optional[date] = None
    servings: Optional[int] = Field(None, ge=1)
    is_template: Optional[bool] = None
    is_archived: Optional[bool] = None
    profile_id: Optional[UUID] = None  # Nullable = shared/all members


class MealPlanResponse(BaseModel):
    """Schema for meal plan response."""
    id: UUID
    user_id: UUID
    profile_id: Optional[UUID] = None
    name: str
    date_start: date
    date_end: date
    servings: int = 2
    is_template: bool = False
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    # Computed
    meal_count: int = 0

    class Config:
        from_attributes = True


class MealPlanWithMeals(BaseModel):
    """Schema for meal plan with all meals."""
    id: UUID
    user_id: UUID
    profile_id: Optional[UUID] = None
    name: str
    date_start: date
    date_end: date
    servings: int = 2
    is_template: bool = False
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    meals: List[MealResponse] = []

    class Config:
        from_attributes = True


class MealPlanListItem(BaseModel):
    """Schema for meal plan list item."""
    id: UUID
    profile_id: Optional[UUID] = None
    name: str
    date_start: date
    date_end: date
    servings: int = 2
    is_template: bool = False
    is_archived: bool = False
    created_at: datetime
    meal_count: int = 0

    class Config:
        from_attributes = True


class MealPlanListResponse(BaseModel):
    """Schema for paginated meal plan list response."""
    items: List[MealPlanListItem]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ Filter Schemas ============

class MealPlanFilters(BaseModel):
    """Schema for meal plan filters."""
    search: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    is_template: Optional[bool] = None
    is_archived: Optional[bool] = None
    page: int = 1
    per_page: int = 20
    sort_by: str = "date_start"
    sort_order: str = "desc"


# ============ Bulk Actions ============

class MealBulkCreate(BaseModel):
    """Schema for bulk creating meals."""
    meals: List[MealCreate] = Field(..., min_length=1)


class RepeatMealPlanRequest(BaseModel):
    """Request to repeat/copy a meal plan to new dates."""
    source_meal_plan_id: UUID
    new_start_date: date
    new_name: Optional[str] = None  # Will default to "Copy of {original_name}"


class BulkMealActionRequest(BaseModel):
    """Request for bulk meal operations."""
    meal_ids: List[UUID] = Field(..., min_length=1)


class BulkMealPlanActionRequest(BaseModel):
    """Request for bulk meal plan operations."""
    ids: List[UUID] = Field(..., min_length=1)


class BulkActionResponse(BaseModel):
    """Response for bulk operations."""
    success: bool
    affected_count: int
    message: str


# ============ Analytics Schemas ============

class MealsByType(BaseModel):
    """Meals breakdown by type."""
    meal_type: str
    count: int


class MealsByRecipe(BaseModel):
    """Most planned recipes."""
    recipe_id: UUID
    recipe_name: str
    count: int
    category: Optional[str] = None


class DailyNutrition(BaseModel):
    """Daily nutrition summary."""
    date: date
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None


class WeeklyOverview(BaseModel):
    """Weekly meal plan overview."""
    week_start: date
    week_end: date
    total_meals: int
    meals_with_recipes: int
    unique_recipes: int
    nutrition_summary: Optional[DailyNutrition] = None


class MealPlanAnalytics(BaseModel):
    """Meal plan analytics data."""
    total_meal_plans: int
    total_meals: int
    total_archived: int
    by_meal_type: List[MealsByType]
    most_planned_recipes: List[MealsByRecipe]
    current_week: Optional[WeeklyOverview] = None
    avg_meals_per_plan: float = 0
    recipe_variety_score: float = 0  # Percentage of unique recipes


class MonthlyMealPlanData(BaseModel):
    """Monthly meal planning statistics."""
    month: str
    month_label: str
    plans_created: int
    meals_planned: int
    unique_recipes: int


class MealPlanHistory(BaseModel):
    """Meal plan history data."""
    period_months: int
    total_plans: int
    total_meals: int
    monthly_data: List[MonthlyMealPlanData]


# ============ Shopping List Integration ============

class GenerateShoppingListRequest(BaseModel):
    """Request to generate shopping list from meal plan."""
    meal_plan_id: UUID
    shopping_list_id: Optional[UUID] = None  # Create new if not provided
    shopping_list_name: Optional[str] = None  # Name for new list
    exclude_recipe_ids: Optional[List[UUID]] = None  # Recipes to skip
    check_pantry: bool = True  # Check pantry stock and subtract available items
    include_low_stock: bool = False  # Include low-stock pantry items in list


class ShoppingListItemPreview(BaseModel):
    """Preview of a shopping list item with pantry info."""
    ingredient_name: str
    total_needed: float
    unit: Optional[str] = None
    category: Optional[str] = None
    in_pantry: float = 0  # How much already available in pantry
    to_buy: float = 0  # How much to add to list
    pantry_item_id: Optional[UUID] = None
    pantry_item_name: Optional[str] = None


class GenerateShoppingListResponse(BaseModel):
    """Response from shopping list generation."""
    shopping_list_id: UUID
    items_added: int
    items_skipped: int = 0  # Items already in pantry (not added)
    items_reduced: int = 0  # Items with reduced quantity due to pantry stock
    total_ingredients: int = 0
    success: bool
    message: Optional[str] = None


class ShoppingListPreviewResponse(BaseModel):
    """Preview of what shopping list would look like before creating."""
    meal_plan_id: UUID
    meal_plan_name: str
    items: List[ShoppingListItemPreview]
    total_items: int
    items_from_pantry: int  # Ingredients already in pantry
    items_to_buy: int  # Ingredients that need to be purchased
    low_stock_items: List[ShoppingListItemPreview] = []  # Pantry items below minimum


# ============ Parse Schemas (Import) ============

class ParseMealPlanTextRequest(BaseModel):
    """Request to parse text for a meal plan."""
    text: str = Field(..., min_length=1)
    start_date: Optional[date] = None  # Defaults to next Monday
    default_servings: int = Field(default=2, ge=1)


class ParsedMealPlanMeal(BaseModel):
    """Parsed meal from text."""
    date: date
    meal_type: MealType
    recipe_name: Optional[str] = None
    custom_name: Optional[str] = None
    notes: Optional[str] = None


class ParseMealPlanResponse(BaseModel):
    """Response from meal plan parsing."""
    name: str
    date_start: date
    date_end: date
    meals: List[ParsedMealPlanMeal]
    success: bool
    message: Optional[str] = None


# ============ Combined Week Plans (All Members View) ============

class ProfileInfo(BaseModel):
    """Basic profile info for combined view."""
    id: UUID
    name: str
    color: Optional[str] = "#3B82F6"

    class Config:
        from_attributes = True


class MealWithProfile(MealResponse):
    """Meal response with profile information."""
    profile_id: Optional[UUID] = None
    profile_name: Optional[str] = None
    profile_color: Optional[str] = None


class CombinedWeekPlan(BaseModel):
    """Combined view of all meal plans for a week."""
    date_start: date
    date_end: date
    meals: List[MealWithProfile] = []
    profiles: List[ProfileInfo] = []
    plan_count: int = 0


# ============ Cook/Availability Schemas ============

class MarkMealCookedRequest(BaseModel):
    """Request to mark a meal as cooked."""
    deduct_from_pantry: bool = True
    servings: Optional[int] = None  # Override meal servings if needed
    notes: Optional[str] = None


class IngredientDeductionSummary(BaseModel):
    """Summary of a single ingredient deduction."""
    ingredient_name: str
    needed_quantity: Optional[float] = None
    needed_unit: Optional[str] = None
    deducted_quantity: float = 0
    missing_quantity: float = 0
    pantry_item_name: Optional[str] = None
    fully_satisfied: bool = False


class MarkMealCookedResponse(BaseModel):
    """Response after marking a meal as cooked."""
    success: bool
    meal_id: UUID
    recipe_id: Optional[UUID] = None
    recipe_name: Optional[str] = None
    servings: int
    pantry_deducted: bool
    deductions: List[IngredientDeductionSummary] = []
    total_ingredients: int = 0
    fully_satisfied: int = 0
    partially_satisfied: int = 0
    not_found: int = 0
    message: Optional[str] = None
    cooking_history_id: Optional[UUID] = None


class MealIngredientAvailability(BaseModel):
    """Availability info for a single ingredient."""
    ingredient_name: str
    needed_quantity: Optional[float] = None
    needed_unit: Optional[str] = None
    available_quantity: Optional[float] = None
    pantry_item_name: Optional[str] = None
    is_available: bool = False
    is_fully_available: bool = False
    missing_quantity: Optional[float] = None


class MealAvailabilityResponse(BaseModel):
    """Response for meal availability check."""
    meal_id: UUID
    meal_plan_id: UUID
    recipe_id: Optional[UUID] = None
    recipe_name: Optional[str] = None
    custom_name: Optional[str] = None
    servings: int
    can_make: bool
    available_servings: int = 0
    total_ingredients: int = 0
    available_count: int = 0
    missing_count: int = 0
    ingredients: List[MealIngredientAvailability] = []


# ============ Simple Meal Creation (Calendar-Centric) ============

class SimpleMealCreate(BaseModel):
    """Schema for creating a meal without specifying a plan ID.

    The plan will be auto-created if it doesn't exist for the week.
    """
    date: date
    meal_type: MealType
    profile_id: Optional[UUID] = None  # None = shared meal
    recipe_id: Optional[UUID] = None
    custom_name: Optional[str] = Field(None, max_length=255)
    servings: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None
    is_leftover: bool = False


class SimpleMealUpdate(BaseModel):
    """Schema for updating a meal via the simple endpoint.

    All fields are optional for partial updates.
    """
    meal_date: Union[date, None] = Field(default=None, alias="date")
    meal_type: Union[MealType, None] = None
    recipe_id: Union[UUID, None] = None
    custom_name: Union[str, None] = Field(default=None, max_length=255)
    servings: Union[int, None] = Field(default=None, ge=1)
    notes: Union[str, None] = None
    is_leftover: Union[bool, None] = None

    model_config = {"populate_by_name": True}


class SimpleMealResponse(MealResponse):
    """Meal response with profile information for simple endpoints."""
    profile_id: Optional[UUID] = None
    profile_name: Optional[str] = None
    profile_color: Optional[str] = None


class WeekMealsResponse(BaseModel):
    """Response for get week meals endpoint."""
    date_start: date  # Monday
    date_end: date    # Sunday
    meals: List[MealWithProfile] = []
    profiles: List[ProfileInfo] = []  # All profiles that have meals this week
