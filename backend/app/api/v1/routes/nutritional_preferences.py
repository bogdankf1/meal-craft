"""Nutritional Preferences API routes - Manage diet types and preferences per profile."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.profile import Profile
from app.models.nutritional_preference import NutritionalPreference
from app.schemas.nutritional_preference import (
    NutritionalPreferenceCreate,
    NutritionalPreferenceUpdate,
    NutritionalPreferenceResponse,
    ProfilePreferencesResponse,
    AllPreferencesResponse,
    DIET_TYPE_RESTRICTIVENESS,
)

router = APIRouter()


@router.get("/profile/{profile_id}", response_model=NutritionalPreferenceResponse)
async def get_nutritional_preference(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get nutritional preferences for a specific profile."""
    # Verify profile belongs to user
    profile_result = await db.execute(
        select(Profile).where(
            and_(
                Profile.id == profile_id,
                Profile.user_id == current_user.id
            )
        )
    )
    profile = profile_result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Get preferences
    pref_result = await db.execute(
        select(NutritionalPreference).where(NutritionalPreference.profile_id == profile_id)
    )
    preference = pref_result.scalar_one_or_none()

    if not preference:
        # Return default preferences if none exist
        # Auto-create default preferences
        preference = NutritionalPreference(
            profile_id=profile_id,
            diet_type="omnivore",
            goals=[],
            preferences=[],
        )
        db.add(preference)
        await db.commit()
        await db.refresh(preference)

    return NutritionalPreferenceResponse.model_validate(preference)


@router.get("/all", response_model=AllPreferencesResponse)
async def get_all_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all nutritional preferences grouped by profile, with combined values for AI suggestions."""
    # Get all profiles with their preferences
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.nutritional_preference))
        .where(
            and_(
                Profile.user_id == current_user.id,
                Profile.is_archived == False
            )
        )
        .order_by(Profile.name)
    )
    profiles = result.scalars().all()

    profile_responses = []
    all_diet_types = []
    all_goals = set()
    all_preferences = set()

    for profile in profiles:
        pref = profile.nutritional_preference
        diet_type = pref.diet_type if pref else "omnivore"
        goals = pref.goals if pref else []
        preferences = pref.preferences if pref else []

        all_diet_types.append(diet_type)
        all_goals.update(goals)
        all_preferences.update(preferences)

        profile_responses.append(ProfilePreferencesResponse(
            profile_id=profile.id,
            profile_name=profile.name,
            profile_color=profile.color,
            diet_type=diet_type,
            goals=goals,
            preferences=preferences,
        ))

    # Determine most restrictive diet type for combined view
    combined_diet_type = "omnivore"
    for diet in DIET_TYPE_RESTRICTIVENESS:
        if diet in all_diet_types:
            combined_diet_type = diet
            break

    return AllPreferencesResponse(
        profiles=profile_responses,
        combined_diet_type=combined_diet_type,
        combined_goals=sorted(all_goals),
        combined_preferences=sorted(all_preferences),
    )


@router.post("/profile/{profile_id}", response_model=NutritionalPreferenceResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_nutritional_preference(
    profile_id: UUID,
    request: NutritionalPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update nutritional preferences for a profile."""
    # Verify profile belongs to user
    profile_result = await db.execute(
        select(Profile).where(
            and_(
                Profile.id == profile_id,
                Profile.user_id == current_user.id
            )
        )
    )
    profile = profile_result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Check if preferences already exist
    pref_result = await db.execute(
        select(NutritionalPreference).where(NutritionalPreference.profile_id == profile_id)
    )
    preference = pref_result.scalar_one_or_none()

    if preference:
        # Update existing
        update_data = request.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "goals" and value is not None:
                setattr(preference, field, [g.value if hasattr(g, 'value') else g for g in value])
            elif field == "preferences" and value is not None:
                setattr(preference, field, [p.value if hasattr(p, 'value') else p for p in value])
            elif field == "diet_type" and value is not None:
                setattr(preference, field, value.value if hasattr(value, 'value') else value)
            elif value is not None:
                setattr(preference, field, value)
    else:
        # Create new
        preference = NutritionalPreference(
            profile_id=profile_id,
            diet_type=request.diet_type.value if request.diet_type else "omnivore",
            goals=[g.value if hasattr(g, 'value') else g for g in (request.goals or [])],
            preferences=[p.value if hasattr(p, 'value') else p for p in (request.preferences or [])],
        )
        db.add(preference)

    await db.commit()
    await db.refresh(preference)

    return NutritionalPreferenceResponse.model_validate(preference)


@router.put("/profile/{profile_id}", response_model=NutritionalPreferenceResponse)
async def update_nutritional_preference(
    profile_id: UUID,
    request: NutritionalPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update nutritional preferences for a profile."""
    return await create_or_update_nutritional_preference(profile_id, request, db, current_user)


@router.delete("/profile/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_nutritional_preference(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete nutritional preferences for a profile (resets to defaults)."""
    # Verify profile belongs to user
    profile_result = await db.execute(
        select(Profile).where(
            and_(
                Profile.id == profile_id,
                Profile.user_id == current_user.id
            )
        )
    )
    profile = profile_result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Delete preferences
    pref_result = await db.execute(
        select(NutritionalPreference).where(NutritionalPreference.profile_id == profile_id)
    )
    preference = pref_result.scalar_one_or_none()

    if preference:
        await db.delete(preference)
        await db.commit()
