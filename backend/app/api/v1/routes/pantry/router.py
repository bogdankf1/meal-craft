"""Pantry API routes.

Thin route handlers: validate the request (via the FastAPI signature) and
delegate to ``service``.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.api.v1.routes.pantry import service
from app.api.v1.routes.pantry.schemas import (
    PantryItemBatchCreate,
    PantryItemUpdate,
    PantryItemResponse,
    PantryItemListResponse,
    BulkActionRequest,
    BulkActionResponse,
    PantryAnalytics,
    PantryHistory,
    MarkAsWastedRequest,
    BulkMarkAsWastedRequest,
    WasteAnalytics,
    ParseTextRequest,
    ParseTextResponse,
    PantryTransactionResponse,
    PantryTransactionListResponse,
)

router = APIRouter(prefix="/pantry", tags=["pantry"])


# ============ CRUD Operations ============

@router.get("", response_model=PantryItemListResponse)
async def list_pantry_items(
    search: Optional[str] = None,
    category: Optional[str] = None,
    storage_location: Optional[str] = None,
    is_archived: Optional[bool] = False,
    expiring_within_days: Optional[int] = None,
    low_stock: Optional[bool] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List pantry items with filters and pagination."""
    return await service.list_pantry_items(
        db,
        current_user,
        search=search,
        category=category,
        storage_location=storage_location,
        is_archived=is_archived,
        expiring_within_days=expiring_within_days,
        low_stock=low_stock,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post("", response_model=list[PantryItemResponse])
async def create_pantry_items(
    batch: PantryItemBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create one or more pantry items."""
    return await service.create_pantry_items(db, current_user, batch)


# ============ Analytics (must come before /{item_id} routes) ============

@router.get("/analytics/overview", response_model=PantryAnalytics)
async def get_pantry_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get pantry analytics overview."""
    return await service.get_pantry_analytics(db, current_user)


@router.get("/waste/analytics", response_model=WasteAnalytics)
async def get_waste_analytics(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get waste analytics data."""
    return await service.get_waste_analytics(db, current_user, months=months)


@router.get("/history", response_model=PantryHistory)
async def get_pantry_history(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get pantry history data."""
    return await service.get_pantry_history(db, current_user, months=months)


# ============ Parse Endpoints (must come before /{item_id} routes) ============

@router.post("/parse-text", response_model=ParseTextResponse)
async def parse_pantry_text(
    request: ParseTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse text to extract pantry items using AI."""
    return await service.parse_pantry_text(db, current_user, request)


@router.post("/parse-voice", response_model=ParseTextResponse)
async def parse_pantry_voice(
    audio: UploadFile = File(...),
    language: str = Form("auto"),
    default_storage_location: str = Form("pantry"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse voice recording to extract pantry items using AI."""
    return await service.parse_pantry_voice(
        db,
        current_user,
        audio,
        language=language,
        default_storage_location=default_storage_location,
    )


@router.post("/parse-image", response_model=ParseTextResponse)
async def parse_pantry_image(
    images: list[UploadFile] = File(None),
    image: UploadFile = File(None),
    import_type: str = Form("pantry"),
    default_storage_location: str = Form("pantry"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse image(s) to extract pantry items using AI."""
    return await service.parse_pantry_image(
        db,
        current_user,
        images=images,
        image=image,
        import_type=import_type,
        default_storage_location=default_storage_location,
    )


# ============ Single Item CRUD (with /{item_id}) ============

@router.get("/{item_id}", response_model=PantryItemResponse)
async def get_pantry_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single pantry item by ID."""
    return await service.get_pantry_item(db, current_user, item_id)


@router.put("/{item_id}", response_model=PantryItemResponse)
async def update_pantry_item(
    item_id: UUID,
    item_data: PantryItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a pantry item."""
    return await service.update_pantry_item(db, current_user, item_id, item_data)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pantry_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a pantry item."""
    await service.delete_pantry_item(db, current_user, item_id)


# ============ Bulk Operations ============

@router.post("/bulk-archive", response_model=BulkActionResponse)
async def bulk_archive_pantry_items(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive multiple pantry items."""
    return await service.bulk_archive_pantry_items(db, current_user, request)


@router.post("/bulk-unarchive", response_model=BulkActionResponse)
async def bulk_unarchive_pantry_items(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unarchive multiple pantry items."""
    return await service.bulk_unarchive_pantry_items(db, current_user, request)


@router.post("/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_pantry_items(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple pantry items."""
    return await service.bulk_delete_pantry_items(db, current_user, request)


# ============ Waste Tracking ============

@router.post("/{item_id}/waste", response_model=PantryItemResponse)
async def mark_as_wasted(
    item_id: UUID,
    request: MarkAsWastedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a pantry item as wasted."""
    return await service.mark_as_wasted(db, current_user, item_id, request)


@router.post("/bulk-waste", response_model=BulkActionResponse)
async def bulk_mark_as_wasted(
    request: BulkMarkAsWastedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark multiple pantry items as wasted."""
    return await service.bulk_mark_as_wasted(db, current_user, request)


@router.post("/{item_id}/unwaste", response_model=PantryItemResponse)
async def unmark_as_wasted(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove wasted status from a pantry item."""
    return await service.unmark_as_wasted(db, current_user, item_id)


# ============ Pantry Transactions ============

@router.get("/transactions/all", response_model=PantryTransactionListResponse)
async def list_all_transactions(
    transaction_type: Optional[str] = Query(None, description="Filter by type: add, deduct, waste, adjust, expire"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all pantry transactions for the user."""
    return await service.list_all_transactions(
        db,
        current_user,
        transaction_type=transaction_type,
        page=page,
        per_page=per_page,
    )


@router.get("/{item_id}/transactions", response_model=PantryTransactionListResponse)
async def get_item_transactions(
    item_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get transaction history for a specific pantry item."""
    return await service.get_item_transactions(
        db,
        current_user,
        item_id,
        page=page,
        per_page=per_page,
    )


@router.post("/{item_id}/adjust", response_model=PantryTransactionResponse)
async def adjust_pantry_quantity(
    item_id: UUID,
    new_quantity: float = Query(..., ge=0, description="New quantity to set"),
    notes: Optional[str] = Query(None, max_length=500, description="Notes for the adjustment"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually adjust a pantry item's quantity.

    Creates an 'adjust' transaction recording the change.
    Use this for inventory corrections (e.g., after manual count).
    """
    return await service.adjust_pantry_quantity(
        db,
        current_user,
        item_id,
        new_quantity=new_quantity,
        notes=notes,
    )
