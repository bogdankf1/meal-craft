"""Groceries API routes.

Thin route handlers: validate the request (via the FastAPI signature) and
delegate to ``service``. Ownership lookups live in the service layer via
``get_owned_or_404``.
"""

from typing import Optional, List
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.api.v1.routes.groceries import service
from app.api.v1.routes.groceries.schemas import (
    GroceryBatchCreate,
    GroceryUpdate,
    GroceryResponse,
    GroceryListResponse,
    BulkActionRequest,
    BulkActionResponse,
    GroceryAnalytics,
    ParseTextResponse,
    ParseTextRequest,
    ParseReceiptUrlRequest,
    GroceryHistory,
    BarcodeLookupResponse,
    MarkAsWastedRequest,
    BulkMarkAsWastedRequest,
    WasteAnalytics,
    MoveToPantryRequest,
    BulkMoveToPantryRequest,
    MoveToPantryResponse,
)

router = APIRouter()


@router.get("", response_model=GroceryListResponse)
async def list_groceries(
    search: Optional[str] = Query(None, description="Search in item name"),
    category: Optional[str] = Query(None, description="Filter by category"),
    store: Optional[str] = Query(None, description="Filter by store"),
    is_archived: bool = Query(False, description="Include archived items"),
    date_from: Optional[date] = Query(None, description="Purchase date from"),
    date_to: Optional[date] = Query(None, description="Purchase date to"),
    expiring_within_days: Optional[int] = Query(None, ge=0, description="Items expiring within N days"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List groceries with filters, sorting, and pagination."""
    return await service.list_groceries(
        db,
        current_user,
        search=search,
        category=category,
        store=store,
        is_archived=is_archived,
        date_from=date_from,
        date_to=date_to,
        expiring_within_days=expiring_within_days,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=List[GroceryResponse], status_code=status.HTTP_201_CREATED)
async def create_groceries(
    request: GroceryBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create one or more grocery items."""
    return await service.create_groceries(db, current_user, request)


@router.get("/analytics", response_model=GroceryAnalytics)
async def get_grocery_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get grocery analytics data."""
    return await service.get_grocery_analytics(db, current_user)


@router.get("/history", response_model=GroceryHistory)
async def get_grocery_history(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze (1-24)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get historical grocery analytics for the specified number of months."""
    return await service.get_grocery_history(db, current_user, months=months)


@router.get("/{grocery_id}", response_model=GroceryResponse)
async def get_grocery(
    grocery_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single grocery item by ID."""
    return await service.get_grocery(db, current_user, grocery_id)


@router.put("/{grocery_id}", response_model=GroceryResponse)
async def update_grocery(
    grocery_id: UUID,
    request: GroceryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a grocery item."""
    return await service.update_grocery(db, current_user, grocery_id, request)


@router.delete("/{grocery_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grocery(
    grocery_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a grocery item."""
    await service.delete_grocery(db, current_user, grocery_id)


@router.post("/bulk-archive", response_model=BulkActionResponse)
async def bulk_archive_groceries(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive multiple grocery items."""
    return await service.bulk_archive_groceries(db, current_user, request)


@router.post("/bulk-unarchive", response_model=BulkActionResponse)
async def bulk_unarchive_groceries(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unarchive multiple grocery items."""
    return await service.bulk_unarchive_groceries(db, current_user, request)


@router.post("/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_groceries(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple grocery items."""
    return await service.bulk_delete_groceries(db, current_user, request)


@router.post("/{grocery_id}/waste", response_model=GroceryResponse)
async def mark_as_wasted(
    grocery_id: UUID,
    request: MarkAsWastedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a grocery item as wasted."""
    return await service.mark_as_wasted(db, current_user, grocery_id, request)


@router.post("/bulk-waste", response_model=BulkActionResponse)
async def bulk_mark_as_wasted(
    request: BulkMarkAsWastedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark multiple grocery items as wasted."""
    return await service.bulk_mark_as_wasted(db, current_user, request)


@router.post("/{grocery_id}/unwaste", response_model=GroceryResponse)
async def unmark_as_wasted(
    grocery_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove wasted status from a grocery item."""
    return await service.unmark_as_wasted(db, current_user, grocery_id)


@router.get("/waste/analytics", response_model=WasteAnalytics)
async def get_waste_analytics(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get waste analytics data with trends and suggestions."""
    return await service.get_waste_analytics(db, current_user, months=months)


@router.post("/parse-text", response_model=ParseTextResponse)
async def parse_grocery_text(
    request: ParseTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse grocery items from text using AI."""
    return await service.parse_grocery_text(db, current_user, request)


@router.post("/parse-voice", response_model=ParseTextResponse)
async def parse_grocery_voice(
    audio: UploadFile = File(...),
    language: str = Form(default="auto"),
    default_purchase_date: Optional[date] = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse grocery items from voice recording using AI transcription."""
    return await service.parse_grocery_voice(
        db,
        current_user,
        audio,
        language=language,
        default_purchase_date=default_purchase_date,
    )


@router.post("/parse-receipt-url", response_model=ParseTextResponse)
async def parse_receipt_url(
    request: ParseReceiptUrlRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse grocery items from a digital receipt URL."""
    return await service.parse_receipt_url(db, current_user, request)


@router.post("/parse-image", response_model=ParseTextResponse)
async def parse_grocery_image(
    image: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None),
    import_type: str = Form(default="delivery_app"),
    default_purchase_date: Optional[date] = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse grocery items from image(s) using AI vision."""
    return await service.parse_grocery_image(
        db,
        current_user,
        image=image,
        images=images,
        import_type=import_type,
        default_purchase_date=default_purchase_date,
    )


# ============ Move to Pantry ============

@router.post("/{grocery_id}/move-to-pantry", response_model=MoveToPantryResponse)
async def move_to_pantry(
    grocery_id: UUID,
    request: MoveToPantryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move a grocery item to pantry (archives the grocery and creates pantry item)."""
    return await service.move_to_pantry(db, current_user, grocery_id, request)


@router.post("/bulk-move-to-pantry", response_model=MoveToPantryResponse)
async def bulk_move_to_pantry(
    request: BulkMoveToPantryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move multiple grocery items to pantry."""
    return await service.bulk_move_to_pantry(db, current_user, request)


@router.get("/lookup-barcode/{barcode}", response_model=BarcodeLookupResponse)
async def lookup_barcode(
    barcode: str,
    current_user: User = Depends(get_current_user),
):
    """
    Look up product information by barcode using Open Food Facts API.
    Returns product name, brand, category, and other details if found.
    """
    return await service.lookup_barcode(barcode)
