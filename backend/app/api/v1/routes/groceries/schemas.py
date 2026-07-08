"""Grocery request/response schemas.

Most grocery Pydantic models are defined centrally in ``app.schemas.groceries``;
this module re-exports them so the groceries package follows the same
router / service / schemas layout as the other feature packages, while keeping a
single source of truth. The move-to-pantry request/response models were defined
inline in the original flat route module and are kept here verbatim.
"""
from typing import List
from uuid import UUID

from pydantic import BaseModel

from app.schemas.groceries import (
    GroceryCreate,
    GroceryBatchCreate,
    GroceryUpdate,
    GroceryResponse,
    GroceryListResponse,
    GroceryFilters,
    BulkActionRequest,
    BulkActionResponse,
    GroceryAnalytics,
    ParseTextRequest,
    ParseTextResponse,
    ParseReceiptUrlRequest,
    GroceryHistory,
    MonthlyData,
    TopItem,
    BarcodeLookupResponse,
    MarkAsWastedRequest,
    BulkMarkAsWastedRequest,
    WasteAnalytics,
    WastedItem,
    WasteByReason,
    WasteByCategory,
    MonthlyWasteData,
)


# ============ Move to Pantry ============

class MoveToPantryRequest(BaseModel):
    """Request to move a grocery item to pantry."""
    storage_location: str = "pantry"


class BulkMoveToPantryRequest(BaseModel):
    """Request to move multiple grocery items to pantry."""
    ids: List[UUID]
    storage_location: str = "pantry"


class MoveToPantryResponse(BaseModel):
    """Response from moving items to pantry."""
    success: bool
    moved_count: int
    message: str


__all__ = [
    "GroceryCreate",
    "GroceryBatchCreate",
    "GroceryUpdate",
    "GroceryResponse",
    "GroceryListResponse",
    "GroceryFilters",
    "BulkActionRequest",
    "BulkActionResponse",
    "GroceryAnalytics",
    "ParseTextRequest",
    "ParseTextResponse",
    "ParseReceiptUrlRequest",
    "GroceryHistory",
    "MonthlyData",
    "TopItem",
    "BarcodeLookupResponse",
    "MarkAsWastedRequest",
    "BulkMarkAsWastedRequest",
    "WasteAnalytics",
    "WastedItem",
    "WasteByReason",
    "WasteByCategory",
    "MonthlyWasteData",
    "MoveToPantryRequest",
    "BulkMoveToPantryRequest",
    "MoveToPantryResponse",
]
