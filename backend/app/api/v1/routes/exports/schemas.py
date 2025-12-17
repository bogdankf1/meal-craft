"""
Export schemas for MealCraft
"""
from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime


ExportFormat = Literal["csv"]
EntryType = Literal[
    "groceries",
    "pantry",
    "shopping_lists",
    "recipes",
    "meal_plans",
    "kitchen_equipment",
    "restaurants",
    "restaurant_meals",
    "nutrition_logs",
    "nutrition_goals",
    "health_metrics",
    "user_skills",
    "cooking_history",
    "recipe_collections"
]


class ExportRequest(BaseModel):
    """Request model for data export"""
    entry_type: EntryType = Field(..., description="Type of data to export")
    format: ExportFormat = Field(default="csv", description="Export format")
    start_date: Optional[datetime] = Field(None, description="Start date for filtering (beginning of month)")
    end_date: Optional[datetime] = Field(None, description="End date for filtering (end of month)")

    class Config:
        json_schema_extra = {
            "example": {
                "entry_type": "groceries",
                "format": "csv",
                "start_date": "2024-12-01T00:00:00",
                "end_date": "2024-12-31T23:59:59"
            }
        }


class ExportResponse(BaseModel):
    """Response model for export status"""
    success: bool
    message: str
    filename: str
    row_count: int
