"""
Pydantic schemas for restaurant meals endpoints.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime, time
from uuid import UUID
from enum import Enum


class MealType(str, Enum):
    """Meal type enum."""
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class OrderType(str, Enum):
    """Order type enum."""
    DINE_IN = "dine_in"
    DELIVERY = "delivery"
    TAKEOUT = "takeout"


class ImportSource(str, Enum):
    """Import source enum."""
    MANUAL = "manual"
    TEXT = "text"
    VOICE = "voice"
    PHOTO = "photo"
    RECEIPT = "receipt"
    SCREENSHOT = "screenshot"


# ============ Restaurant (Place) Schemas ============

class RestaurantBase(BaseModel):
    """Base restaurant schema."""
    name: str = Field(..., min_length=1, max_length=255)
    cuisine_type: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = None
    notes: Optional[str] = None
    favorite_dishes: Optional[List[str]] = None
    image_url: Optional[str] = None
    is_favorite: bool = False


class RestaurantCreate(RestaurantBase):
    """Schema for creating a restaurant."""
    pass


class RestaurantUpdate(BaseModel):
    """Schema for updating a restaurant."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    cuisine_type: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = None
    notes: Optional[str] = None
    favorite_dishes: Optional[List[str]] = None
    image_url: Optional[str] = None
    is_favorite: Optional[bool] = None
    is_archived: Optional[bool] = None


class RestaurantResponse(BaseModel):
    """Schema for restaurant response."""
    id: UUID
    user_id: UUID
    name: str
    cuisine_type: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    favorite_dishes: Optional[List[str]] = None
    image_url: Optional[str] = None
    is_favorite: bool = False
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    # Computed fields
    meal_count: int = 0

    class Config:
        from_attributes = True


class RestaurantListResponse(BaseModel):
    """Paginated list of restaurants."""
    items: List[RestaurantResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ Restaurant Meal Schemas ============

class RestaurantMealBase(BaseModel):
    """Base restaurant meal schema."""
    restaurant_name: str = Field(..., min_length=1, max_length=255)
    restaurant_id: Optional[UUID] = None
    meal_date: date
    meal_time: Optional[time] = None
    meal_type: MealType
    order_type: OrderType = OrderType.DINE_IN
    items_ordered: Optional[List[str]] = None
    description: Optional[str] = None
    estimated_calories: Optional[int] = Field(None, ge=0)
    rating: Optional[int] = Field(None, ge=1, le=5)
    feeling_after: Optional[int] = Field(None, ge=1, le=5)
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None


class RestaurantMealCreate(RestaurantMealBase):
    """Schema for creating a restaurant meal."""
    import_source: ImportSource = ImportSource.MANUAL


class RestaurantMealBatchCreate(BaseModel):
    """Schema for creating multiple restaurant meals at once."""
    items: List[RestaurantMealCreate] = Field(..., min_length=1)


class RestaurantMealUpdate(BaseModel):
    """Schema for updating a restaurant meal."""
    restaurant_name: Optional[str] = Field(None, min_length=1, max_length=255)
    restaurant_id: Optional[UUID] = None
    meal_date: Optional[date] = None
    meal_time: Optional[time] = None
    meal_type: Optional[MealType] = None
    order_type: Optional[OrderType] = None
    items_ordered: Optional[List[str]] = None
    description: Optional[str] = None
    estimated_calories: Optional[int] = Field(None, ge=0)
    rating: Optional[int] = Field(None, ge=1, le=5)
    feeling_after: Optional[int] = Field(None, ge=1, le=5)
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None
    is_archived: Optional[bool] = None


class RestaurantMealResponse(BaseModel):
    """Schema for restaurant meal response."""
    id: UUID
    user_id: UUID
    restaurant_id: Optional[UUID] = None
    restaurant_name: str
    meal_date: date
    meal_time: Optional[time] = None
    meal_type: str
    order_type: str
    items_ordered: Optional[List[str]] = None
    description: Optional[str] = None
    estimated_calories: Optional[int] = None
    rating: Optional[int] = None
    feeling_after: Optional[int] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None
    import_source: Optional[str] = None
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RestaurantMealListResponse(BaseModel):
    """Paginated list of restaurant meals."""
    items: List[RestaurantMealResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ Filter Schemas ============

class RestaurantMealFilters(BaseModel):
    """Query parameters for filtering restaurant meals."""
    search: Optional[str] = Field(None, description="Search in restaurant name, items, description")
    restaurant_id: Optional[UUID] = Field(None, description="Filter by restaurant")
    meal_type: Optional[MealType] = Field(None, description="Filter by meal type")
    order_type: Optional[OrderType] = Field(None, description="Filter by order type")
    rating_min: Optional[int] = Field(None, ge=1, le=5, description="Minimum rating")
    rating_max: Optional[int] = Field(None, ge=1, le=5, description="Maximum rating")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    date_from: Optional[date] = Field(None, description="Date from")
    date_to: Optional[date] = Field(None, description="Date to")
    is_archived: Optional[bool] = Field(False, description="Include archived items")
    sort_by: Optional[str] = Field("meal_date", description="Sort field")
    sort_order: Optional[str] = Field("desc", description="Sort order (asc/desc)")
    page: int = Field(1, ge=1, description="Page number")
    per_page: int = Field(50, ge=1, le=100, description="Items per page")


class RestaurantFilters(BaseModel):
    """Query parameters for filtering restaurants."""
    search: Optional[str] = Field(None, description="Search in name, cuisine, location")
    cuisine_type: Optional[str] = Field(None, description="Filter by cuisine type")
    is_favorite: Optional[bool] = Field(None, description="Filter favorites only")
    is_archived: Optional[bool] = Field(False, description="Include archived items")
    sort_by: Optional[str] = Field("name", description="Sort field")
    sort_order: Optional[str] = Field("asc", description="Sort order (asc/desc)")
    page: int = Field(1, ge=1, description="Page number")
    per_page: int = Field(50, ge=1, le=100, description="Items per page")


# ============ Bulk Actions ============

class BulkActionRequest(BaseModel):
    """Request for bulk operations."""
    ids: List[UUID] = Field(..., min_length=1)


class BulkActionResponse(BaseModel):
    """Response for bulk operations."""
    success: bool
    affected_count: int
    message: str


# ============ Analytics Schemas ============

class MealsByOrderType(BaseModel):
    """Meals breakdown by order type."""
    order_type: str
    count: int


class MealsByMealType(BaseModel):
    """Meals breakdown by meal type."""
    meal_type: str
    count: int


class TopRestaurant(BaseModel):
    """Top visited restaurant."""
    restaurant_name: str
    restaurant_id: Optional[UUID] = None
    visit_count: int
    avg_rating: Optional[float] = None


class MealsByTag(BaseModel):
    """Meals breakdown by tag."""
    tag: str
    count: int


class HomeVsOutRatio(BaseModel):
    """Ratio of home-cooked vs eating out."""
    home_cooked: int
    eating_out: int
    eating_out_percentage: float


class RestaurantMealAnalytics(BaseModel):
    """Analytics data for restaurant meals."""
    total_meals: int
    meals_this_week: int
    meals_this_month: int
    avg_rating: Optional[float] = None
    avg_feeling: Optional[float] = None
    by_order_type: List[MealsByOrderType]
    by_meal_type: List[MealsByMealType]
    top_restaurants: List[TopRestaurant]
    by_tags: List[MealsByTag]
    home_vs_out: Optional[HomeVsOutRatio] = None
    recent_meals: List[RestaurantMealResponse]


class MonthlyMealData(BaseModel):
    """Monthly restaurant meal statistics."""
    month: str
    month_label: str
    total_meals: int
    by_order_type: dict
    by_meal_type: dict
    avg_rating: Optional[float] = None
    unique_restaurants: int


class RestaurantMealHistory(BaseModel):
    """Historical data for restaurant meals."""
    period_months: int
    total_meals: int
    avg_monthly_meals: float
    monthly_data: List[MonthlyMealData]
    all_time_top_restaurants: List[TopRestaurant]


# ============ Import Schemas ============

class ParseTextRequest(BaseModel):
    """Request to parse restaurant meal from text."""
    text: str = Field(..., min_length=1)
    default_date: Optional[date] = None


class ParseTextResponse(BaseModel):
    """Response from text parsing."""
    parsed_meals: List[RestaurantMealCreate]
    raw_text: str
    success: bool
    message: Optional[str] = None


class ParseReceiptRequest(BaseModel):
    """Request to parse receipt (image or digital)."""
    image_url: Optional[str] = None
    receipt_text: Optional[str] = None
    default_date: Optional[date] = None


class ParseReceiptResponse(BaseModel):
    """Response from receipt parsing."""
    restaurant_name: Optional[str] = None
    items: Optional[List[str]] = None
    date: Optional[date] = None
    parsed_meal: Optional[RestaurantMealCreate] = None
    success: bool
    message: Optional[str] = None


class ParseScreenshotRequest(BaseModel):
    """Request to parse delivery app screenshot."""
    image_url: str
    default_date: Optional[date] = None


class ParseScreenshotResponse(BaseModel):
    """Response from screenshot parsing."""
    app_detected: Optional[str] = None  # uber_eats, doordash, grubhub, etc.
    restaurant_name: Optional[str] = None
    items: Optional[List[str]] = None
    parsed_meal: Optional[RestaurantMealCreate] = None
    success: bool
    message: Optional[str] = None
