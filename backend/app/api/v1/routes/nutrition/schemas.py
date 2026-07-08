"""Nutrition request/response schemas.

The nutrition Pydantic models are defined centrally in ``app.schemas.nutrition``.
This module re-exports them so the nutrition package follows the same
router / service / schemas layout as the other feature packages, while keeping
a single source of truth.
"""
from app.schemas.nutrition import (
    # Goal schemas
    NutritionGoalCreate,
    NutritionGoalUpdate,
    NutritionGoalResponse,
    # Log schemas
    NutritionLogCreate,
    NutritionLogUpdate,
    NutritionLogResponse,
    NutritionLogListResponse,
    # Health metric schemas
    HealthMetricCreate,
    HealthMetricUpdate,
    HealthMetricResponse,
    HealthMetricListResponse,
    # Aggregation schemas
    NutritionEntry,
    NutritionSource,
    DailyNutritionSummary,
    DailyNutritionWithGoals,
    WeeklyNutritionSummary,
    NutritionAnalytics,
    # Calculation schemas
    CalculateRecipeNutritionRequest,
    CalculateFoodNutritionRequest,
    NutritionEstimate,
    GoalType,
)

__all__ = [
    "NutritionGoalCreate",
    "NutritionGoalUpdate",
    "NutritionGoalResponse",
    "NutritionLogCreate",
    "NutritionLogUpdate",
    "NutritionLogResponse",
    "NutritionLogListResponse",
    "HealthMetricCreate",
    "HealthMetricUpdate",
    "HealthMetricResponse",
    "HealthMetricListResponse",
    "NutritionEntry",
    "NutritionSource",
    "DailyNutritionSummary",
    "DailyNutritionWithGoals",
    "WeeklyNutritionSummary",
    "NutritionAnalytics",
    "CalculateRecipeNutritionRequest",
    "CalculateFoodNutritionRequest",
    "NutritionEstimate",
    "GoalType",
]
