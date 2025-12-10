"""
Pydantic schemas for groceries endpoints.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from enum import Enum


class GroceryCategory(str, Enum):
    """Grocery category enum."""
    PRODUCE = "produce"
    MEAT = "meat"
    SEAFOOD = "seafood"
    DAIRY = "dairy"
    BAKERY = "bakery"
    FROZEN = "frozen"
    PANTRY = "pantry"
    BEVERAGES = "beverages"
    SNACKS = "snacks"
    CONDIMENTS = "condiments"
    SPICES = "spices"
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


class GroceryBase(BaseModel):
    """Base grocery schema with common fields."""
    item_name: str = Field(..., min_length=1, max_length=255, description="Name of the grocery item")
    quantity: Optional[float] = Field(None, ge=0, description="Quantity of the item")
    unit: Optional[str] = Field(None, max_length=50, description="Unit of measurement (g, kg, ml, piece, etc.)")
    category: Optional[GroceryCategory] = Field(None, description="Category of the grocery item")
    purchase_date: date = Field(..., description="Date when the item was purchased")
    expiry_date: Optional[date] = Field(None, description="Expiration date of the item")
    cost: Optional[float] = Field(None, ge=0, description="Cost of the item")
    store: Optional[str] = Field(None, max_length=255, description="Store where the item was purchased")


class GroceryCreate(GroceryBase):
    """Schema for creating a single grocery item."""
    pass


class GroceryBatchCreate(BaseModel):
    """Schema for creating multiple grocery items at once."""
    items: List[GroceryCreate] = Field(..., min_length=1, description="List of grocery items to create")


class GroceryUpdate(BaseModel):
    """Schema for updating a grocery item. All fields are optional."""
    item_name: Optional[str] = Field(None, min_length=1, max_length=255)
    quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    category: Optional[GroceryCategory] = None
    purchase_date: Optional[date] = None
    expiry_date: Optional[date] = None
    cost: Optional[float] = Field(None, ge=0)
    store: Optional[str] = Field(None, max_length=255)
    is_archived: Optional[bool] = None


class GroceryResponse(BaseModel):
    """Schema for grocery item response."""
    id: UUID
    user_id: UUID
    item_name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    purchase_date: date
    expiry_date: Optional[date] = None
    cost: Optional[float] = None
    store: Optional[str] = None
    is_archived: bool
    created_at: datetime
    # Waste tracking fields
    is_wasted: bool = False
    wasted_at: Optional[datetime] = None
    waste_reason: Optional[str] = None
    waste_notes: Optional[str] = None

    class Config:
        from_attributes = True


class GroceryListResponse(BaseModel):
    """Paginated list of groceries response."""
    items: List[GroceryResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class GroceryFilters(BaseModel):
    """Query parameters for filtering groceries."""
    search: Optional[str] = Field(None, description="Search in item name")
    category: Optional[GroceryCategory] = Field(None, description="Filter by category")
    store: Optional[str] = Field(None, description="Filter by store")
    is_archived: Optional[bool] = Field(False, description="Include archived items")
    date_from: Optional[date] = Field(None, description="Purchase date from")
    date_to: Optional[date] = Field(None, description="Purchase date to")
    expiring_within_days: Optional[int] = Field(None, ge=0, description="Items expiring within N days")
    sort_by: Optional[str] = Field("created_at", description="Sort field")
    sort_order: Optional[str] = Field("desc", description="Sort order (asc/desc)")
    page: int = Field(1, ge=1, description="Page number")
    per_page: int = Field(50, ge=1, le=100, description="Items per page")


class BulkActionRequest(BaseModel):
    """Request for bulk operations."""
    ids: List[UUID] = Field(..., min_length=1, description="List of grocery IDs")


class BulkActionResponse(BaseModel):
    """Response for bulk operations."""
    success: bool
    affected_count: int
    message: str


class MarkAsWastedRequest(BaseModel):
    """Request to mark a grocery item as wasted."""
    waste_reason: WasteReason = Field(..., description="Reason for wasting the item")
    waste_notes: Optional[str] = Field(None, max_length=500, description="Additional notes about the waste")


class BulkMarkAsWastedRequest(BaseModel):
    """Request to mark multiple grocery items as wasted."""
    ids: List[UUID] = Field(..., min_length=1, description="List of grocery IDs")
    waste_reason: WasteReason = Field(..., description="Reason for wasting the items")
    waste_notes: Optional[str] = Field(None, max_length=500, description="Additional notes about the waste")


class GroceryAnalytics(BaseModel):
    """Analytics data for groceries."""
    total_items: int = Field(..., description="Total grocery items")
    items_this_week: int = Field(..., description="Items added this week")
    items_this_month: int = Field(..., description="Items added this month")
    total_spent_this_week: float = Field(..., description="Total spent this week")
    total_spent_this_month: float = Field(..., description="Total spent this month")
    expiring_soon: int = Field(..., description="Items expiring within 7 days")
    expired: int = Field(..., description="Already expired items")
    category_breakdown: dict = Field(..., description="Item count by category")
    store_breakdown: dict = Field(..., description="Item count by store")
    spending_by_category: dict = Field(..., description="Spending by category")
    recent_items: List[GroceryResponse] = Field(..., description="Recently added items")


class ParseTextRequest(BaseModel):
    """Request to parse grocery list from text."""
    text: str = Field(..., min_length=1, description="Text containing grocery items")
    default_purchase_date: Optional[date] = Field(None, description="Default purchase date for parsed items")


class ParseReceiptUrlRequest(BaseModel):
    """Request to parse grocery items from a receipt URL."""
    url: str = Field(..., min_length=1, description="URL of the digital receipt")
    default_purchase_date: Optional[date] = Field(None, description="Default purchase date for parsed items")


class ParseTextResponse(BaseModel):
    """Response from text parsing."""
    parsed_items: List[GroceryCreate]
    raw_text: str
    success: bool
    message: Optional[str] = None


class MonthlyData(BaseModel):
    """Monthly statistics data."""
    month: str = Field(..., description="Month in YYYY-MM format")
    month_label: str = Field(..., description="Human readable month label")
    total_items: int = Field(..., description="Total items purchased")
    total_spent: float = Field(..., description="Total amount spent")
    category_breakdown: dict = Field(..., description="Item count by category")
    store_breakdown: dict = Field(..., description="Item count by store")
    spending_by_category: dict = Field(..., description="Spending by category")


class TopItem(BaseModel):
    """Top purchased item."""
    item_name: str
    total_quantity: float
    purchase_count: int
    total_spent: float
    avg_price: float
    last_purchased: date


class GroceryHistory(BaseModel):
    """Historical analytics data for groceries."""
    period_months: int = Field(..., description="Number of months in the history")
    total_items: int = Field(..., description="Total items in period")
    total_spent: float = Field(..., description="Total spent in period")
    avg_monthly_items: float = Field(..., description="Average items per month")
    avg_monthly_spending: float = Field(..., description="Average spending per month")
    monthly_data: List[MonthlyData] = Field(..., description="Month by month breakdown")
    top_items: List[TopItem] = Field(..., description="Most frequently purchased items")
    category_trends: dict = Field(..., description="Category breakdown over time")
    store_trends: dict = Field(..., description="Store breakdown over time")


class BarcodeLookupResponse(BaseModel):
    """Response from barcode lookup."""
    success: bool = Field(..., description="Whether the lookup was successful")
    barcode: str = Field(..., description="The barcode that was looked up")
    product_name: Optional[str] = Field(None, description="Name of the product")
    brand: Optional[str] = Field(None, description="Brand of the product")
    category: Optional[str] = Field(None, description="Category of the product")
    quantity: Optional[float] = Field(None, description="Quantity/weight of the product")
    unit: Optional[str] = Field(None, description="Unit of measurement")
    image_url: Optional[str] = Field(None, description="URL to product image")
    message: Optional[str] = Field(None, description="Additional message")


class WastedItem(BaseModel):
    """Wasted grocery item response."""
    id: UUID
    item_name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    purchase_date: date
    cost: Optional[float] = None
    store: Optional[str] = None
    wasted_at: datetime
    waste_reason: str
    waste_notes: Optional[str] = None

    class Config:
        from_attributes = True


class WasteByReason(BaseModel):
    """Waste breakdown by reason."""
    reason: str
    count: int
    total_cost: float


class WasteByCategory(BaseModel):
    """Waste breakdown by category."""
    category: str
    count: int
    total_cost: float


class MonthlyWasteData(BaseModel):
    """Monthly waste statistics."""
    month: str = Field(..., description="Month in YYYY-MM format")
    month_label: str = Field(..., description="Human readable month label")
    wasted_count: int = Field(..., description="Number of items wasted")
    wasted_cost: float = Field(..., description="Total cost of wasted items")
    by_reason: dict = Field(..., description="Breakdown by waste reason")
    by_category: dict = Field(..., description="Breakdown by category")


class WasteAnalytics(BaseModel):
    """Waste analytics data."""
    total_wasted_items: int = Field(..., description="Total number of wasted items")
    total_wasted_cost: float = Field(..., description="Total cost of wasted items")
    wasted_this_week: int = Field(..., description="Items wasted this week")
    wasted_this_month: int = Field(..., description="Items wasted this month")
    cost_wasted_this_week: float = Field(..., description="Cost wasted this week")
    cost_wasted_this_month: float = Field(..., description="Cost wasted this month")
    waste_rate: float = Field(..., description="Percentage of items wasted vs total purchased")
    by_reason: List[WasteByReason] = Field(..., description="Breakdown by waste reason")
    by_category: List[WasteByCategory] = Field(..., description="Breakdown by category")
    recent_wasted: List[WastedItem] = Field(..., description="Recently wasted items")
    monthly_trends: List[MonthlyWasteData] = Field(default=[], description="Monthly waste trends")
    suggestions: List[str] = Field(default=[], description="Suggestions to reduce waste")
