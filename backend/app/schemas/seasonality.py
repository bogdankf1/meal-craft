"""Seasonality Schemas - Local & Seasonal Produce Guide"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


# ============ Enums ============

class ProduceCategory(str, Enum):
    """Seasonal produce category enum."""
    VEGETABLES = "vegetables"
    FRUITS = "fruits"
    HERBS = "herbs"
    SEAFOOD = "seafood"
    MUSHROOMS = "mushrooms"
    NUTS = "nuts"
    GRAINS = "grains"


class SpecialtyType(str, Enum):
    """Local specialty type enum."""
    INGREDIENT = "ingredient"
    DISH = "dish"
    TECHNIQUE = "technique"
    PRODUCT = "product"


class SupportedCountry(str, Enum):
    """Supported countries for seasonality data."""
    UA = "UA"  # Ukraine
    BR = "BR"  # Brazil
    US = "US"  # United States
    PL = "PL"  # Poland
    DE = "DE"  # Germany
    FR = "FR"  # France
    IT = "IT"  # Italy
    ES = "ES"  # Spain
    GB = "GB"  # United Kingdom


# ============ Seasonal Produce Schemas ============

class SeasonalProduceBase(BaseModel):
    """Base schema for seasonal produce."""
    name: str = Field(..., min_length=1, max_length=255)
    name_local: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    category: ProduceCategory
    country_code: str = Field(..., min_length=2, max_length=3)
    region: Optional[str] = Field(None, max_length=100)
    available_months: List[int] = Field(..., min_length=1)
    peak_months: Optional[List[int]] = None
    storage_tips: Optional[str] = None
    nutrition_highlights: Optional[str] = None
    culinary_uses: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)


class SeasonalProduceCreate(SeasonalProduceBase):
    """Schema for creating seasonal produce."""
    pass


class SeasonalProduceUpdate(BaseModel):
    """Schema for updating seasonal produce."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    name_local: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    category: Optional[ProduceCategory] = None
    region: Optional[str] = Field(None, max_length=100)
    available_months: Optional[List[int]] = None
    peak_months: Optional[List[int]] = None
    storage_tips: Optional[str] = None
    nutrition_highlights: Optional[str] = None
    culinary_uses: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class SeasonalProduceResponse(BaseModel):
    """Schema for seasonal produce response."""
    id: UUID
    name: str
    name_local: Optional[str] = None
    description: Optional[str] = None
    category: str
    country_code: str
    region: Optional[str] = None
    available_months: List[int]
    peak_months: Optional[List[int]] = None
    storage_tips: Optional[str] = None
    nutrition_highlights: Optional[str] = None
    culinary_uses: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    # Computed fields
    is_in_season: bool = False
    is_peak_season: bool = False
    is_favorite: bool = False

    class Config:
        from_attributes = True


class SeasonalProduceListResponse(BaseModel):
    """Schema for paginated seasonal produce list response."""
    items: List[SeasonalProduceResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ Local Specialty Schemas ============

class LocalSpecialtyBase(BaseModel):
    """Base schema for local specialty."""
    name: str = Field(..., min_length=1, max_length=255)
    name_local: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    specialty_type: SpecialtyType
    country_code: str = Field(..., min_length=2, max_length=3)
    region: Optional[str] = Field(None, max_length=100)
    cultural_info: Optional[str] = None
    how_to_use: Optional[str] = None
    where_to_find: Optional[str] = None
    related_dishes: Optional[List[str]] = None
    seasonal_availability: Optional[List[int]] = None
    image_url: Optional[str] = Field(None, max_length=500)


class LocalSpecialtyCreate(LocalSpecialtyBase):
    """Schema for creating local specialty."""
    pass


class LocalSpecialtyUpdate(BaseModel):
    """Schema for updating local specialty."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    name_local: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    specialty_type: Optional[SpecialtyType] = None
    region: Optional[str] = Field(None, max_length=100)
    cultural_info: Optional[str] = None
    how_to_use: Optional[str] = None
    where_to_find: Optional[str] = None
    related_dishes: Optional[List[str]] = None
    seasonal_availability: Optional[List[int]] = None
    image_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class LocalSpecialtyResponse(BaseModel):
    """Schema for local specialty response."""
    id: UUID
    name: str
    name_local: Optional[str] = None
    description: Optional[str] = None
    specialty_type: str
    country_code: str
    region: Optional[str] = None
    cultural_info: Optional[str] = None
    how_to_use: Optional[str] = None
    where_to_find: Optional[str] = None
    related_dishes: Optional[List[str]] = None
    seasonal_availability: Optional[List[int]] = None
    image_url: Optional[str] = None
    is_active: bool
    is_featured: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LocalSpecialtyListResponse(BaseModel):
    """Schema for paginated local specialty list response."""
    items: List[LocalSpecialtyResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ User Preference Schemas ============

class UserSeasonalPreferenceCreate(BaseModel):
    """Schema for creating/updating user seasonal preferences."""
    country_code: Optional[str] = Field(None, min_length=2, max_length=3)
    region: Optional[str] = Field(None, max_length=100)
    notification_enabled: Optional[bool] = False


class UserSeasonalPreferenceUpdate(BaseModel):
    """Schema for updating user seasonal preferences."""
    country_code: Optional[str] = Field(None, min_length=2, max_length=3)
    region: Optional[str] = Field(None, max_length=100)
    favorite_produce_ids: Optional[List[UUID]] = None
    notification_enabled: Optional[bool] = None


class UserSeasonalPreferenceResponse(BaseModel):
    """Schema for user seasonal preference response."""
    id: UUID
    user_id: UUID
    country_code: Optional[str] = None
    region: Optional[str] = None
    favorite_produce_ids: Optional[List[UUID]] = None
    notification_enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Filter Schemas ============

class SeasonalProduceFilters(BaseModel):
    """Schema for seasonal produce filters."""
    search: Optional[str] = None
    category: Optional[str] = None
    country_code: Optional[str] = None
    region: Optional[str] = None
    month: Optional[int] = Field(None, ge=1, le=12)  # Filter by specific month
    in_season_only: Optional[bool] = False  # Only show currently in season
    peak_only: Optional[bool] = False  # Only show peak season items
    page: int = 1
    per_page: int = 50
    sort_by: str = "name"
    sort_order: str = "asc"


class LocalSpecialtyFilters(BaseModel):
    """Schema for local specialty filters."""
    search: Optional[str] = None
    specialty_type: Optional[str] = None
    country_code: Optional[str] = None
    region: Optional[str] = None
    is_featured: Optional[bool] = None
    page: int = 1
    per_page: int = 20
    sort_by: str = "name"
    sort_order: str = "asc"


# ============ AI Recommendation Schemas ============

class SeasonalRecommendationRequest(BaseModel):
    """Request for AI-powered seasonal recommendations."""
    country_code: str = Field(..., min_length=2, max_length=3)
    month: Optional[int] = Field(None, ge=1, le=12)  # Defaults to current month
    preferences: Optional[List[str]] = None  # User preferences like "vegetarian", "quick meals"
    available_ingredients: Optional[List[str]] = None  # What user has in pantry


class SeasonalRecommendation(BaseModel):
    """Single seasonal recommendation."""
    produce_name: str
    category: str
    why_now: str  # Why this is recommended now
    recipe_ideas: List[str]
    storage_tip: Optional[str] = None
    is_peak: bool = False


class SeasonalRecommendationResponse(BaseModel):
    """Response for AI-powered seasonal recommendations."""
    country_code: str
    country_name: str
    month: int
    month_name: str
    season: str  # spring, summer, autumn, winter
    recommendations: List[SeasonalRecommendation]
    seasonal_tip: str  # General tip for the season
    generated_at: datetime


class WeeklyPicksRequest(BaseModel):
    """Request for weekly seasonal picks."""
    country_code: str = Field(..., min_length=2, max_length=3)


class WeeklyPick(BaseModel):
    """Single weekly pick item."""
    name: str
    name_local: Optional[str] = None
    category: str
    why_buy_now: str
    budget_friendly: bool = False
    recipe_suggestion: str


class WeeklyPicksResponse(BaseModel):
    """Response for weekly seasonal picks."""
    country_code: str
    country_name: str
    week_of: str  # e.g., "December 9-15, 2024"
    picks: List[WeeklyPick]
    market_tip: str  # Tip for shopping this week


# ============ Calendar Schemas ============

class MonthlySeasonalData(BaseModel):
    """Seasonal data for a single month."""
    month: int
    month_name: str
    produce_count: int
    peak_produce: List[str]  # Names of peak season items
    coming_soon: List[str]  # Items starting next month
    ending_soon: List[str]  # Items ending this month


class SeasonalCalendarResponse(BaseModel):
    """Full year seasonal calendar."""
    country_code: str
    country_name: str
    months: List[MonthlySeasonalData]


# ============ Country Info Schema ============

class CountryInfo(BaseModel):
    """Information about a supported country."""
    code: str
    name: str
    name_local: str
    hemisphere: str  # northern, southern
    produce_count: int
    specialty_count: int


class SupportedCountriesResponse(BaseModel):
    """List of supported countries."""
    countries: List[CountryInfo]
