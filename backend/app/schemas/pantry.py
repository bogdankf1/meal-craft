from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


class StorageLocation(str, Enum):
    """Storage location enum."""
    PANTRY = "pantry"
    FRIDGE = "fridge"
    FREEZER = "freezer"
    CABINET = "cabinet"
    SPICE_RACK = "spice_rack"
    OTHER = "other"


class PantryCategory(str, Enum):
    """Pantry item category enum."""
    PRODUCE = "produce"
    MEAT = "meat"
    SEAFOOD = "seafood"
    DAIRY = "dairy"
    BAKERY = "bakery"
    FROZEN = "frozen"
    CANNED = "canned"
    DRY_GOODS = "dry_goods"
    BEVERAGES = "beverages"
    SNACKS = "snacks"
    CONDIMENTS = "condiments"
    SPICES = "spices"
    OILS = "oils"
    GRAINS = "grains"
    PASTA = "pasta"
    CEREALS = "cereals"
    BAKING = "baking"
    OTHER = "other"


class WasteReason(str, Enum):
    """Reason for food waste."""
    EXPIRED = "expired"
    SPOILED = "spoiled"
    FORGOT = "forgot"
    OVERCOOKED = "overcooked"
    DIDNT_LIKE = "didnt_like"
    TOO_MUCH = "too_much"
    OTHER = "other"


# ============ Create/Update Schemas ============

class PantryItemCreate(BaseModel):
    """Schema for creating a pantry item."""
    item_name: str = Field(..., min_length=1, max_length=255)
    quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    category: Optional[PantryCategory] = None
    storage_location: StorageLocation = StorageLocation.PANTRY
    expiry_date: Optional[date] = None
    opened_date: Optional[date] = None
    minimum_quantity: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None
    source_grocery_id: Optional[UUID] = None


class PantryItemBatchCreate(BaseModel):
    """Schema for batch creating pantry items."""
    items: List[PantryItemCreate] = Field(..., min_length=1)


class PantryItemUpdate(BaseModel):
    """Schema for updating a pantry item."""
    item_name: Optional[str] = Field(None, min_length=1, max_length=255)
    quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    category: Optional[PantryCategory] = None
    storage_location: Optional[StorageLocation] = None
    expiry_date: Optional[date] = None
    opened_date: Optional[date] = None
    minimum_quantity: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None
    is_archived: Optional[bool] = None


# ============ Response Schemas ============

class PantryItemResponse(BaseModel):
    """Schema for pantry item response."""
    id: UUID
    user_id: UUID
    item_name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    storage_location: str
    expiry_date: Optional[date] = None
    opened_date: Optional[date] = None
    minimum_quantity: Optional[float] = None
    notes: Optional[str] = None
    source_grocery_id: Optional[UUID] = None
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    # Waste tracking fields
    is_wasted: bool = False
    wasted_at: Optional[datetime] = None
    waste_reason: Optional[str] = None
    waste_notes: Optional[str] = None

    class Config:
        from_attributes = True


class PantryItemListResponse(BaseModel):
    """Schema for paginated pantry item list response."""
    items: List[PantryItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ Filter Schemas ============

class PantryFilters(BaseModel):
    """Schema for pantry filters."""
    search: Optional[str] = None
    category: Optional[str] = None
    storage_location: Optional[str] = None
    is_archived: Optional[bool] = None
    expiring_within_days: Optional[int] = None
    low_stock: Optional[bool] = None
    page: int = 1
    per_page: int = 20
    sort_by: str = "created_at"
    sort_order: str = "desc"


# ============ Bulk Action Schemas ============

class BulkActionRequest(BaseModel):
    """Request for bulk operations."""
    ids: List[UUID] = Field(..., min_length=1, description="List of pantry item IDs")


class BulkActionResponse(BaseModel):
    """Response for bulk operations."""
    success: bool
    affected_count: int
    message: str


# ============ Waste Tracking Schemas ============

class MarkAsWastedRequest(BaseModel):
    """Request to mark a pantry item as wasted."""
    waste_reason: WasteReason = Field(..., description="Reason for wasting the item")
    waste_notes: Optional[str] = Field(None, max_length=500, description="Additional notes about the waste")


class BulkMarkAsWastedRequest(BaseModel):
    """Request to mark multiple pantry items as wasted."""
    ids: List[UUID] = Field(..., min_length=1, description="List of pantry item IDs")
    waste_reason: WasteReason = Field(..., description="Reason for wasting the items")
    waste_notes: Optional[str] = Field(None, max_length=500, description="Additional notes about the waste")


# ============ Analytics Schemas ============

class WastedItem(BaseModel):
    """Wasted pantry item response."""
    id: UUID
    item_name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    storage_location: str
    wasted_at: datetime
    waste_reason: str
    waste_notes: Optional[str] = None

    class Config:
        from_attributes = True


class WasteByReason(BaseModel):
    """Waste breakdown by reason."""
    reason: str
    count: int
    total_items: int


class WasteByCategory(BaseModel):
    """Waste breakdown by category."""
    category: str
    count: int


class WasteByLocation(BaseModel):
    """Waste breakdown by storage location."""
    location: str
    count: int


class MonthlyWasteData(BaseModel):
    """Monthly waste statistics for pantry."""
    month: str = Field(..., description="Month in YYYY-MM format")
    month_label: str = Field(..., description="Human readable month label")
    wasted_count: int = Field(..., description="Number of items wasted")
    by_reason: dict = Field(..., description="Breakdown by waste reason")
    by_category: dict = Field(..., description="Breakdown by category")


class PantryAnalytics(BaseModel):
    """Pantry analytics data."""
    total_items: int = Field(..., description="Total number of pantry items")
    items_by_location: dict = Field(..., description="Breakdown by storage location")
    items_by_category: dict = Field(..., description="Breakdown by category")
    expiring_soon: int = Field(..., description="Items expiring within 7 days")
    expired: int = Field(..., description="Items already expired")
    low_stock_items: int = Field(..., description="Items below minimum quantity")
    recently_added: List[PantryItemResponse] = Field(..., description="Recently added items")
    expiring_items: List[PantryItemResponse] = Field(default_factory=list, description="Items expiring soon")
    low_stock_list: List[PantryItemResponse] = Field(default_factory=list, description="Items below minimum quantity")


class WasteAnalytics(BaseModel):
    """Waste analytics data for pantry."""
    total_wasted_items: int = Field(..., description="Total number of wasted items")
    wasted_this_week: int = Field(..., description="Items wasted this week")
    wasted_this_month: int = Field(..., description="Items wasted this month")
    waste_rate: float = Field(..., description="Percentage of items wasted vs total")
    by_reason: List[WasteByReason] = Field(..., description="Breakdown by waste reason")
    by_category: List[WasteByCategory] = Field(..., description="Breakdown by category")
    by_location: List[WasteByLocation] = Field(..., description="Breakdown by storage location")
    recent_wasted: List[WastedItem] = Field(..., description="Recently wasted items")
    monthly_trends: List[MonthlyWasteData] = Field(default=[], description="Monthly waste trends")
    suggestions: List[str] = Field(default=[], description="Suggestions to reduce waste")


# ============ History Schemas ============

class MonthlyData(BaseModel):
    """Monthly pantry statistics."""
    month: str = Field(..., description="Month in YYYY-MM format")
    month_label: str = Field(..., description="Human readable month label")
    total_items: int = Field(..., description="Total items added")
    category_breakdown: dict = Field(..., description="Breakdown by category")
    location_breakdown: dict = Field(..., description="Breakdown by storage location")


class TopItem(BaseModel):
    """Top pantry item statistics."""
    item_name: str
    total_quantity: float
    occurrence_count: int
    last_added: str


class PantryHistory(BaseModel):
    """Pantry history data."""
    period_months: int
    total_items: int
    avg_monthly_items: float
    monthly_data: List[MonthlyData]
    top_items: List[TopItem]
    category_trends: dict = Field(..., description="Category trends over time")
    location_trends: dict = Field(..., description="Location trends over time")


# ============ Parse Schemas ============

class ParseTextRequest(BaseModel):
    """Request to parse text for pantry items."""
    text: str = Field(..., min_length=1)
    default_storage_location: Optional[StorageLocation] = StorageLocation.PANTRY


class ParseTextResponse(BaseModel):
    """Response from text parsing."""
    parsed_items: List[PantryItemCreate]
    raw_text: str
    success: bool
    message: Optional[str] = None


# ============ Move to Pantry Schemas ============

class MoveToPantryRequest(BaseModel):
    """Request to move grocery items to pantry."""
    storage_location: StorageLocation = StorageLocation.PANTRY


class BulkMoveToPantryRequest(BaseModel):
    """Request to move multiple grocery items to pantry."""
    ids: List[UUID] = Field(..., min_length=1, description="List of grocery IDs")
    storage_location: StorageLocation = StorageLocation.PANTRY


class MoveToPantryResponse(BaseModel):
    """Response from moving items to pantry."""
    success: bool
    moved_count: int
    pantry_items: List[PantryItemResponse]
    message: str
