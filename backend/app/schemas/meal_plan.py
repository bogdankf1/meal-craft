"""Meal Plan Schemas"""

from datetime import datetime, date
from typing import Optional, List
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


class GenerateShoppingListResponse(BaseModel):
    """Response from shopping list generation."""
    shopping_list_id: UUID
    items_added: int
    success: bool
    message: Optional[str] = None


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
