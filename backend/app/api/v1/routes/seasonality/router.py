"""Seasonality API routes - Local & Seasonal Produce Guide.

Thin route handlers: validate the request (via the FastAPI signature) and
delegate to ``service``.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.api.v1.routes.seasonality import service
from app.api.v1.routes.seasonality.schemas import (
    SeasonalProduceCreate,
    SeasonalProduceResponse,
    SeasonalProduceListResponse,
    LocalSpecialtyCreate,
    LocalSpecialtyResponse,
    LocalSpecialtyListResponse,
    UserSeasonalPreferenceUpdate,
    UserSeasonalPreferenceResponse,
    SeasonalRecommendationRequest,
    SeasonalRecommendationResponse,
    WeeklyPicksRequest,
    WeeklyPicksResponse,
    SeasonalCalendarResponse,
    SupportedCountriesResponse,
)

router = APIRouter(prefix="/seasonality", tags=["seasonality"])


# ============ Supported Countries ============

@router.get("/countries", response_model=SupportedCountriesResponse)
async def get_supported_countries(
    db: AsyncSession = Depends(get_db),
):
    """Get list of supported countries with produce/specialty counts."""
    return await service.get_supported_countries(db)


# ============ User Preferences ============

@router.get("/preferences", response_model=UserSeasonalPreferenceResponse)
async def get_user_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's seasonality preferences."""
    return await service.get_user_preferences(db, current_user)


@router.put("/preferences", response_model=UserSeasonalPreferenceResponse)
async def update_user_preferences(
    data: UserSeasonalPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user's seasonality preferences."""
    return await service.update_user_preferences(db, current_user, data)


@router.post("/preferences/favorites/{produce_id}")
async def add_favorite_produce(
    produce_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a produce item to favorites."""
    return await service.add_favorite_produce(db, current_user, produce_id)


@router.delete("/preferences/favorites/{produce_id}")
async def remove_favorite_produce(
    produce_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a produce item from favorites."""
    return await service.remove_favorite_produce(db, current_user, produce_id)


# ============ Seasonal Produce ============

@router.get("/produce", response_model=SeasonalProduceListResponse)
async def get_seasonal_produce(
    search: Optional[str] = None,
    category: Optional[str] = None,
    country_code: Optional[str] = None,
    region: Optional[str] = None,
    month: Optional[int] = Query(None, ge=1, le=12),
    in_season_only: bool = False,
    peak_only: bool = False,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    sort_by: str = "name",
    sort_order: str = "asc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get seasonal produce with filters."""
    return await service.get_seasonal_produce(
        db,
        current_user,
        search=search,
        category=category,
        country_code=country_code,
        region=region,
        month=month,
        in_season_only=in_season_only,
        peak_only=peak_only,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/produce/{produce_id}", response_model=SeasonalProduceResponse)
async def get_produce_by_id(
    produce_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific produce item by ID."""
    return await service.get_produce_by_id(db, current_user, produce_id)


@router.delete("/produce/{produce_id}")
async def delete_produce(
    produce_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a produce item by ID. Also removes it from favorites."""
    return await service.delete_produce(db, current_user, produce_id)


# ============ Local Specialties ============

@router.get("/specialties", response_model=LocalSpecialtyListResponse)
async def get_local_specialties(
    search: Optional[str] = None,
    specialty_type: Optional[str] = None,
    country_code: Optional[str] = None,
    region: Optional[str] = None,
    is_featured: Optional[bool] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = "name",
    sort_order: str = "asc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get local specialties with filters."""
    return await service.get_local_specialties(
        db,
        current_user,
        search=search,
        specialty_type=specialty_type,
        country_code=country_code,
        region=region,
        is_featured=is_featured,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/specialties/{specialty_id}", response_model=LocalSpecialtyResponse)
async def get_specialty_by_id(
    specialty_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific local specialty by ID."""
    return await service.get_specialty_by_id(db, current_user, specialty_id)


# ============ Seasonal Calendar ============

@router.get("/calendar/{country_code}", response_model=SeasonalCalendarResponse)
async def get_seasonal_calendar(
    country_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full year seasonal calendar for a country."""
    return await service.get_seasonal_calendar(db, current_user, country_code)


# ============ AI-Powered Recommendations ============

@router.post("/recommendations", response_model=SeasonalRecommendationResponse)
async def get_seasonal_recommendations(
    request: SeasonalRecommendationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-powered seasonal recommendations for a country/month."""
    return await service.get_seasonal_recommendations(db, current_user, request)


@router.post("/weekly-picks", response_model=WeeklyPicksResponse)
async def get_weekly_picks(
    request: WeeklyPicksRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-powered weekly shopping picks."""
    return await service.get_weekly_picks(db, current_user, request)


# ============ Save AI Recommendation as Produce ============

@router.post("/recommendations/save", response_model=SeasonalProduceResponse)
async def save_recommendation_as_produce(
    data: SeasonalProduceCreate,
    add_to_favorites: bool = Query(False, description="Also add to favorites"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save an AI recommendation as a seasonal produce entry in the database."""
    return await service.save_recommendation_as_produce(
        db, current_user, data, add_to_favorites=add_to_favorites
    )


# ============ Admin Endpoints (for seeding data) ============

@router.post("/produce", response_model=SeasonalProduceResponse)
async def create_seasonal_produce(
    data: SeasonalProduceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new seasonal produce entry (admin only)."""
    return await service.create_seasonal_produce(db, current_user, data)


@router.post("/specialties", response_model=LocalSpecialtyResponse)
async def create_local_specialty(
    data: LocalSpecialtyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new local specialty entry (admin only)."""
    return await service.create_local_specialty(db, current_user, data)
