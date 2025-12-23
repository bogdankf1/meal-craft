"""Dietary Restriction schemas for API requests and responses."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


class RestrictionType(str, Enum):
    """Type of dietary restriction."""
    ALLERGY = "allergy"
    DISLIKE = "dislike"


class DietaryRestrictionBase(BaseModel):
    """Base dietary restriction schema."""
    ingredient_name: str = Field(..., min_length=1, max_length=100)
    restriction_type: RestrictionType
    notes: Optional[str] = Field(None, max_length=500)


class DietaryRestrictionCreate(DietaryRestrictionBase):
    """Schema for creating a dietary restriction."""
    profile_id: UUID


class DietaryRestrictionUpdate(BaseModel):
    """Schema for updating a dietary restriction."""
    ingredient_name: Optional[str] = Field(None, min_length=1, max_length=100)
    restriction_type: Optional[RestrictionType] = None
    notes: Optional[str] = Field(None, max_length=500)


class DietaryRestrictionResponse(DietaryRestrictionBase):
    """Schema for dietary restriction response."""
    id: UUID
    profile_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DietaryRestrictionListResponse(BaseModel):
    """Schema for list of dietary restrictions response."""
    restrictions: List[DietaryRestrictionResponse]
    total: int


class BulkDietaryRestrictionCreate(BaseModel):
    """Schema for bulk creating dietary restrictions."""
    profile_id: UUID
    restrictions: List[DietaryRestrictionBase]


class ProfileRestrictionsResponse(BaseModel):
    """Schema for profile with its restrictions."""
    profile_id: UUID
    profile_name: str
    profile_color: Optional[str] = "#3B82F6"
    allergies: List[str] = []
    dislikes: List[str] = []


class AllRestrictionsResponse(BaseModel):
    """Schema for all restrictions across all profiles (for AI suggestions)."""
    profiles: List[ProfileRestrictionsResponse]
    combined_allergies: List[str] = []  # All allergies from all profiles
    combined_dislikes: List[str] = []   # All dislikes from all profiles
    all_excluded: List[str] = []        # Combined list for AI prompt
