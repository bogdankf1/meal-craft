"""Profile API endpoints."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import (
    ProfileCreate,
    ProfileUpdate,
    ProfileResponse,
    ProfileListResponse,
)

router = APIRouter(prefix="/profiles", tags=["Profiles"])


@router.get("", response_model=ProfileListResponse)
async def get_profiles(
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all profiles for the current user."""
    query = select(Profile).where(Profile.user_id == current_user.id)

    if not include_archived:
        query = query.where(Profile.is_archived == False)

    query = query.order_by(Profile.is_default.desc(), Profile.name)

    result = await db.execute(query)
    profiles = result.scalars().all()

    return ProfileListResponse(profiles=profiles, total=len(profiles))


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    data: ProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new profile."""
    # Check if this is the first profile (make it default)
    count_query = select(func.count(Profile.id)).where(
        Profile.user_id == current_user.id,
        Profile.is_archived == False
    )
    count_result = await db.execute(count_query)
    count = count_result.scalar() or 0

    profile = Profile(
        user_id=current_user.id,
        name=data.name,
        color=data.color,
        avatar_url=data.avatar_url,
        is_default=(count == 0),  # First profile is default
        is_archived=False,
    )

    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    return profile


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific profile."""
    query = select(Profile).where(
        Profile.id == profile_id,
        Profile.user_id == current_user.id
    )
    result = await db.execute(query)
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    return profile


@router.patch("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: UUID,
    data: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a profile."""
    query = select(Profile).where(
        Profile.id == profile_id,
        Profile.user_id == current_user.id
    )
    result = await db.execute(query)
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # If setting this as default, unset other defaults
    if data.is_default is True:
        unset_query = select(Profile).where(
            Profile.user_id == current_user.id,
            Profile.id != profile_id,
            Profile.is_default == True
        )
        unset_result = await db.execute(unset_query)
        for other_profile in unset_result.scalars():
            other_profile.is_default = False

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)

    return profile


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete (archive) a profile."""
    query = select(Profile).where(
        Profile.id == profile_id,
        Profile.user_id == current_user.id
    )
    result = await db.execute(query)
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Cannot delete default profile if it's the only one
    if profile.is_default:
        count_query = select(func.count(Profile.id)).where(
            Profile.user_id == current_user.id,
            Profile.is_archived == False
        )
        count_result = await db.execute(count_query)
        count = count_result.scalar() or 0

        if count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the only profile"
            )

        # Set another profile as default
        other_query = select(Profile).where(
            Profile.user_id == current_user.id,
            Profile.id != profile_id,
            Profile.is_archived == False
        ).limit(1)
        other_result = await db.execute(other_query)
        other_profile = other_result.scalar_one_or_none()
        if other_profile:
            other_profile.is_default = True

    # Archive instead of delete
    profile.is_archived = True
    await db.commit()


@router.post("/seed-defaults", response_model=ProfileListResponse)
async def seed_default_profiles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Seed default profiles for the user (Bohdan and Marharyta)."""
    # Check if user already has profiles
    count_query = select(func.count(Profile.id)).where(
        Profile.user_id == current_user.id
    )
    count_result = await db.execute(count_query)
    count = count_result.scalar() or 0

    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has profiles"
        )

    # Create default profiles
    profiles = [
        Profile(
            user_id=current_user.id,
            name="Bohdan",
            color="#3B82F6",  # Blue
            is_default=True,
            is_archived=False,
        ),
        Profile(
            user_id=current_user.id,
            name="Marharyta",
            color="#EC4899",  # Pink
            is_default=False,
            is_archived=False,
        ),
    ]

    for profile in profiles:
        db.add(profile)

    await db.commit()

    # Refresh and return
    for profile in profiles:
        await db.refresh(profile)

    return ProfileListResponse(profiles=profiles, total=len(profiles))
