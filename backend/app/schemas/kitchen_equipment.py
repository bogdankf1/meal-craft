"""Kitchen Equipment Schemas"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


class EquipmentCategory(str, Enum):
    """Equipment category enum."""
    COOKWARE = "cookware"
    BAKEWARE = "bakeware"
    APPLIANCES = "appliances"
    KNIVES_CUTTING = "knives_cutting"
    UTENSILS = "utensils"
    STORAGE = "storage"
    SMALL_TOOLS = "small_tools"
    SPECIALTY = "specialty"
    OTHER = "other"


class EquipmentCondition(str, Enum):
    """Equipment condition enum."""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    NEEDS_REPAIR = "needs_repair"
    REPLACE_SOON = "replace_soon"


class EquipmentLocation(str, Enum):
    """Equipment storage location enum."""
    KITCHEN_DRAWER = "kitchen_drawer"
    CABINET = "cabinet"
    COUNTERTOP = "countertop"
    PANTRY = "pantry"
    STORAGE = "storage"
    OTHER = "other"


# ============ Create/Update Schemas ============

class KitchenEquipmentCreate(BaseModel):
    """Schema for creating kitchen equipment."""
    name: str = Field(..., min_length=1, max_length=255)
    category: Optional[EquipmentCategory] = None
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    condition: Optional[EquipmentCondition] = EquipmentCondition.GOOD
    location: Optional[EquipmentLocation] = EquipmentLocation.CABINET
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    last_maintenance_date: Optional[date] = None
    maintenance_interval_days: Optional[int] = Field(None, ge=1)
    maintenance_notes: Optional[str] = None
    notes: Optional[str] = None


class KitchenEquipmentBatchCreate(BaseModel):
    """Schema for batch creating kitchen equipment."""
    items: List[KitchenEquipmentCreate] = Field(..., min_length=1)


class KitchenEquipmentUpdate(BaseModel):
    """Schema for updating kitchen equipment."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[EquipmentCategory] = None
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    condition: Optional[EquipmentCondition] = None
    location: Optional[EquipmentLocation] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    last_maintenance_date: Optional[date] = None
    maintenance_interval_days: Optional[int] = Field(None, ge=1)
    maintenance_notes: Optional[str] = None
    notes: Optional[str] = None
    is_archived: Optional[bool] = None


# ============ Response Schemas ============

class KitchenEquipmentResponse(BaseModel):
    """Schema for kitchen equipment response."""
    id: UUID
    user_id: UUID
    name: str
    category: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    last_maintenance_date: Optional[date] = None
    maintenance_interval_days: Optional[int] = None
    maintenance_notes: Optional[str] = None
    notes: Optional[str] = None
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    # Computed fields
    needs_maintenance: bool = False
    days_until_maintenance: Optional[int] = None

    class Config:
        from_attributes = True


class KitchenEquipmentListResponse(BaseModel):
    """Schema for paginated kitchen equipment list response."""
    items: List[KitchenEquipmentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ Filter Schemas ============

class KitchenEquipmentFilters(BaseModel):
    """Schema for kitchen equipment filters."""
    search: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    is_archived: Optional[bool] = None
    needs_maintenance: Optional[bool] = None
    page: int = 1
    per_page: int = 20
    sort_by: str = "created_at"
    sort_order: str = "desc"


# ============ Bulk Action Schemas ============

class BulkActionRequest(BaseModel):
    """Request for bulk operations."""
    ids: List[UUID] = Field(..., min_length=1, description="List of equipment IDs")


class BulkActionResponse(BaseModel):
    """Response for bulk operations."""
    success: bool
    affected_count: int
    message: str


# ============ Maintenance Schemas ============

class RecordMaintenanceRequest(BaseModel):
    """Request to record maintenance for equipment."""
    maintenance_date: date = Field(..., description="Date maintenance was performed")
    maintenance_notes: Optional[str] = Field(None, max_length=500, description="Notes about the maintenance")


class BulkRecordMaintenanceRequest(BaseModel):
    """Request to record maintenance for multiple equipment items."""
    ids: List[UUID] = Field(..., min_length=1, description="List of equipment IDs")
    maintenance_date: date = Field(..., description="Date maintenance was performed")
    maintenance_notes: Optional[str] = Field(None, max_length=500, description="Notes about the maintenance")


# ============ Analytics Schemas ============

class EquipmentByCategory(BaseModel):
    """Equipment breakdown by category."""
    category: str
    count: int


class EquipmentByCondition(BaseModel):
    """Equipment breakdown by condition."""
    condition: str
    count: int


class EquipmentByLocation(BaseModel):
    """Equipment breakdown by location."""
    location: str
    count: int


class MaintenanceItem(BaseModel):
    """Equipment item needing maintenance."""
    id: UUID
    name: str
    category: Optional[str] = None
    last_maintenance_date: Optional[date] = None
    days_overdue: int
    maintenance_notes: Optional[str] = None

    class Config:
        from_attributes = True


class MaintenanceAnalytics(BaseModel):
    """Maintenance analytics data."""
    total_equipment: int = Field(..., description="Total equipment count")
    needs_maintenance: int = Field(..., description="Equipment needing maintenance")
    maintenance_rate: float = Field(..., description="Percentage of equipment needing maintenance")
    overdue_items: List[MaintenanceItem] = Field(..., description="Items overdue for maintenance")
    upcoming_items: List[MaintenanceItem] = Field(..., description="Items with upcoming maintenance")


class KitchenEquipmentAnalytics(BaseModel):
    """Kitchen equipment analytics data."""
    total_items: int = Field(..., description="Total number of equipment items")
    items_by_category: List[EquipmentByCategory] = Field(..., description="Breakdown by category")
    items_by_condition: List[EquipmentByCondition] = Field(..., description="Breakdown by condition")
    items_by_location: List[EquipmentByLocation] = Field(..., description="Breakdown by location")
    needs_maintenance: int = Field(..., description="Items needing maintenance")
    needs_repair: int = Field(..., description="Items needing repair")
    total_value: Decimal = Field(..., description="Total value of equipment")
    recently_added: List[KitchenEquipmentResponse] = Field(..., description="Recently added items")
    maintenance: MaintenanceAnalytics = Field(..., description="Maintenance analytics")


# ============ History Schemas ============

class MonthlyEquipmentData(BaseModel):
    """Monthly equipment statistics."""
    month: str = Field(..., description="Month in YYYY-MM format")
    month_label: str = Field(..., description="Human readable month label")
    total_items: int = Field(..., description="Total items added")
    total_value: Decimal = Field(..., description="Total value of items added")
    category_breakdown: dict = Field(..., description="Breakdown by category")


class KitchenEquipmentHistory(BaseModel):
    """Kitchen equipment history data."""
    period_months: int
    total_items: int
    total_value: Decimal
    avg_monthly_items: float
    monthly_data: List[MonthlyEquipmentData]
    category_trends: dict = Field(..., description="Category trends over time")


# ============ Parse Schemas ============

class ParseTextRequest(BaseModel):
    """Request to parse text for kitchen equipment."""
    text: str = Field(..., min_length=1)
    default_category: Optional[EquipmentCategory] = None
    default_location: Optional[EquipmentLocation] = EquipmentLocation.CABINET


class ParseTextResponse(BaseModel):
    """Response from text parsing."""
    parsed_items: List[KitchenEquipmentCreate]
    raw_text: str
    success: bool
    message: Optional[str] = None
