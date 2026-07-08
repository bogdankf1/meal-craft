"""Restaurant Meals API routes - Full CRUD implementation.

Thin route handlers: validate the request (via the FastAPI signature) and
delegate to ``service``. Ownership lookups live in the service layer via
``get_owned_or_404``.
"""
from fastapi import APIRouter, Depends, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import date
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.api.v1.routes.restaurants import service
from app.api.v1.routes.restaurants.schemas import (
    # Restaurant schemas
    RestaurantCreate,
    RestaurantUpdate,
    RestaurantResponse,
    RestaurantListResponse,
    # Meal schemas
    RestaurantMealBatchCreate,
    RestaurantMealUpdate,
    RestaurantMealResponse,
    RestaurantMealListResponse,
    # Bulk actions
    BulkActionRequest,
    BulkActionResponse,
    # Analytics
    RestaurantMealAnalytics,
    RestaurantMealHistory,
    # Import
    ParseTextRequest,
    ParseTextResponse,
)

router = APIRouter()


# ============ Restaurant Meals CRUD ============

@router.get("/meals", response_model=RestaurantMealListResponse)
async def list_restaurant_meals(
    search: Optional[str] = Query(None, description="Search in restaurant name, items, description"),
    restaurant_id: Optional[UUID] = Query(None, description="Filter by restaurant"),
    meal_type: Optional[str] = Query(None, description="Filter by meal type"),
    order_type: Optional[str] = Query(None, description="Filter by order type"),
    rating_min: Optional[int] = Query(None, ge=1, le=5, description="Minimum rating"),
    rating_max: Optional[int] = Query(None, ge=1, le=5, description="Maximum rating"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    date_from: Optional[date] = Query(None, description="Date from"),
    date_to: Optional[date] = Query(None, description="Date to"),
    is_archived: bool = Query(False, description="Include archived items"),
    sort_by: str = Query("meal_date", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List restaurant meals with filters, sorting, and pagination."""
    return await service.list_restaurant_meals(
        db,
        current_user,
        search=search,
        restaurant_id=restaurant_id,
        meal_type=meal_type,
        order_type=order_type,
        rating_min=rating_min,
        rating_max=rating_max,
        tags=tags,
        date_from=date_from,
        date_to=date_to,
        is_archived=is_archived,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


@router.post("/meals", response_model=List[RestaurantMealResponse], status_code=status.HTTP_201_CREATED)
async def create_restaurant_meals(
    request: RestaurantMealBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create one or more restaurant meals with automatic nutrition estimation."""
    return await service.create_restaurant_meals(db, current_user, request)


@router.get("/meals/analytics", response_model=RestaurantMealAnalytics)
async def get_restaurant_meal_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get restaurant meal analytics data."""
    return await service.get_restaurant_meal_analytics(db, current_user)


@router.get("/meals/history", response_model=RestaurantMealHistory)
async def get_restaurant_meal_history(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get historical restaurant meal analytics."""
    return await service.get_restaurant_meal_history(db, current_user, months=months)


@router.get("/meals/{meal_id}", response_model=RestaurantMealResponse)
async def get_restaurant_meal(
    meal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single restaurant meal by ID."""
    return await service.get_restaurant_meal(db, current_user, meal_id)


@router.put("/meals/{meal_id}", response_model=RestaurantMealResponse)
async def update_restaurant_meal(
    meal_id: UUID,
    request: RestaurantMealUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a restaurant meal."""
    return await service.update_restaurant_meal(db, current_user, meal_id, request)


@router.post("/meals/{meal_id}/calculate-nutrition", response_model=RestaurantMealResponse)
async def calculate_restaurant_meal_nutrition(
    meal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate or recalculate nutrition for a restaurant meal using AI."""
    return await service.calculate_restaurant_meal_nutrition(db, current_user, meal_id)


@router.delete("/meals/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_restaurant_meal(
    meal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a restaurant meal."""
    await service.delete_restaurant_meal(db, current_user, meal_id)


# ============ Bulk Actions ============

@router.post("/meals/bulk-archive", response_model=BulkActionResponse)
async def bulk_archive_meals(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive multiple restaurant meals."""
    return await service.bulk_archive_meals(db, current_user, request)


@router.post("/meals/bulk-unarchive", response_model=BulkActionResponse)
async def bulk_unarchive_meals(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unarchive multiple restaurant meals."""
    return await service.bulk_unarchive_meals(db, current_user, request)


@router.post("/meals/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_meals(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple restaurant meals."""
    return await service.bulk_delete_meals(db, current_user, request)


# ============ Import Endpoints ============

@router.post("/meals/parse-text", response_model=ParseTextResponse)
async def parse_meal_text(
    request: ParseTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse restaurant meal from text input.

    Supports multiple formats:
    - Each line is a separate meal: "McDonald's: bigmac, fries"
    - With meal type: "McDonald's - lunch, delivery - bigmac, fries"
    - Simple format: "McDonald's bigmac fries"
    """
    return await service.parse_meal_text(db, current_user, request)


@router.post("/meals/parse-voice", response_model=ParseTextResponse)
async def parse_meal_voice(
    audio: UploadFile = File(...),
    language: str = Form(default="auto"),
    default_date: Optional[date] = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse restaurant meal from voice recording using AI transcription."""
    return await service.parse_meal_voice(
        db,
        current_user,
        audio,
        language=language,
        default_date=default_date,
    )


@router.post("/meals/parse-image", response_model=ParseTextResponse)
async def parse_meal_image(
    image: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None),
    import_type: str = Form(default="food"),  # food, receipt, app_screenshot
    default_date: Optional[date] = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse restaurant meal from image(s) using AI vision."""
    return await service.parse_meal_image(
        db,
        current_user,
        image=image,
        images=images,
        import_type=import_type,
        default_date=default_date,
    )


# ============ Restaurants (Places) CRUD ============

@router.get("", response_model=RestaurantListResponse)
async def list_restaurants(
    search: Optional[str] = Query(None, description="Search in name, cuisine, location"),
    cuisine_type: Optional[str] = Query(None, description="Filter by cuisine type"),
    is_favorite: Optional[bool] = Query(None, description="Filter favorites only"),
    is_archived: bool = Query(False, description="Include archived items"),
    sort_by: str = Query("name", description="Sort field"),
    sort_order: str = Query("asc", description="Sort order (asc/desc)"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List saved restaurants."""
    return await service.list_restaurants(
        db,
        current_user,
        search=search,
        cuisine_type=cuisine_type,
        is_favorite=is_favorite,
        is_archived=is_archived,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED)
async def create_restaurant(
    request: RestaurantCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new restaurant."""
    return await service.create_restaurant(db, current_user, request)


@router.get("/{restaurant_id}", response_model=RestaurantResponse)
async def get_restaurant(
    restaurant_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single restaurant by ID."""
    return await service.get_restaurant(db, current_user, restaurant_id)


@router.put("/{restaurant_id}", response_model=RestaurantResponse)
async def update_restaurant(
    restaurant_id: UUID,
    request: RestaurantUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a restaurant."""
    return await service.update_restaurant(db, current_user, restaurant_id, request)


@router.delete("/{restaurant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_restaurant(
    restaurant_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a restaurant."""
    await service.delete_restaurant(db, current_user, restaurant_id)
