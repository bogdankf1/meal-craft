"""
Pydantic schemas for nutrition module endpoints.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal
from enum import Enum


class GoalType(str, Enum):
    """Goal type enum."""
    WEIGHT_LOSS = "weight_loss"
    MUSCLE_GAIN = "muscle_gain"
    MAINTENANCE = "maintenance"
    CUSTOM = "custom"


class MealType(str, Enum):
    """Meal type enum."""
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class NutritionSource(str, Enum):
    """Source of nutrition data."""
    MEAL_PLAN = "meal_plan"
    RESTAURANT = "restaurant"
    CUSTOM = "custom"


# ============ Nutrition Goal Schemas ============

class NutritionGoalBase(BaseModel):
    """Base nutrition goal schema."""
    daily_calories: Optional[int] = Field(None, ge=0)
    daily_protein_g: Optional[int] = Field(None, ge=0)
    daily_carbs_g: Optional[int] = Field(None, ge=0)
    daily_fat_g: Optional[int] = Field(None, ge=0)
    daily_fiber_g: Optional[int] = Field(None, ge=0)
    daily_sugar_g: Optional[int] = Field(None, ge=0)
    daily_sodium_mg: Optional[int] = Field(None, ge=0)
    goal_type: Optional[GoalType] = GoalType.MAINTENANCE


class NutritionGoalCreate(NutritionGoalBase):
    """Schema for creating a nutrition goal."""
    start_date: Optional[date] = None
    profile_id: Optional[UUID] = None  # Nullable = shared/all members


class NutritionGoalUpdate(BaseModel):
    """Schema for updating a nutrition goal."""
    daily_calories: Optional[int] = Field(None, ge=0)
    daily_protein_g: Optional[int] = Field(None, ge=0)
    daily_carbs_g: Optional[int] = Field(None, ge=0)
    daily_fat_g: Optional[int] = Field(None, ge=0)
    daily_fiber_g: Optional[int] = Field(None, ge=0)
    daily_sugar_g: Optional[int] = Field(None, ge=0)
    daily_sodium_mg: Optional[int] = Field(None, ge=0)
    goal_type: Optional[GoalType] = None
    is_active: Optional[bool] = None
    profile_id: Optional[UUID] = None  # Nullable = shared/all members


class NutritionGoalResponse(NutritionGoalBase):
    """Schema for nutrition goal response."""
    id: UUID
    user_id: UUID
    profile_id: Optional[UUID] = None
    start_date: Optional[date] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Nutrition Log (Custom Entry) Schemas ============

class NutritionLogBase(BaseModel):
    """Base nutrition log schema."""
    date: date
    meal_type: Optional[MealType] = None
    name: Optional[str] = Field(None, max_length=255)
    calories: Optional[int] = Field(None, ge=0)
    protein_g: Optional[float] = Field(None, ge=0)
    carbs_g: Optional[float] = Field(None, ge=0)
    fat_g: Optional[float] = Field(None, ge=0)
    fiber_g: Optional[float] = Field(None, ge=0)
    sugar_g: Optional[float] = Field(None, ge=0)
    sodium_mg: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class NutritionLogCreate(NutritionLogBase):
    """Schema for creating a nutrition log entry."""
    meal_id: Optional[UUID] = None
    restaurant_meal_id: Optional[UUID] = None
    manual_entry: bool = True
    profile_id: Optional[UUID] = None  # Nullable = shared/all members


class NutritionLogUpdate(BaseModel):
    """Schema for updating a nutrition log entry."""
    date: Optional[date] = None
    meal_type: Optional[MealType] = None
    name: Optional[str] = Field(None, max_length=255)
    calories: Optional[int] = Field(None, ge=0)
    protein_g: Optional[float] = Field(None, ge=0)
    carbs_g: Optional[float] = Field(None, ge=0)
    fat_g: Optional[float] = Field(None, ge=0)
    fiber_g: Optional[float] = Field(None, ge=0)
    sugar_g: Optional[float] = Field(None, ge=0)
    sodium_mg: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None
    is_archived: Optional[bool] = None


class NutritionLogResponse(NutritionLogBase):
    """Schema for nutrition log response."""
    id: UUID
    user_id: UUID
    profile_id: Optional[UUID] = None
    meal_id: Optional[UUID] = None
    restaurant_meal_id: Optional[UUID] = None
    manual_entry: bool = False
    is_archived: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class NutritionLogListResponse(BaseModel):
    """Paginated list of nutrition logs."""
    items: List[NutritionLogResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ Health Metric Schemas ============

class HealthMetricBase(BaseModel):
    """Base health metric schema."""
    date: date
    weight_kg: Optional[float] = Field(None, ge=0)
    body_fat_percent: Optional[float] = Field(None, ge=0, le=100)
    steps: Optional[int] = Field(None, ge=0)
    active_calories: Optional[int] = Field(None, ge=0)
    sleep_hours: Optional[float] = Field(None, ge=0, le=24)
    heart_rate_avg: Optional[int] = Field(None, ge=0)
    source: Optional[str] = "manual"


class HealthMetricCreate(HealthMetricBase):
    """Schema for creating a health metric entry."""
    pass


class HealthMetricUpdate(BaseModel):
    """Schema for updating a health metric entry."""
    weight_kg: Optional[float] = Field(None, ge=0)
    body_fat_percent: Optional[float] = Field(None, ge=0, le=100)
    steps: Optional[int] = Field(None, ge=0)
    active_calories: Optional[int] = Field(None, ge=0)
    sleep_hours: Optional[float] = Field(None, ge=0, le=24)
    heart_rate_avg: Optional[int] = Field(None, ge=0)


class HealthMetricResponse(HealthMetricBase):
    """Schema for health metric response."""
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class HealthMetricListResponse(BaseModel):
    """Paginated list of health metrics."""
    items: List[HealthMetricResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ Aggregated Nutrition Schemas ============

class NutritionEntry(BaseModel):
    """Single nutrition entry from any source."""
    id: UUID
    source: NutritionSource
    source_id: Optional[UUID] = None  # ID in source table
    name: str
    meal_type: Optional[str] = None
    date: date
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    sugar_g: Optional[float] = None
    sodium_mg: Optional[float] = None


class DailyNutritionSummary(BaseModel):
    """Summary of nutrition for a single day."""
    date: date
    total_calories: int = 0
    total_protein_g: float = 0
    total_carbs_g: float = 0
    total_fat_g: float = 0
    total_fiber_g: float = 0
    total_sugar_g: float = 0
    total_sodium_mg: float = 0
    meal_count: int = 0
    entries: List[NutritionEntry] = []


class DailyNutritionWithGoals(DailyNutritionSummary):
    """Daily nutrition with goal comparison."""
    goal: Optional[NutritionGoalResponse] = None
    calories_percent: Optional[float] = None
    protein_percent: Optional[float] = None
    carbs_percent: Optional[float] = None
    fat_percent: Optional[float] = None
    fiber_percent: Optional[float] = None
    sugar_percent: Optional[float] = None
    sodium_percent: Optional[float] = None


class WeeklyNutritionSummary(BaseModel):
    """Weekly nutrition summary."""
    start_date: date
    end_date: date
    days: List[DailyNutritionSummary]
    avg_daily_calories: float = 0
    avg_daily_protein_g: float = 0
    avg_daily_carbs_g: float = 0
    avg_daily_fat_g: float = 0
    avg_daily_fiber_g: float = 0
    total_meals: int = 0


class NutritionAnalytics(BaseModel):
    """Nutrition analytics and trends."""
    period_days: int
    start_date: date
    end_date: date
    avg_daily_calories: float = 0
    avg_daily_protein_g: float = 0
    avg_daily_carbs_g: float = 0
    avg_daily_fat_g: float = 0
    avg_daily_fiber_g: float = 0
    avg_daily_sugar_g: float = 0
    avg_daily_sodium_mg: float = 0
    goal_achievement_rate: Optional[float] = None  # % of days meeting calorie goal
    days_logged: int = 0
    total_meals: int = 0
    meals_from_plan: int = 0
    meals_from_restaurant: int = 0
    meals_custom: int = 0
    daily_data: List[DailyNutritionSummary] = []


# ============ Calculate Nutrition Request Schemas ============

class CalculateRecipeNutritionRequest(BaseModel):
    """Request to calculate recipe nutrition."""
    recipe_id: UUID


class CalculateFoodNutritionRequest(BaseModel):
    """Request to estimate nutrition from food description."""
    description: str = Field(..., min_length=1)


class NutritionEstimate(BaseModel):
    """Estimated nutrition values."""
    name: Optional[str] = None
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    sugar_g: Optional[float] = None
    sodium_mg: Optional[float] = None
