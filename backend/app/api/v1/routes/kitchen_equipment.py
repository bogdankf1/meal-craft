"""Kitchen Equipment API routes."""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from dateutil.relativedelta import relativedelta

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.kitchen_equipment import KitchenEquipment
from app.schemas.kitchen_equipment import (
    KitchenEquipmentCreate,
    KitchenEquipmentBatchCreate,
    KitchenEquipmentUpdate,
    KitchenEquipmentResponse,
    KitchenEquipmentListResponse,
    KitchenEquipmentFilters,
    BulkActionRequest,
    BulkActionResponse,
    KitchenEquipmentAnalytics,
    MaintenanceAnalytics,
    MaintenanceItem,
    EquipmentByCategory,
    EquipmentByCondition,
    EquipmentByLocation,
    KitchenEquipmentHistory,
    MonthlyEquipmentData,
    RecordMaintenanceRequest,
    BulkRecordMaintenanceRequest,
    ParseTextRequest,
    ParseTextResponse,
)
from app.services.ai_service import AIService

router = APIRouter(prefix="/kitchen-equipment", tags=["kitchen-equipment"])


def _equipment_to_response(item: KitchenEquipment) -> KitchenEquipmentResponse:
    """Convert equipment model to response with computed fields."""
    return KitchenEquipmentResponse(
        id=item.id,
        user_id=item.user_id,
        name=item.name,
        category=item.category,
        brand=item.brand,
        model=item.model,
        condition=item.condition,
        location=item.location,
        purchase_date=item.purchase_date,
        purchase_price=item.purchase_price,
        last_maintenance_date=item.last_maintenance_date,
        maintenance_interval_days=item.maintenance_interval_days,
        maintenance_notes=item.maintenance_notes,
        notes=item.notes,
        is_archived=item.is_archived,
        created_at=item.created_at,
        updated_at=item.updated_at,
        needs_maintenance=item.needs_maintenance,
        days_until_maintenance=item.days_until_maintenance,
    )


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
    query = select(KitchenEquipment).where(KitchenEquipment.user_id == current_user.id)

    # Apply filters
    if is_archived is not None:
        query = query.where(KitchenEquipment.is_archived == is_archived)

    if search:
        query = query.where(
            KitchenEquipment.name.ilike(f"%{search}%") |
            KitchenEquipment.brand.ilike(f"%{search}%") |
            KitchenEquipment.model.ilike(f"%{search}%")
        )

    if category:
        query = query.where(KitchenEquipment.category == category)

    if condition:
        query = query.where(KitchenEquipment.condition == condition)

    if location:
        query = query.where(KitchenEquipment.location == location)

    # Sorting
    sort_column = getattr(KitchenEquipment, sort_by, KitchenEquipment.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    items = result.scalars().all()

    # Filter needs_maintenance in Python if needed
    if needs_maintenance is not None:
        items = [item for item in items if item.needs_maintenance == needs_maintenance]

    total_pages = (total + per_page - 1) // per_page

    return KitchenEquipmentListResponse(
        items=[_equipment_to_response(item) for item in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("", response_model=list[KitchenEquipmentResponse])
async def create_kitchen_equipment(
    batch: KitchenEquipmentBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create one or more kitchen equipment items."""
    created_items = []

    for item_data in batch.items:
        equipment = KitchenEquipment(
            user_id=current_user.id,
            name=item_data.name,
            category=item_data.category.value if item_data.category else None,
            brand=item_data.brand,
            model=item_data.model,
            condition=item_data.condition.value if item_data.condition else "good",
            location=item_data.location.value if item_data.location else "cabinet",
            purchase_date=item_data.purchase_date,
            purchase_price=item_data.purchase_price,
            last_maintenance_date=item_data.last_maintenance_date,
            maintenance_interval_days=item_data.maintenance_interval_days,
            maintenance_notes=item_data.maintenance_notes,
            notes=item_data.notes,
        )
        db.add(equipment)
        created_items.append(equipment)

    await db.commit()
    for item in created_items:
        await db.refresh(item)

    return [_equipment_to_response(item) for item in created_items]


# ============ Analytics (must come before /{item_id} routes) ============

@router.get("/analytics/overview", response_model=KitchenEquipmentAnalytics)
async def get_equipment_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get kitchen equipment analytics overview."""
    # Get all active equipment
    result = await db.execute(
        select(KitchenEquipment).where(
            and_(
                KitchenEquipment.user_id == current_user.id,
                KitchenEquipment.is_archived == False
            )
        ).order_by(KitchenEquipment.created_at.desc())
    )
    items = result.scalars().all()

    total_items = len(items)

    # Items by category
    category_count = {}
    for item in items:
        cat = item.category or "other"
        category_count[cat] = category_count.get(cat, 0) + 1
    items_by_category = [
        EquipmentByCategory(category=cat, count=count)
        for cat, count in sorted(category_count.items(), key=lambda x: x[1], reverse=True)
    ]

    # Items by condition
    condition_count = {}
    for item in items:
        cond = item.condition or "good"
        condition_count[cond] = condition_count.get(cond, 0) + 1
    items_by_condition = [
        EquipmentByCondition(condition=cond, count=count)
        for cond, count in sorted(condition_count.items(), key=lambda x: x[1], reverse=True)
    ]

    # Items by location
    location_count = {}
    for item in items:
        loc = item.location or "other"
        location_count[loc] = location_count.get(loc, 0) + 1
    items_by_location = [
        EquipmentByLocation(location=loc, count=count)
        for loc, count in sorted(location_count.items(), key=lambda x: x[1], reverse=True)
    ]

    # Needs maintenance count
    needs_maintenance_count = sum(1 for item in items if item.needs_maintenance)

    # Needs repair count
    needs_repair = sum(1 for item in items if item.condition in ["needs_repair", "replace_soon"])

    # Total value
    total_value = sum(
        Decimal(str(item.purchase_price)) for item in items
        if item.purchase_price is not None
    )

    # Recently added (top 5)
    recently_added = [_equipment_to_response(item) for item in items[:5]]

    # Maintenance analytics
    overdue_items = []
    upcoming_items = []
    today = date.today()

    for item in items:
        if item.needs_maintenance:
            days_since = (today - item.last_maintenance_date).days if item.last_maintenance_date else 0
            days_overdue = days_since - (item.maintenance_interval_days or 0)
            overdue_items.append(MaintenanceItem(
                id=item.id,
                name=item.name,
                category=item.category,
                last_maintenance_date=item.last_maintenance_date,
                days_overdue=days_overdue,
                maintenance_notes=item.maintenance_notes,
            ))
        elif item.maintenance_interval_days and item.last_maintenance_date:
            days_until = item.days_until_maintenance
            if days_until and days_until <= 14:  # Within 2 weeks
                upcoming_items.append(MaintenanceItem(
                    id=item.id,
                    name=item.name,
                    category=item.category,
                    last_maintenance_date=item.last_maintenance_date,
                    days_overdue=-days_until,  # Negative means days until
                    maintenance_notes=item.maintenance_notes,
                ))

    maintenance = MaintenanceAnalytics(
        total_equipment=total_items,
        needs_maintenance=needs_maintenance_count,
        maintenance_rate=round((needs_maintenance_count / total_items * 100) if total_items > 0 else 0, 1),
        overdue_items=sorted(overdue_items, key=lambda x: x.days_overdue, reverse=True)[:10],
        upcoming_items=sorted(upcoming_items, key=lambda x: x.days_overdue, reverse=True)[:10],
    )

    return KitchenEquipmentAnalytics(
        total_items=total_items,
        items_by_category=items_by_category,
        items_by_condition=items_by_condition,
        items_by_location=items_by_location,
        needs_maintenance=needs_maintenance_count,
        needs_repair=needs_repair,
        total_value=total_value,
        recently_added=recently_added,
        maintenance=maintenance,
    )


@router.get("/maintenance/overview", response_model=MaintenanceAnalytics)
async def get_maintenance_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed maintenance overview."""
    result = await db.execute(
        select(KitchenEquipment).where(
            and_(
                KitchenEquipment.user_id == current_user.id,
                KitchenEquipment.is_archived == False
            )
        )
    )
    items = result.scalars().all()

    total_items = len(items)
    needs_maintenance_count = sum(1 for item in items if item.needs_maintenance)
    today = date.today()

    overdue_items = []
    upcoming_items = []

    for item in items:
        if item.needs_maintenance:
            days_since = (today - item.last_maintenance_date).days if item.last_maintenance_date else 0
            days_overdue = days_since - (item.maintenance_interval_days or 0)
            overdue_items.append(MaintenanceItem(
                id=item.id,
                name=item.name,
                category=item.category,
                last_maintenance_date=item.last_maintenance_date,
                days_overdue=days_overdue,
                maintenance_notes=item.maintenance_notes,
            ))
        elif item.maintenance_interval_days and item.last_maintenance_date:
            days_until = item.days_until_maintenance
            if days_until and days_until <= 30:  # Within a month
                upcoming_items.append(MaintenanceItem(
                    id=item.id,
                    name=item.name,
                    category=item.category,
                    last_maintenance_date=item.last_maintenance_date,
                    days_overdue=-days_until,
                    maintenance_notes=item.maintenance_notes,
                ))

    return MaintenanceAnalytics(
        total_equipment=total_items,
        needs_maintenance=needs_maintenance_count,
        maintenance_rate=round((needs_maintenance_count / total_items * 100) if total_items > 0 else 0, 1),
        overdue_items=sorted(overdue_items, key=lambda x: x.days_overdue, reverse=True),
        upcoming_items=sorted(upcoming_items, key=lambda x: x.days_overdue, reverse=True),
    )


@router.get("/history", response_model=KitchenEquipmentHistory)
async def get_equipment_history(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get kitchen equipment history data."""
    today = date.today()
    start_date = today - relativedelta(months=months)

    # Get all items in the period
    result = await db.execute(
        select(KitchenEquipment).where(
            and_(
                KitchenEquipment.user_id == current_user.id,
                KitchenEquipment.created_at >= start_date
            )
        ).order_by(KitchenEquipment.created_at.desc())
    )
    all_items = result.scalars().all()

    total_items = len(all_items)
    total_value = sum(
        Decimal(str(item.purchase_price)) for item in all_items
        if item.purchase_price is not None
    )
    avg_monthly_items = total_items / months if months > 0 else 0

    # Monthly data
    monthly_data = []
    current_month = today.replace(day=1)
    for i in range(months):
        month_start = current_month - relativedelta(months=i)
        month_end = month_start + relativedelta(months=1) - timedelta(days=1)
        month_key = month_start.strftime("%Y-%m")
        month_label = month_start.strftime("%b %Y")

        month_items = [
            item for item in all_items
            if month_start <= item.created_at.date() <= month_end
        ]

        category_breakdown = {}
        month_value = Decimal("0")
        for item in month_items:
            cat = item.category or "other"
            category_breakdown[cat] = category_breakdown.get(cat, 0) + 1
            if item.purchase_price:
                month_value += Decimal(str(item.purchase_price))

        monthly_data.append(MonthlyEquipmentData(
            month=month_key,
            month_label=month_label,
            total_items=len(month_items),
            total_value=month_value,
            category_breakdown=category_breakdown,
        ))

    monthly_data.reverse()

    # Category trends
    category_trends = {}
    for item in all_items:
        cat = item.category or "other"
        month_key = item.created_at.strftime("%Y-%m")
        if cat not in category_trends:
            category_trends[cat] = {}
        category_trends[cat][month_key] = category_trends[cat].get(month_key, 0) + 1

    return KitchenEquipmentHistory(
        period_months=months,
        total_items=total_items,
        total_value=total_value,
        avg_monthly_items=round(avg_monthly_items, 1),
        monthly_data=monthly_data,
        category_trends=category_trends,
    )


# ============ Parse Endpoints (must come before /{item_id} routes) ============

@router.post("/parse-text", response_model=ParseTextResponse)
async def parse_equipment_text(
    request: ParseTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse text to extract kitchen equipment using AI."""
    ai_service = AIService()

    try:
        parsed_items = await ai_service.parse_kitchen_equipment_text(
            text=request.text,
            default_category=request.default_category.value if request.default_category else None,
            default_location=request.default_location.value if request.default_location else "cabinet",
            db=db,
            user_id=current_user.id,
        )

        return ParseTextResponse(
            parsed_items=parsed_items,
            raw_text=request.text,
            success=True,
            message=f"Successfully parsed {len(parsed_items)} items",
        )
    except Exception as e:
        return ParseTextResponse(
            parsed_items=[],
            raw_text=request.text,
            success=False,
            message=f"Failed to parse text: {str(e)}",
        )


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
    ai_service = AIService()

    try:
        audio_content = await audio.read()

        parsed_items = await ai_service.parse_kitchen_equipment_voice(
            audio_content=audio_content,
            filename=audio.filename or "recording.webm",
            language=language,
            default_category=default_category,
            default_location=default_location,
            db=db,
            user_id=current_user.id,
        )

        return ParseTextResponse(
            parsed_items=parsed_items,
            raw_text="[Voice recording]",
            success=True,
            message=f"Successfully parsed {len(parsed_items)} items from voice",
        )
    except Exception as e:
        return ParseTextResponse(
            parsed_items=[],
            raw_text="[Voice recording]",
            success=False,
            message=f"Failed to parse voice: {str(e)}",
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
    ai_service = AIService()

    # Handle both single and multiple images
    image_files = []
    if images:
        image_files = images
    elif image:
        image_files = [image]

    if not image_files:
        return ParseTextResponse(
            parsed_items=[],
            raw_text="[No image provided]",
            success=False,
            message="No image provided",
        )

    try:
        image_contents = []
        for img in image_files:
            content = await img.read()
            image_contents.append({
                "content": content,
                "filename": img.filename or "image.jpg",
                "content_type": img.content_type or "image/jpeg",
            })

        parsed_items = await ai_service.parse_kitchen_equipment_images(
            images=image_contents,
            import_type=import_type,
            default_category=default_category,
            default_location=default_location,
            db=db,
            user_id=current_user.id,
        )

        return ParseTextResponse(
            parsed_items=parsed_items,
            raw_text=f"[{len(image_files)} image(s)]",
            success=True,
            message=f"Successfully parsed {len(parsed_items)} items from image(s)",
        )
    except Exception as e:
        return ParseTextResponse(
            parsed_items=[],
            raw_text="[Image processing failed]",
            success=False,
            message=f"Failed to parse image: {str(e)}",
        )


# ============ Single Item CRUD (with /{item_id}) ============

@router.get("/{item_id}", response_model=KitchenEquipmentResponse)
async def get_kitchen_equipment(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single kitchen equipment item by ID."""
    result = await db.execute(
        select(KitchenEquipment).where(
            and_(KitchenEquipment.id == item_id, KitchenEquipment.user_id == current_user.id)
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kitchen equipment not found"
        )

    return _equipment_to_response(item)


@router.put("/{item_id}", response_model=KitchenEquipmentResponse)
async def update_kitchen_equipment(
    item_id: UUID,
    item_data: KitchenEquipmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a kitchen equipment item."""
    result = await db.execute(
        select(KitchenEquipment).where(
            and_(KitchenEquipment.id == item_id, KitchenEquipment.user_id == current_user.id)
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kitchen equipment not found"
        )

    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["category", "condition", "location"] and value:
            setattr(item, field, value.value if hasattr(value, 'value') else value)
        else:
            setattr(item, field, value)

    await db.commit()
    await db.refresh(item)

    return _equipment_to_response(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kitchen_equipment(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a kitchen equipment item."""
    result = await db.execute(
        select(KitchenEquipment).where(
            and_(KitchenEquipment.id == item_id, KitchenEquipment.user_id == current_user.id)
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kitchen equipment not found"
        )

    await db.delete(item)
    await db.commit()


# ============ Maintenance Operations ============

@router.post("/{item_id}/maintenance", response_model=KitchenEquipmentResponse)
async def record_maintenance(
    item_id: UUID,
    request: RecordMaintenanceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record maintenance for a kitchen equipment item."""
    result = await db.execute(
        select(KitchenEquipment).where(
            and_(KitchenEquipment.id == item_id, KitchenEquipment.user_id == current_user.id)
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kitchen equipment not found"
        )

    item.last_maintenance_date = request.maintenance_date
    if request.maintenance_notes:
        item.maintenance_notes = request.maintenance_notes

    await db.commit()
    await db.refresh(item)

    return _equipment_to_response(item)


@router.post("/bulk-maintenance", response_model=BulkActionResponse)
async def bulk_record_maintenance(
    request: BulkRecordMaintenanceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record maintenance for multiple kitchen equipment items."""
    result = await db.execute(
        select(KitchenEquipment).where(
            and_(
                KitchenEquipment.id.in_(request.ids),
                KitchenEquipment.user_id == current_user.id
            )
        )
    )
    items = result.scalars().all()

    if not items:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching equipment found"
        )

    for item in items:
        item.last_maintenance_date = request.maintenance_date
        if request.maintenance_notes:
            item.maintenance_notes = request.maintenance_notes

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(items),
        message=f"Successfully recorded maintenance for {len(items)} item(s)"
    )


# ============ Bulk Operations ============

@router.post("/bulk-archive", response_model=BulkActionResponse)
async def bulk_archive_equipment(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive multiple kitchen equipment items."""
    result = await db.execute(
        select(KitchenEquipment).where(
            and_(
                KitchenEquipment.id.in_(request.ids),
                KitchenEquipment.user_id == current_user.id
            )
        )
    )
    items = result.scalars().all()

    if not items:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching equipment found"
        )

    for item in items:
        item.is_archived = True

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(items),
        message=f"Successfully archived {len(items)} item(s)"
    )


@router.post("/bulk-unarchive", response_model=BulkActionResponse)
async def bulk_unarchive_equipment(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unarchive multiple kitchen equipment items."""
    result = await db.execute(
        select(KitchenEquipment).where(
            and_(
                KitchenEquipment.id.in_(request.ids),
                KitchenEquipment.user_id == current_user.id
            )
        )
    )
    items = result.scalars().all()

    if not items:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching equipment found"
        )

    for item in items:
        item.is_archived = False

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(items),
        message=f"Successfully unarchived {len(items)} item(s)"
    )


@router.post("/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_equipment(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple kitchen equipment items."""
    result = await db.execute(
        select(KitchenEquipment).where(
            and_(
                KitchenEquipment.id.in_(request.ids),
                KitchenEquipment.user_id == current_user.id
            )
        )
    )
    items = result.scalars().all()

    if not items:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching equipment found"
        )

    count = len(items)
    for item in items:
        await db.delete(item)

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=count,
        message=f"Successfully deleted {count} item(s)"
    )


@router.post("/bulk-update-condition", response_model=BulkActionResponse)
async def bulk_update_condition(
    request: BulkActionRequest,
    condition: str = Query(..., description="New condition for items"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update condition for multiple kitchen equipment items."""
    result = await db.execute(
        select(KitchenEquipment).where(
            and_(
                KitchenEquipment.id.in_(request.ids),
                KitchenEquipment.user_id == current_user.id
            )
        )
    )
    items = result.scalars().all()

    if not items:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching equipment found"
        )

    for item in items:
        item.condition = condition

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(items),
        message=f"Successfully updated condition for {len(items)} item(s)"
    )
