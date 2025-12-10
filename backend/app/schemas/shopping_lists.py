"""
Pydantic schemas for shopping lists endpoints.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from enum import Enum


class ShoppingListStatus(str, Enum):
    """Shopping list status enum."""
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ShoppingListItemCategory(str, Enum):
    """Shopping list item category enum (matches grocery categories)."""
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


# ==================== Shopping List Item Schemas ====================

class ShoppingListItemBase(BaseModel):
    """Base shopping list item schema."""
    ingredient_name: str = Field(..., min_length=1, max_length=255, description="Name of the item")
    quantity: Optional[float] = Field(None, ge=0, description="Quantity of the item")
    unit: Optional[str] = Field(None, max_length=50, description="Unit of measurement")
    category: Optional[ShoppingListItemCategory] = Field(None, description="Category of the item")


class ShoppingListItemCreate(ShoppingListItemBase):
    """Schema for creating a shopping list item."""
    pass


class ShoppingListItemUpdate(BaseModel):
    """Schema for updating a shopping list item."""
    ingredient_name: Optional[str] = Field(None, min_length=1, max_length=255)
    quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    category: Optional[ShoppingListItemCategory] = None
    is_purchased: Optional[bool] = None


class ShoppingListItemResponse(BaseModel):
    """Response schema for shopping list item."""
    id: UUID
    shopping_list_id: UUID
    ingredient_name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    is_purchased: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Shopping List Schemas ====================

class ShoppingListBase(BaseModel):
    """Base shopping list schema."""
    name: str = Field(..., min_length=1, max_length=255, description="Name of the shopping list")
    estimated_cost: Optional[float] = Field(None, ge=0, description="Estimated total cost")


class ShoppingListCreate(ShoppingListBase):
    """Schema for creating a shopping list."""
    items: Optional[List[ShoppingListItemCreate]] = Field(default=None, description="Initial items for the list")


class ShoppingListUpdate(BaseModel):
    """Schema for updating a shopping list."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    estimated_cost: Optional[float] = Field(None, ge=0)
    status: Optional[ShoppingListStatus] = None
    is_archived: Optional[bool] = None


class ShoppingListResponse(BaseModel):
    """Response schema for shopping list."""
    id: UUID
    user_id: UUID
    name: str
    status: str
    estimated_cost: Optional[float] = None
    completed_at: Optional[datetime] = None
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    items: List[ShoppingListItemResponse] = []
    # Computed fields
    total_items: int = 0
    purchased_items: int = 0

    class Config:
        from_attributes = True


class ShoppingListSummaryResponse(BaseModel):
    """Summary response for shopping list (without items)."""
    id: UUID
    user_id: UUID
    name: str
    status: str
    estimated_cost: Optional[float] = None
    completed_at: Optional[datetime] = None
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    total_items: int = 0
    purchased_items: int = 0

    class Config:
        from_attributes = True


class ShoppingListListResponse(BaseModel):
    """Paginated list of shopping lists response."""
    items: List[ShoppingListSummaryResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class ShoppingListFilters(BaseModel):
    """Query parameters for filtering shopping lists."""
    search: Optional[str] = Field(None, description="Search in list name")
    status: Optional[ShoppingListStatus] = Field(None, description="Filter by status")
    is_archived: Optional[bool] = Field(False, description="Include archived lists")
    date_from: Optional[date] = Field(None, description="Created date from")
    date_to: Optional[date] = Field(None, description="Created date to")
    sort_by: Optional[str] = Field("created_at", description="Sort field")
    sort_order: Optional[str] = Field("desc", description="Sort order (asc/desc)")
    page: int = Field(1, ge=1, description="Page number")
    per_page: int = Field(50, ge=1, le=100, description="Items per page")


# ==================== Bulk Action Schemas ====================

class BulkActionRequest(BaseModel):
    """Request for bulk operations."""
    ids: List[UUID] = Field(..., min_length=1, description="List of shopping list IDs")


class BulkActionResponse(BaseModel):
    """Response for bulk operations."""
    success: bool
    affected_count: int
    message: str


class AddItemsRequest(BaseModel):
    """Request to add multiple items to a shopping list."""
    items: List[ShoppingListItemCreate] = Field(..., min_length=1, description="Items to add")


class ToggleItemsRequest(BaseModel):
    """Request to toggle purchased status for multiple items."""
    item_ids: List[UUID] = Field(..., min_length=1, description="Item IDs to toggle")
    is_purchased: bool = Field(..., description="New purchased status")


# ==================== Analytics Schemas ====================

class ShoppingListAnalytics(BaseModel):
    """Analytics data for shopping lists."""
    total_lists: int = Field(..., description="Total shopping lists")
    active_lists: int = Field(..., description="Currently active lists")
    completed_lists: int = Field(..., description="Completed lists")
    lists_this_week: int = Field(..., description="Lists created this week")
    lists_this_month: int = Field(..., description="Lists created this month")
    total_items_purchased: int = Field(..., description="Total items purchased across all lists")
    avg_items_per_list: float = Field(..., description="Average items per list")
    avg_completion_rate: float = Field(..., description="Average completion rate (0-100)")
    category_breakdown: dict = Field(..., description="Item count by category")
    completion_trend: dict = Field(..., description="Completion rate over time")
    recent_lists: List[ShoppingListSummaryResponse] = Field(..., description="Recently created lists")


class MonthlyShoppingData(BaseModel):
    """Monthly statistics data for shopping lists."""
    month: str = Field(..., description="Month in YYYY-MM format")
    month_label: str = Field(..., description="Human readable month label")
    total_lists: int = Field(..., description="Total lists created")
    completed_lists: int = Field(..., description="Lists completed")
    total_items: int = Field(..., description="Total items across lists")
    purchased_items: int = Field(..., description="Items purchased")
    completion_rate: float = Field(..., description="Completion rate percentage")
    category_breakdown: dict = Field(..., description="Item count by category")


class TopShoppingItem(BaseModel):
    """Top item from shopping lists."""
    item_name: str
    occurrence_count: int
    purchase_count: int
    last_added: date


class ShoppingListHistory(BaseModel):
    """Historical analytics data for shopping lists."""
    period_months: int = Field(..., description="Number of months in the history")
    total_lists: int = Field(..., description="Total lists in period")
    completed_lists: int = Field(..., description="Completed lists in period")
    total_items: int = Field(..., description="Total items in period")
    purchased_items: int = Field(..., description="Purchased items in period")
    avg_monthly_lists: float = Field(..., description="Average lists per month")
    avg_completion_rate: float = Field(..., description="Average completion rate")
    monthly_data: List[MonthlyShoppingData] = Field(..., description="Month by month breakdown")
    top_items: List[TopShoppingItem] = Field(..., description="Most frequently added items")
    category_trends: dict = Field(..., description="Category breakdown over time")


# ==================== Suggestions Schema ====================

class SuggestedItem(BaseModel):
    """Suggested item based on purchase history."""
    item_name: str
    category: Optional[str] = None
    frequency: int = Field(..., description="How often this item was purchased")
    last_purchased: Optional[date] = None
    avg_quantity: Optional[float] = None
    common_unit: Optional[str] = None


class SuggestionsResponse(BaseModel):
    """Response with suggested items."""
    suggestions: List[SuggestedItem]
    based_on_months: int


# ==================== Import/Parse Schemas ====================

class ParseShoppingListTextRequest(BaseModel):
    """Request for parsing shopping list items from text."""
    text: str = Field(..., min_length=1, description="Text to parse")


class ParseShoppingListResponse(BaseModel):
    """Response from parsing shopping list items."""
    parsed_items: List[ShoppingListItemCreate]
    raw_text: Optional[str] = None
    success: bool = True
    message: Optional[str] = None
