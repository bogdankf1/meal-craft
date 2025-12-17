"""
Pydantic schemas for Backup module.
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal
from uuid import UUID


# Module types that can be backed up (matching export types)
ModuleType = Literal[
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


class BackupCreate(BaseModel):
    """Schema for creating a new backup."""
    module_type: ModuleType = Field(..., description="Type of module to backup")


class BackupResponse(BaseModel):
    """Schema for backup response."""
    id: UUID
    user_id: UUID
    module_type: str
    created_at: datetime
    item_count: int = Field(..., description="Number of items in the backup")

    class Config:
        from_attributes = True


class BackupRestoreResponse(BaseModel):
    """Schema for backup restore response."""
    success: bool
    message: str
    restored_count: int = Field(..., description="Number of items restored")
