"""Nutritional Preference schemas for API requests and responses."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


class DietType(str, Enum):
    """Diet type options."""
    OMNIVORE = "omnivore"
    VEGETARIAN = "vegetarian"
    VEGAN = "vegan"
    PESCATARIAN = "pescatarian"
    KETO = "keto"
    PALEO = "paleo"
    MEDITERRANEAN = "mediterranean"
    FLEXITARIAN = "flexitarian"


class NutritionalGoal(str, Enum):
    """Nutritional goal options."""
    HIGH_PROTEIN = "high_protein"
    LOW_CARB = "low_carb"
    LOW_FAT = "low_fat"
    LOW_SODIUM = "low_sodium"
    HIGH_FIBER = "high_fiber"
    LOW_SUGAR = "low_sugar"
    CALORIE_CONSCIOUS = "calorie_conscious"


class MealPreference(str, Enum):
    """Meal preference options."""
    WHOLE_FOODS = "whole_foods"
    AVOID_PROCESSED = "avoid_processed"
    BUDGET_FRIENDLY = "budget_friendly"
    QUICK_MEALS = "quick_meals"
    MEAL_PREP = "meal_prep"
    KID_FRIENDLY = "kid_friendly"


class NutritionalPreferenceBase(BaseModel):
    """Base nutritional preference schema."""
    diet_type: DietType = DietType.OMNIVORE
    goals: List[NutritionalGoal] = []
    preferences: List[MealPreference] = []


class NutritionalPreferenceCreate(NutritionalPreferenceBase):
    """Schema for creating nutritional preferences."""
    profile_id: UUID


class NutritionalPreferenceUpdate(BaseModel):
    """Schema for updating nutritional preferences."""
    diet_type: Optional[DietType] = None
    goals: Optional[List[NutritionalGoal]] = None
    preferences: Optional[List[MealPreference]] = None


class NutritionalPreferenceResponse(NutritionalPreferenceBase):
    """Schema for nutritional preference response."""
    id: UUID
    profile_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProfilePreferencesResponse(BaseModel):
    """Schema for profile with its nutritional preferences."""
    profile_id: UUID
    profile_name: str
    profile_color: Optional[str] = "#3B82F6"
    diet_type: str
    goals: List[str] = []
    preferences: List[str] = []


class AllPreferencesResponse(BaseModel):
    """Schema for all preferences across all profiles (for AI suggestions)."""
    profiles: List[ProfilePreferencesResponse]
    # For "All Members" - use most restrictive diet type
    combined_diet_type: str = "omnivore"
    # Combined unique goals from all profiles
    combined_goals: List[str] = []
    # Combined unique preferences from all profiles
    combined_preferences: List[str] = []


# Diet type restrictiveness order (most restrictive first)
DIET_TYPE_RESTRICTIVENESS = [
    "vegan",
    "vegetarian",
    "pescatarian",
    "keto",
    "paleo",
    "mediterranean",
    "flexitarian",
    "omnivore",
]
