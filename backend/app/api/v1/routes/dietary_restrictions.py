"""Dietary Restrictions API routes - Manage allergies and dislikes per profile."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.profile import Profile
from app.models.dietary_restriction import DietaryRestriction, RestrictionType
from app.schemas.dietary_restriction import (
    DietaryRestrictionCreate,
    DietaryRestrictionUpdate,
    DietaryRestrictionResponse,
    DietaryRestrictionListResponse,
    BulkDietaryRestrictionCreate,
    ProfileRestrictionsResponse,
    AllRestrictionsResponse,
)

router = APIRouter()


@router.get("", response_model=DietaryRestrictionListResponse)
async def list_dietary_restrictions(
    profile_id: Optional[UUID] = Query(None, description="Filter by profile ID"),
    restriction_type: Optional[str] = Query(None, description="Filter by type: allergy or dislike"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List dietary restrictions. Optionally filter by profile or type."""
    # Get user's profile IDs for authorization
    profiles_result = await db.execute(
        select(Profile.id).where(Profile.user_id == current_user.id)
    )
    user_profile_ids = [p for p in profiles_result.scalars().all()]

    if not user_profile_ids:
        return DietaryRestrictionListResponse(restrictions=[], total=0)

    # Build query
    query = select(DietaryRestriction).where(
        DietaryRestriction.profile_id.in_(user_profile_ids)
    )

    if profile_id:
        if profile_id not in user_profile_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Profile not found or access denied"
            )
        query = query.where(DietaryRestriction.profile_id == profile_id)

    if restriction_type:
        query = query.where(DietaryRestriction.restriction_type == restriction_type)

    query = query.order_by(DietaryRestriction.restriction_type, DietaryRestriction.ingredient_name)

    result = await db.execute(query)
    restrictions = result.scalars().all()

    return DietaryRestrictionListResponse(
        restrictions=[DietaryRestrictionResponse.model_validate(r) for r in restrictions],
        total=len(restrictions)
    )


@router.get("/all", response_model=AllRestrictionsResponse)
async def get_all_restrictions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all dietary restrictions grouped by profile, with combined lists for AI suggestions."""
    # Get all profiles with their restrictions
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.dietary_restrictions))
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
    all_allergies = set()
    all_dislikes = set()

    for profile in profiles:
        allergies = []
        dislikes = []

        for restriction in profile.dietary_restrictions:
            ingredient = restriction.ingredient_name.lower()
            if restriction.restriction_type == RestrictionType.ALLERGY.value:
                allergies.append(restriction.ingredient_name)
                all_allergies.add(ingredient)
            else:
                dislikes.append(restriction.ingredient_name)
                all_dislikes.add(ingredient)

        profile_responses.append(ProfileRestrictionsResponse(
            profile_id=profile.id,
            profile_name=profile.name,
            profile_color=profile.color,
            allergies=sorted(allergies),
            dislikes=sorted(dislikes),
        ))

    # Combined list for AI (allergies take priority)
    all_excluded = sorted(all_allergies | all_dislikes)

    return AllRestrictionsResponse(
        profiles=profile_responses,
        combined_allergies=sorted(all_allergies),
        combined_dislikes=sorted(all_dislikes),
        all_excluded=all_excluded,
    )


@router.post("", response_model=DietaryRestrictionResponse, status_code=status.HTTP_201_CREATED)
async def create_dietary_restriction(
    request: DietaryRestrictionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new dietary restriction for a profile."""
    # Verify profile belongs to user
    profile_result = await db.execute(
        select(Profile).where(
            and_(
                Profile.id == request.profile_id,
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

    # Check for duplicate
    existing = await db.execute(
        select(DietaryRestriction).where(
            and_(
                DietaryRestriction.profile_id == request.profile_id,
                DietaryRestriction.ingredient_name.ilike(request.ingredient_name)
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Restriction for '{request.ingredient_name}' already exists for this profile"
        )

    restriction = DietaryRestriction(
        profile_id=request.profile_id,
        ingredient_name=request.ingredient_name,
        restriction_type=request.restriction_type.value,
        notes=request.notes,
    )
    db.add(restriction)
    await db.commit()
    await db.refresh(restriction)

    return DietaryRestrictionResponse.model_validate(restriction)


@router.post("/bulk", response_model=DietaryRestrictionListResponse, status_code=status.HTTP_201_CREATED)
async def bulk_create_dietary_restrictions(
    request: BulkDietaryRestrictionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk create dietary restrictions for a profile."""
    # Verify profile belongs to user
    profile_result = await db.execute(
        select(Profile).where(
            and_(
                Profile.id == request.profile_id,
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

    # Get existing restrictions to avoid duplicates
    existing_result = await db.execute(
        select(DietaryRestriction.ingredient_name).where(
            DietaryRestriction.profile_id == request.profile_id
        )
    )
    existing_ingredients = {name.lower() for name in existing_result.scalars().all()}

    created = []
    for item in request.restrictions:
        if item.ingredient_name.lower() not in existing_ingredients:
            restriction = DietaryRestriction(
                profile_id=request.profile_id,
                ingredient_name=item.ingredient_name,
                restriction_type=item.restriction_type.value,
                notes=item.notes,
            )
            db.add(restriction)
            created.append(restriction)
            existing_ingredients.add(item.ingredient_name.lower())

    await db.commit()

    # Refresh all created restrictions
    for r in created:
        await db.refresh(r)

    return DietaryRestrictionListResponse(
        restrictions=[DietaryRestrictionResponse.model_validate(r) for r in created],
        total=len(created)
    )


@router.get("/{restriction_id}", response_model=DietaryRestrictionResponse)
async def get_dietary_restriction(
    restriction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific dietary restriction."""
    # Get restriction with profile verification
    result = await db.execute(
        select(DietaryRestriction)
        .join(Profile)
        .where(
            and_(
                DietaryRestriction.id == restriction_id,
                Profile.user_id == current_user.id
            )
        )
    )
    restriction = result.scalar_one_or_none()

    if not restriction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dietary restriction not found"
        )

    return DietaryRestrictionResponse.model_validate(restriction)


@router.put("/{restriction_id}", response_model=DietaryRestrictionResponse)
async def update_dietary_restriction(
    restriction_id: UUID,
    request: DietaryRestrictionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a dietary restriction."""
    # Get restriction with profile verification
    result = await db.execute(
        select(DietaryRestriction)
        .join(Profile)
        .where(
            and_(
                DietaryRestriction.id == restriction_id,
                Profile.user_id == current_user.id
            )
        )
    )
    restriction = result.scalar_one_or_none()

    if not restriction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dietary restriction not found"
        )

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "restriction_type" and value is not None:
            setattr(restriction, field, value.value)
        else:
            setattr(restriction, field, value)

    await db.commit()
    await db.refresh(restriction)

    return DietaryRestrictionResponse.model_validate(restriction)


@router.delete("/{restriction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dietary_restriction(
    restriction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a dietary restriction."""
    # Get restriction with profile verification
    result = await db.execute(
        select(DietaryRestriction)
        .join(Profile)
        .where(
            and_(
                DietaryRestriction.id == restriction_id,
                Profile.user_id == current_user.id
            )
        )
    )
    restriction = result.scalar_one_or_none()

    if not restriction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dietary restriction not found"
        )

    await db.delete(restriction)
    await db.commit()


@router.delete("/profile/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_profile_restrictions(
    profile_id: UUID,
    restriction_type: Optional[str] = Query(None, description="Only delete specific type: allergy or dislike"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete all dietary restrictions for a profile (optionally filtered by type)."""
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

    # Build delete query
    query = select(DietaryRestriction).where(DietaryRestriction.profile_id == profile_id)
    if restriction_type:
        query = query.where(DietaryRestriction.restriction_type == restriction_type)

    result = await db.execute(query)
    restrictions = result.scalars().all()

    for restriction in restrictions:
        await db.delete(restriction)

    await db.commit()
