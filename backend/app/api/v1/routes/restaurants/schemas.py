"""Restaurant request/response schemas.

The restaurant Pydantic models are defined centrally in ``app.schemas.restaurant``
(they are also consumed by ``app.services.ai_service``). This module re-exports
them so the restaurants package follows the same router / service / schemas layout
as the other feature packages, while keeping a single source of truth.
"""
from app.schemas.restaurant import (
    # Restaurant schemas
    RestaurantCreate,
    RestaurantUpdate,
    RestaurantResponse,
    RestaurantListResponse,
    RestaurantFilters,
    # Meal schemas
    RestaurantMealCreate,
    RestaurantMealBatchCreate,
    RestaurantMealUpdate,
    RestaurantMealResponse,
    RestaurantMealListResponse,
    RestaurantMealFilters,
    # Bulk actions
    BulkActionRequest,
    BulkActionResponse,
    # Analytics
    RestaurantMealAnalytics,
    MealsByOrderType,
    MealsByMealType,
    TopRestaurant,
    MealsByTag,
    HomeVsOutRatio,
    RestaurantMealHistory,
    MonthlyMealData,
    # Import
    ParseTextRequest,
    ParseTextResponse,
    MealType,
    OrderType,
    ImportSource,
)

__all__ = [
    "RestaurantCreate",
    "RestaurantUpdate",
    "RestaurantResponse",
    "RestaurantListResponse",
    "RestaurantFilters",
    "RestaurantMealCreate",
    "RestaurantMealBatchCreate",
    "RestaurantMealUpdate",
    "RestaurantMealResponse",
    "RestaurantMealListResponse",
    "RestaurantMealFilters",
    "BulkActionRequest",
    "BulkActionResponse",
    "RestaurantMealAnalytics",
    "MealsByOrderType",
    "MealsByMealType",
    "TopRestaurant",
    "MealsByTag",
    "HomeVsOutRatio",
    "RestaurantMealHistory",
    "MonthlyMealData",
    "ParseTextRequest",
    "ParseTextResponse",
    "MealType",
    "OrderType",
    "ImportSource",
]
