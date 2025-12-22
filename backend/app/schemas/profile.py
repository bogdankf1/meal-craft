"""Profile schemas for API requests and responses."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProfileBase(BaseModel):
    """Base profile schema."""
    name: str = Field(..., min_length=1, max_length=100)
    color: Optional[str] = Field(default="#3B82F6", pattern=r"^#[0-9A-Fa-f]{6}$")
    avatar_url: Optional[str] = None


class ProfileCreate(ProfileBase):
    """Schema for creating a profile."""
    pass


class ProfileUpdate(BaseModel):
    """Schema for updating a profile."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    avatar_url: Optional[str] = None
    is_default: Optional[bool] = None


class ProfileResponse(ProfileBase):
    """Schema for profile response."""
    id: UUID
    user_id: UUID
    is_default: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProfileListResponse(BaseModel):
    """Schema for list of profiles response."""
    profiles: list[ProfileResponse]
    total: int
