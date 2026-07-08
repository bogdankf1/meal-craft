"""Seasonality request/response schemas.

The seasonality Pydantic models are defined centrally in
``app.schemas.seasonality``. This module re-exports them so the seasonality
package follows the same router / service / schemas layout as the other feature
packages, while keeping a single source of truth.
"""
from app.schemas.seasonality import (
    # Produce schemas
    SeasonalProduceCreate,
    SeasonalProduceUpdate,
    SeasonalProduceResponse,
    SeasonalProduceListResponse,
    SeasonalProduceFilters,
    # Specialty schemas
    LocalSpecialtyCreate,
    LocalSpecialtyUpdate,
    LocalSpecialtyResponse,
    LocalSpecialtyListResponse,
    LocalSpecialtyFilters,
    # User preference schemas
    UserSeasonalPreferenceCreate,
    UserSeasonalPreferenceUpdate,
    UserSeasonalPreferenceResponse,
    # AI recommendation schemas
    SeasonalRecommendationRequest,
    SeasonalRecommendationResponse,
    SeasonalRecommendation,
    WeeklyPicksRequest,
    WeeklyPicksResponse,
    WeeklyPick,
    # Calendar schemas
    SeasonalCalendarResponse,
    MonthlySeasonalData,
    # Country info
    CountryInfo,
    SupportedCountriesResponse,
)

__all__ = [
    "SeasonalProduceCreate",
    "SeasonalProduceUpdate",
    "SeasonalProduceResponse",
    "SeasonalProduceListResponse",
    "SeasonalProduceFilters",
    "LocalSpecialtyCreate",
    "LocalSpecialtyUpdate",
    "LocalSpecialtyResponse",
    "LocalSpecialtyListResponse",
    "LocalSpecialtyFilters",
    "UserSeasonalPreferenceCreate",
    "UserSeasonalPreferenceUpdate",
    "UserSeasonalPreferenceResponse",
    "SeasonalRecommendationRequest",
    "SeasonalRecommendationResponse",
    "SeasonalRecommendation",
    "WeeklyPicksRequest",
    "WeeklyPicksResponse",
    "WeeklyPick",
    "SeasonalCalendarResponse",
    "MonthlySeasonalData",
    "CountryInfo",
    "SupportedCountriesResponse",
]
