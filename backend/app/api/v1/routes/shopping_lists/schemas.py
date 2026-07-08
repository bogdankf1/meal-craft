"""Shopping list request/response schemas.

The shopping list Pydantic models are defined centrally in
``app.schemas.shopping_lists``. This module re-exports them so the shopping_lists
package follows the same router / service / schemas layout as the other feature
packages, while keeping a single source of truth.
"""
from app.schemas.shopping_lists import (
    ShoppingListCreate,
    ShoppingListUpdate,
    ShoppingListResponse,
    ShoppingListSummaryResponse,
    ShoppingListListResponse,
    ShoppingListItemCreate,
    ShoppingListItemUpdate,
    ShoppingListItemResponse,
    BulkActionRequest,
    BulkActionResponse,
    AddItemsRequest,
    ToggleItemsRequest,
    ShoppingListAnalytics,
    ShoppingListHistory,
    MonthlyShoppingData,
    TopShoppingItem,
    SuggestedItem,
    SuggestionsResponse,
    ParseShoppingListTextRequest,
    ParseShoppingListResponse,
    ShoppingListItemCategory,
)

__all__ = [
    "ShoppingListCreate",
    "ShoppingListUpdate",
    "ShoppingListResponse",
    "ShoppingListSummaryResponse",
    "ShoppingListListResponse",
    "ShoppingListItemCreate",
    "ShoppingListItemUpdate",
    "ShoppingListItemResponse",
    "BulkActionRequest",
    "BulkActionResponse",
    "AddItemsRequest",
    "ToggleItemsRequest",
    "ShoppingListAnalytics",
    "ShoppingListHistory",
    "MonthlyShoppingData",
    "TopShoppingItem",
    "SuggestedItem",
    "SuggestionsResponse",
    "ParseShoppingListTextRequest",
    "ParseShoppingListResponse",
    "ShoppingListItemCategory",
]
