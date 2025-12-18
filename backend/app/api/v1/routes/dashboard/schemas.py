"""
Dashboard API schemas.
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID


# ==================== Stats Cards ====================

class MealPlanStats(BaseModel):
    """Meal planning statistics."""
    meals_planned_this_week: int
    total_meal_slots: int  # 21 = 7 days * 3 meals
    meals_planned_last_week: int
    active_meal_plans: int


class PantryStats(BaseModel):
    """Pantry inventory statistics."""
    total_items: int
    expiring_soon: int  # within 7 days
    expired: int
    low_stock: int  # below minimum quantity


class RecipeStats(BaseModel):
    """Recipe collection statistics."""
    total_recipes: int
    favorites: int
    recipes_this_month: int
    most_cooked_count: int


class BudgetStats(BaseModel):
    """Grocery budget statistics."""
    spent_this_month: float
    spent_last_month: float
    average_monthly: float
    currency: str


class NutritionStats(BaseModel):
    """Nutrition goal statistics."""
    calories_today: int
    calories_goal: int
    protein_today: int
    protein_goal: int
    carbs_today: int
    carbs_goal: int
    fat_today: int
    fat_goal: int
    goal_adherence_percent: int  # How many days this week met goals


# ==================== Upcoming Meals ====================

class UpcomingMeal(BaseModel):
    """A scheduled meal in the upcoming days."""
    id: UUID
    date: date
    meal_type: str  # breakfast, lunch, dinner, snack
    recipe_id: Optional[UUID] = None
    recipe_name: Optional[str] = None
    custom_meal_name: Optional[str] = None
    is_leftover: bool = False


# ==================== Expiring Items ====================

class ExpiringItem(BaseModel):
    """An item that is expiring soon."""
    id: UUID
    name: str
    expiry_date: date
    days_until_expiry: int
    quantity: Optional[float] = None
    unit: Optional[str] = None
    location: Optional[str] = None  # pantry, fridge, freezer
    source: str  # "pantry" or "grocery"


# ==================== Recent Activity ====================

class ActivityItem(BaseModel):
    """A recent activity item."""
    id: str
    type: str  # recipe_added, meal_planned, grocery_added, nutrition_logged, skill_practiced, etc.
    title: str
    description: Optional[str] = None
    timestamp: datetime
    icon: str  # Icon name for frontend
    link: Optional[str] = None  # Optional link to the item


# ==================== Quick Stats ====================

class QuickStat(BaseModel):
    """A quick stat for display."""
    label: str
    value: str
    trend: Optional[str] = None  # "up", "down", "neutral"
    trend_value: Optional[str] = None


# ==================== Waste Analytics ====================

class WasteStats(BaseModel):
    """Food waste statistics."""
    wasted_this_month: int
    wasted_last_month: int
    waste_rate_percent: float  # % of items wasted
    top_waste_reason: Optional[str] = None
    estimated_cost_wasted: float


# ==================== Skills Progress ====================

class SkillProgress(BaseModel):
    """A skill being learned."""
    id: UUID
    name: str
    category: str
    proficiency: str  # beginner, intermediate, advanced, mastered
    progress_percent: int
    times_practiced: int


class LearningPathProgress(BaseModel):
    """Learning path progress."""
    id: UUID
    name: str
    skills_completed: int
    total_skills: int
    progress_percent: int


# ==================== Seasonal Produce ====================

class SeasonalItem(BaseModel):
    """A seasonal produce item."""
    id: UUID
    name: str
    category: str
    is_peak: bool  # True if in peak season
    nutrition_highlight: Optional[str] = None


# ==================== Equipment Alerts ====================

class EquipmentAlert(BaseModel):
    """Kitchen equipment maintenance alert."""
    id: UUID
    name: str
    category: str
    maintenance_type: str  # "due", "overdue"
    days_overdue: Optional[int] = None
    last_maintenance: Optional[date] = None


# ==================== Main Dashboard Response ====================

class DashboardResponse(BaseModel):
    """Complete dashboard data response."""
    # Stats cards
    meal_plan_stats: MealPlanStats
    pantry_stats: PantryStats
    recipe_stats: RecipeStats
    budget_stats: BudgetStats
    nutrition_stats: Optional[NutritionStats] = None

    # Upcoming meals
    upcoming_meals: List[UpcomingMeal]

    # Expiring items
    expiring_items: List[ExpiringItem]

    # Recent activity
    recent_activity: List[ActivityItem]

    # Waste analytics
    waste_stats: WasteStats

    # Skills progress
    skills_in_progress: List[SkillProgress]
    learning_paths: List[LearningPathProgress]

    # Seasonal produce
    seasonal_items: List[SeasonalItem]

    # Equipment alerts
    equipment_alerts: List[EquipmentAlert]

    # Quick actions count (for badges)
    pending_shopping_lists: int
    unread_support_messages: int
