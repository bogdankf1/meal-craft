"""Kitchen Equipment API routes.

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
from app.api.v1.routes.kitchen_equipment import service
from app.api.v1.routes.kitchen_equipment.schemas import (
    KitchenEquipmentBatchCreate,
    KitchenEquipmentUpdate,
    KitchenEquipmentResponse,
    KitchenEquipmentListResponse,
    BulkActionRequest,
    BulkActionResponse,
    KitchenEquipmentAnalytics,
    MaintenanceAnalytics,
    KitchenEquipmentHistory,
    RecordMaintenanceRequest,
    BulkRecordMaintenanceRequest,
    ParseTextRequest,
    ParseTextResponse,
)

router = APIRouter(prefix="/kitchen-equipment", tags=["kitchen-equipment"])


# ============ CRUD Operations ============

@router.get("", response_model=KitchenEquipmentListResponse)
async def list_kitchen_equipment(
    search: Optional[str] = None,
    category: Optional[str] = None,
    condition: Optional[str] = None,
    location: Optional[str] = None,
    is_archived: Optional[bool] = False,
    needs_maintenance: Optional[bool] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List kitchen equipment with filters and pagination."""
    return await service.list_kitchen_equipment(
        db,
        current_user,
        search=search,
        category=category,
        condition=condition,
        location=location,
        is_archived=is_archived,
        needs_maintenance=needs_maintenance,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post("", response_model=list[KitchenEquipmentResponse])
async def create_kitchen_equipment(
    batch: KitchenEquipmentBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create one or more kitchen equipment items."""
    return await service.create_kitchen_equipment(db, current_user, batch)


# ============ Analytics (must come before /{item_id} routes) ============

@router.get("/analytics/overview", response_model=KitchenEquipmentAnalytics)
async def get_equipment_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get kitchen equipment analytics overview."""
    return await service.get_equipment_analytics(db, current_user)


@router.get("/maintenance/overview", response_model=MaintenanceAnalytics)
async def get_maintenance_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed maintenance overview."""
    return await service.get_maintenance_overview(db, current_user)


@router.get("/history", response_model=KitchenEquipmentHistory)
async def get_equipment_history(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get kitchen equipment history data."""
    return await service.get_equipment_history(db, current_user, months=months)


# ============ Parse Endpoints (must come before /{item_id} routes) ============

@router.post("/parse-text", response_model=ParseTextResponse)
async def parse_equipment_text(
    request: ParseTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse text to extract kitchen equipment using AI."""
    return await service.parse_equipment_text(db, current_user, request)


@router.post("/parse-voice", response_model=ParseTextResponse)
async def parse_equipment_voice(
    audio: UploadFile = File(...),
    language: str = Form("auto"),
    default_category: str = Form(None),
    default_location: str = Form("cabinet"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse voice recording to extract kitchen equipment using AI."""
    return await service.parse_equipment_voice(
        db,
        current_user,
        audio,
        language=language,
        default_category=default_category,
        default_location=default_location,
    )


@router.post("/parse-image", response_model=ParseTextResponse)
async def parse_equipment_image(
    images: list[UploadFile] = File(None),
    image: UploadFile = File(None),
    import_type: str = Form("equipment"),
    default_category: str = Form(None),
    default_location: str = Form("cabinet"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse image(s) to extract kitchen equipment using AI."""
    return await service.parse_equipment_image(
        db,
        current_user,
        images=images,
        image=image,
        import_type=import_type,
        default_category=default_category,
        default_location=default_location,
    )


# ============ Single Item CRUD (with /{item_id}) ============

@router.get("/{item_id}", response_model=KitchenEquipmentResponse)
async def get_kitchen_equipment(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single kitchen equipment item by ID."""
    return await service.get_kitchen_equipment(db, current_user, item_id)


@router.put("/{item_id}", response_model=KitchenEquipmentResponse)
async def update_kitchen_equipment(
    item_id: UUID,
    item_data: KitchenEquipmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a kitchen equipment item."""
    return await service.update_kitchen_equipment(db, current_user, item_id, item_data)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kitchen_equipment(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a kitchen equipment item."""
    await service.delete_kitchen_equipment(db, current_user, item_id)


# ============ Maintenance Operations ============

@router.post("/{item_id}/maintenance", response_model=KitchenEquipmentResponse)
async def record_maintenance(
    item_id: UUID,
    request: RecordMaintenanceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record maintenance for a kitchen equipment item."""
    return await service.record_maintenance(db, current_user, item_id, request)


@router.post("/bulk-maintenance", response_model=BulkActionResponse)
async def bulk_record_maintenance(
    request: BulkRecordMaintenanceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record maintenance for multiple kitchen equipment items."""
    return await service.bulk_record_maintenance(db, current_user, request)


# ============ Bulk Operations ============

@router.post("/bulk-archive", response_model=BulkActionResponse)
async def bulk_archive_equipment(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive multiple kitchen equipment items."""
    return await service.bulk_archive_equipment(db, current_user, request)


@router.post("/bulk-unarchive", response_model=BulkActionResponse)
async def bulk_unarchive_equipment(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unarchive multiple kitchen equipment items."""
    return await service.bulk_unarchive_equipment(db, current_user, request)


@router.post("/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_equipment(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple kitchen equipment items."""
    return await service.bulk_delete_equipment(db, current_user, request)


@router.post("/bulk-update-condition", response_model=BulkActionResponse)
async def bulk_update_condition(
    request: BulkActionRequest,
    condition: str = Query(..., description="New condition for items"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update condition for multiple kitchen equipment items."""
    return await service.bulk_update_condition(db, current_user, request, condition)
