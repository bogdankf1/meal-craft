"""Shopping Lists API routes - Full CRUD implementation.

Thin route handlers: validate the request (via the FastAPI signature) and
delegate to ``service``.
"""
from fastapi import APIRouter, Depends, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import date
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.api.v1.routes.shopping_lists import service
from app.api.v1.routes.shopping_lists.schemas import (
    ShoppingListCreate,
    ShoppingListUpdate,
    ShoppingListResponse,
    ShoppingListListResponse,
    ShoppingListItemUpdate,
    ShoppingListItemResponse,
    BulkActionRequest,
    BulkActionResponse,
    AddItemsRequest,
    ToggleItemsRequest,
    ShoppingListAnalytics,
    ShoppingListHistory,
    SuggestionsResponse,
    ParseShoppingListTextRequest,
    ParseShoppingListResponse,
)

router = APIRouter()


@router.get("", response_model=ShoppingListListResponse)
async def list_shopping_lists(
    search: Optional[str] = Query(None, description="Search in list name"),
    status: Optional[str] = Query(None, description="Filter by status (active, completed, archived)"),
    is_archived: bool = Query(False, description="Include archived lists"),
    date_from: Optional[date] = Query(None, description="Created date from"),
    date_to: Optional[date] = Query(None, description="Created date to"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List shopping lists with filters, sorting, and pagination."""
    return await service.list_shopping_lists(
        db,
        current_user,
        search=search,
        status=status,
        is_archived=is_archived,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=ShoppingListResponse, status_code=status.HTTP_201_CREATED)
async def create_shopping_list(
    request: ShoppingListCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new shopping list with optional initial items."""
    return await service.create_shopping_list(db, current_user, request)


@router.get("/analytics", response_model=ShoppingListAnalytics)
async def get_shopping_list_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get shopping list analytics data."""
    return await service.get_shopping_list_analytics(db, current_user)


@router.get("/history", response_model=ShoppingListHistory)
async def get_shopping_list_history(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get historical shopping list analytics."""
    return await service.get_shopping_list_history(db, current_user, months=months)


@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(
    months: int = Query(3, ge=1, le=12, description="Months to analyze for suggestions"),
    limit: int = Query(20, ge=1, le=50, description="Max suggestions to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get item suggestions based on grocery purchase history."""
    return await service.get_suggestions(db, current_user, months=months, limit=limit)


# ==================== Import/Parse Endpoints ====================


@router.post("/parse-text", response_model=ParseShoppingListResponse)
async def parse_shopping_list_text(
    request: ParseShoppingListTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse shopping list items from text using AI."""
    return await service.parse_shopping_list_text(db, current_user, request)


@router.post("/parse-voice", response_model=ParseShoppingListResponse)
async def parse_shopping_list_voice(
    audio: UploadFile = File(...),
    language: str = Form(default="auto"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse shopping list items from voice recording using AI transcription."""
    return await service.parse_shopping_list_voice(db, current_user, audio, language=language)


@router.post("/parse-image", response_model=ParseShoppingListResponse)
async def parse_shopping_list_image(
    image: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None),
    import_type: str = Form(default="shopping_list"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse shopping list items from image (handwritten list, screenshot, etc.)."""
    return await service.parse_shopping_list_image(
        db,
        current_user,
        image=image,
        images=images,
        import_type=import_type,
    )


@router.get("/{list_id}", response_model=ShoppingListResponse)
async def get_shopping_list(
    list_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single shopping list by ID with all items."""
    return await service.get_shopping_list(db, current_user, list_id)


@router.put("/{list_id}", response_model=ShoppingListResponse)
async def update_shopping_list(
    list_id: UUID,
    request: ShoppingListUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a shopping list."""
    return await service.update_shopping_list(db, current_user, list_id, request)


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shopping_list(
    list_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a shopping list and all its items."""
    await service.delete_shopping_list(db, current_user, list_id)


# ==================== Item Management ====================

@router.post("/{list_id}/items", response_model=List[ShoppingListItemResponse], status_code=status.HTTP_201_CREATED)
async def add_items_to_list(
    list_id: UUID,
    request: AddItemsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add items to a shopping list."""
    return await service.add_items_to_list(db, current_user, list_id, request)


@router.put("/{list_id}/items/{item_id}", response_model=ShoppingListItemResponse)
async def update_item(
    list_id: UUID,
    item_id: UUID,
    request: ShoppingListItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a shopping list item."""
    return await service.update_item(db, current_user, list_id, item_id, request)


@router.delete("/{list_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    list_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a shopping list item."""
    await service.delete_item(db, current_user, list_id, item_id)


@router.post("/{list_id}/toggle-items", response_model=BulkActionResponse)
async def toggle_items_purchased(
    list_id: UUID,
    request: ToggleItemsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle purchased status for multiple items."""
    return await service.toggle_items_purchased(db, current_user, list_id, request)


# ==================== Bulk Operations ====================

@router.post("/bulk-archive", response_model=BulkActionResponse)
async def bulk_archive_lists(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive multiple shopping lists."""
    return await service.bulk_archive_lists(db, current_user, request)


@router.post("/bulk-unarchive", response_model=BulkActionResponse)
async def bulk_unarchive_lists(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unarchive multiple shopping lists."""
    return await service.bulk_unarchive_lists(db, current_user, request)


@router.post("/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_lists(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple shopping lists."""
    return await service.bulk_delete_lists(db, current_user, request)


@router.post("/bulk-complete", response_model=BulkActionResponse)
async def bulk_complete_lists(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark multiple shopping lists as completed."""
    return await service.bulk_complete_lists(db, current_user, request)
