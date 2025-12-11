from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from dateutil.relativedelta import relativedelta

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.pantry import PantryItem
from app.schemas.pantry import (
    PantryItemCreate,
    PantryItemBatchCreate,
    PantryItemUpdate,
    PantryItemResponse,
    PantryItemListResponse,
    PantryFilters,
    BulkActionRequest,
    BulkActionResponse,
    PantryAnalytics,
    PantryHistory,
    MonthlyData,
    TopItem,
    MarkAsWastedRequest,
    BulkMarkAsWastedRequest,
    WasteAnalytics,
    WastedItem,
    WasteByReason,
    WasteByCategory,
    WasteByLocation,
    MonthlyWasteData,
    ParseTextRequest,
    ParseTextResponse,
)
from app.services.ai_service import AIService

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
    query = select(PantryItem).where(PantryItem.user_id == current_user.id)

    # Apply filters
    if is_archived is not None:
        query = query.where(PantryItem.is_archived == is_archived)

    if search:
        query = query.where(PantryItem.item_name.ilike(f"%{search}%"))

    if category:
        query = query.where(PantryItem.category == category)

    if storage_location:
        query = query.where(PantryItem.storage_location == storage_location)

    if expiring_within_days:
        expiry_threshold = date.today() + timedelta(days=expiring_within_days)
        query = query.where(
            and_(
                PantryItem.expiry_date.isnot(None),
                PantryItem.expiry_date <= expiry_threshold
            )
        )

    # Low stock filter would need additional logic
    # For now we'll handle it in Python after fetching

    # Sorting
    sort_column = getattr(PantryItem, sort_by, PantryItem.created_at)
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

    # Filter low stock in Python if needed
    if low_stock:
        items = [
            item for item in items
            if item.minimum_quantity and item.quantity and item.quantity <= item.minimum_quantity
        ]

    total_pages = (total + per_page - 1) // per_page

    return PantryItemListResponse(
        items=[PantryItemResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("", response_model=list[PantryItemResponse])
async def create_pantry_items(
    batch: PantryItemBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create one or more pantry items."""
    created_items = []

    for item_data in batch.items:
        pantry_item = PantryItem(
            user_id=current_user.id,
            item_name=item_data.item_name,
            quantity=item_data.quantity,
            unit=item_data.unit,
            category=item_data.category.value if item_data.category else None,
            storage_location=item_data.storage_location.value,
            expiry_date=item_data.expiry_date,
            opened_date=item_data.opened_date,
            minimum_quantity=item_data.minimum_quantity,
            notes=item_data.notes,
            source_grocery_id=item_data.source_grocery_id,
        )
        db.add(pantry_item)
        created_items.append(pantry_item)

    await db.commit()
    for item in created_items:
        await db.refresh(item)

    return [PantryItemResponse.model_validate(item) for item in created_items]


# ============ Analytics (must come before /{item_id} routes) ============

@router.get("/analytics/overview", response_model=PantryAnalytics)
async def get_pantry_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get pantry analytics overview."""
    today = date.today()
    week_from_now = today + timedelta(days=7)

    # Get all active pantry items
    result = await db.execute(
        select(PantryItem).where(
            and_(
                PantryItem.user_id == current_user.id,
                PantryItem.is_archived == False
            )
        ).order_by(PantryItem.created_at.desc())
    )
    items = result.scalars().all()

    total_items = len(items)

    # Items by location
    items_by_location = {}
    for item in items:
        loc = item.storage_location or "other"
        items_by_location[loc] = items_by_location.get(loc, 0) + 1

    # Items by category
    items_by_category = {}
    for item in items:
        cat = item.category or "other"
        items_by_category[cat] = items_by_category.get(cat, 0) + 1

    # Expiring soon / expired
    expiring_soon = 0
    expired = 0
    for item in items:
        if item.expiry_date:
            if item.expiry_date < today:
                expired += 1
            elif item.expiry_date <= week_from_now:
                expiring_soon += 1

    # Low stock
    low_stock = sum(
        1 for item in items
        if item.minimum_quantity and item.quantity and item.quantity <= item.minimum_quantity
    )

    # Recently added (top 5)
    recently_added = [PantryItemResponse.model_validate(item) for item in items[:5]]

    return PantryAnalytics(
        total_items=total_items,
        items_by_location=items_by_location,
        items_by_category=items_by_category,
        expiring_soon=expiring_soon,
        expired=expired,
        low_stock=low_stock,
        recently_added=recently_added,
    )


@router.get("/waste/analytics", response_model=WasteAnalytics)
async def get_waste_analytics(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get waste analytics data."""
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Get all wasted items
    wasted_result = await db.execute(
        select(PantryItem).where(
            and_(
                PantryItem.user_id == current_user.id,
                PantryItem.is_wasted == True
            )
        ).order_by(PantryItem.wasted_at.desc())
    )
    all_wasted = wasted_result.scalars().all()

    # Total counts
    total_wasted_items = len(all_wasted)

    # Get total items for waste rate
    total_result = await db.execute(
        select(func.count()).where(PantryItem.user_id == current_user.id)
    )
    total_items = total_result.scalar() or 0
    waste_rate = (total_wasted_items / total_items * 100) if total_items > 0 else 0

    # Wasted this week
    wasted_week = [g for g in all_wasted if g.wasted_at and g.wasted_at.date() >= week_ago]
    wasted_this_week = len(wasted_week)

    # Wasted this month
    wasted_month = [g for g in all_wasted if g.wasted_at and g.wasted_at.date() >= month_ago]
    wasted_this_month = len(wasted_month)

    # Breakdown by reason
    reason_breakdown = {}
    for item in all_wasted:
        reason = item.waste_reason or "other"
        if reason not in reason_breakdown:
            reason_breakdown[reason] = 0
        reason_breakdown[reason] += 1

    by_reason = [
        WasteByReason(reason=reason, count=count, total_items=count)
        for reason, count in sorted(reason_breakdown.items(), key=lambda x: x[1], reverse=True)
    ]

    # Breakdown by category
    category_breakdown = {}
    for item in all_wasted:
        category = item.category or "other"
        if category not in category_breakdown:
            category_breakdown[category] = 0
        category_breakdown[category] += 1

    by_category = [
        WasteByCategory(category=cat, count=count)
        for cat, count in sorted(category_breakdown.items(), key=lambda x: x[1], reverse=True)
    ]

    # Breakdown by location
    location_breakdown = {}
    for item in all_wasted:
        location = item.storage_location or "other"
        if location not in location_breakdown:
            location_breakdown[location] = 0
        location_breakdown[location] += 1

    by_location = [
        WasteByLocation(location=loc, count=count)
        for loc, count in sorted(location_breakdown.items(), key=lambda x: x[1], reverse=True)
    ]

    # Recent wasted
    recent_wasted = [
        WastedItem(
            id=item.id,
            item_name=item.item_name,
            quantity=item.quantity,
            unit=item.unit,
            category=item.category,
            storage_location=item.storage_location,
            wasted_at=item.wasted_at,
            waste_reason=item.waste_reason,
            waste_notes=item.waste_notes,
        )
        for item in all_wasted[:10] if item.wasted_at
    ]

    # Monthly trends
    monthly_trends = []
    current_month = today.replace(day=1)
    for i in range(months):
        month_start = current_month - relativedelta(months=i)
        month_end = month_start + relativedelta(months=1) - timedelta(days=1)
        month_key = month_start.strftime("%Y-%m")
        month_label = month_start.strftime("%b %Y")

        month_wasted = [
            item for item in all_wasted
            if item.wasted_at and month_start <= item.wasted_at.date() <= month_end
        ]

        month_by_reason = {}
        month_by_category = {}
        for item in month_wasted:
            reason = item.waste_reason or "other"
            category = item.category or "other"
            month_by_reason[reason] = month_by_reason.get(reason, 0) + 1
            month_by_category[category] = month_by_category.get(category, 0) + 1

        monthly_trends.append(MonthlyWasteData(
            month=month_key,
            month_label=month_label,
            wasted_count=len(month_wasted),
            by_reason=month_by_reason,
            by_category=month_by_category,
        ))

    monthly_trends.reverse()

    # Generate suggestions
    suggestions = _generate_waste_suggestions(by_reason, by_category, by_location, waste_rate)

    return WasteAnalytics(
        total_wasted_items=total_wasted_items,
        wasted_this_week=wasted_this_week,
        wasted_this_month=wasted_this_month,
        waste_rate=round(waste_rate, 1),
        by_reason=by_reason,
        by_category=by_category,
        by_location=by_location,
        recent_wasted=recent_wasted,
        monthly_trends=monthly_trends,
        suggestions=suggestions,
    )


def _generate_waste_suggestions(
    by_reason: list,
    by_category: list,
    by_location: list,
    waste_rate: float,
) -> list[str]:
    """Generate personalized suggestions to reduce pantry waste."""
    suggestions = []

    if not by_reason:
        suggestions.append("Start tracking your pantry waste to get personalized tips!")
        return suggestions

    # Top reason suggestions
    if by_reason:
        top_reason = by_reason[0].reason
        if top_reason == "expired":
            suggestions.append("Use the FIFO method: First In, First Out - use older items before newer ones.")
            suggestions.append("Set up low stock alerts to avoid overbuying.")
        elif top_reason == "spoiled":
            suggestions.append("Check storage temperatures - fridge should be below 4°C (40°F).")
            suggestions.append("Use airtight containers to extend shelf life.")
        elif top_reason == "forgot":
            suggestions.append("Keep a running inventory visible on your fridge or phone.")
            suggestions.append("Rotate items when adding new ones - older items in front.")

    # Location suggestions
    if by_location:
        top_location = by_location[0].location
        if top_location == "fridge":
            suggestions.append("Organize your fridge with clear containers to see what you have.")
        elif top_location == "pantry":
            suggestions.append("Keep your pantry organized by category and expiry date.")
        elif top_location == "freezer":
            suggestions.append("Label frozen items with dates and use within recommended timeframes.")

    # Waste rate suggestions
    if waste_rate > 20:
        suggestions.append("Your waste rate is high. Consider buying smaller quantities more frequently.")
    elif waste_rate > 10:
        suggestions.append("Try meal planning to better utilize what's in your pantry.")

    return suggestions[:5]


@router.get("/history", response_model=PantryHistory)
async def get_pantry_history(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get pantry history data."""
    today = date.today()
    start_date = today - relativedelta(months=months)

    # Get all items in the period
    result = await db.execute(
        select(PantryItem).where(
            and_(
                PantryItem.user_id == current_user.id,
                PantryItem.created_at >= start_date
            )
        ).order_by(PantryItem.created_at.desc())
    )
    all_items = result.scalars().all()

    total_items = len(all_items)
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
        location_breakdown = {}
        for item in month_items:
            cat = item.category or "other"
            loc = item.storage_location or "other"
            category_breakdown[cat] = category_breakdown.get(cat, 0) + 1
            location_breakdown[loc] = location_breakdown.get(loc, 0) + 1

        monthly_data.append(MonthlyData(
            month=month_key,
            month_label=month_label,
            total_items=len(month_items),
            category_breakdown=category_breakdown,
            location_breakdown=location_breakdown,
        ))

    monthly_data.reverse()

    # Top items
    item_counts = {}
    for item in all_items:
        name = item.item_name.lower()
        if name not in item_counts:
            item_counts[name] = {
                "item_name": item.item_name,
                "total_quantity": 0,
                "count": 0,
                "last_added": item.created_at.isoformat(),
            }
        item_counts[name]["count"] += 1
        item_counts[name]["total_quantity"] += float(item.quantity or 0)
        if item.created_at.isoformat() > item_counts[name]["last_added"]:
            item_counts[name]["last_added"] = item.created_at.isoformat()

    top_items = [
        TopItem(
            item_name=data["item_name"],
            total_quantity=data["total_quantity"],
            occurrence_count=data["count"],
            last_added=data["last_added"],
        )
        for name, data in sorted(item_counts.items(), key=lambda x: x[1]["count"], reverse=True)[:10]
    ]

    # Category trends
    category_trends = {}
    for item in all_items:
        cat = item.category or "other"
        month_key = item.created_at.strftime("%Y-%m")
        if cat not in category_trends:
            category_trends[cat] = {}
        category_trends[cat][month_key] = category_trends[cat].get(month_key, 0) + 1

    # Location trends
    location_trends = {}
    for item in all_items:
        loc = item.storage_location or "other"
        month_key = item.created_at.strftime("%Y-%m")
        if loc not in location_trends:
            location_trends[loc] = {}
        location_trends[loc][month_key] = location_trends[loc].get(month_key, 0) + 1

    return PantryHistory(
        period_months=months,
        total_items=total_items,
        avg_monthly_items=round(avg_monthly_items, 1),
        monthly_data=monthly_data,
        top_items=top_items,
        category_trends=category_trends,
        location_trends=location_trends,
    )


# ============ Parse Endpoints (must come before /{item_id} routes) ============

@router.post("/parse-text", response_model=ParseTextResponse)
async def parse_pantry_text(
    request: ParseTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse text to extract pantry items using AI."""
    ai_service = AIService()

    try:
        parsed_items = await ai_service.parse_pantry_text(
            text=request.text,
            default_storage_location=request.default_storage_location.value if request.default_storage_location else "pantry",
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
async def parse_pantry_voice(
    audio: UploadFile = File(...),
    language: str = Form("auto"),
    default_storage_location: str = Form("pantry"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse voice recording to extract pantry items using AI."""
    ai_service = AIService()

    try:
        audio_content = await audio.read()

        parsed_items = await ai_service.parse_pantry_voice(
            audio_content=audio_content,
            filename=audio.filename or "recording.webm",
            language=language,
            default_storage_location=default_storage_location,
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
async def parse_pantry_image(
    images: list[UploadFile] = File(None),
    image: UploadFile = File(None),
    import_type: str = Form("pantry"),
    default_storage_location: str = Form("pantry"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse image(s) to extract pantry items using AI."""
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

        parsed_items = await ai_service.parse_pantry_images(
            images=image_contents,
            import_type=import_type,
            default_storage_location=default_storage_location,
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

@router.get("/{item_id}", response_model=PantryItemResponse)
async def get_pantry_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single pantry item by ID."""
    result = await db.execute(
        select(PantryItem).where(
            and_(PantryItem.id == item_id, PantryItem.user_id == current_user.id)
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pantry item not found"
        )

    return PantryItemResponse.model_validate(item)


@router.put("/{item_id}", response_model=PantryItemResponse)
async def update_pantry_item(
    item_id: UUID,
    item_data: PantryItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a pantry item."""
    result = await db.execute(
        select(PantryItem).where(
            and_(PantryItem.id == item_id, PantryItem.user_id == current_user.id)
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pantry item not found"
        )

    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "category" and value:
            setattr(item, field, value.value if hasattr(value, 'value') else value)
        elif field == "storage_location" and value:
            setattr(item, field, value.value if hasattr(value, 'value') else value)
        else:
            setattr(item, field, value)

    await db.commit()
    await db.refresh(item)

    return PantryItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pantry_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a pantry item."""
    result = await db.execute(
        select(PantryItem).where(
            and_(PantryItem.id == item_id, PantryItem.user_id == current_user.id)
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pantry item not found"
        )

    await db.delete(item)
    await db.commit()


# ============ Bulk Operations ============

@router.post("/bulk-archive", response_model=BulkActionResponse)
async def bulk_archive_pantry_items(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive multiple pantry items."""
    result = await db.execute(
        select(PantryItem).where(
            and_(
                PantryItem.id.in_(request.ids),
                PantryItem.user_id == current_user.id
            )
        )
    )
    items = result.scalars().all()

    if not items:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching pantry items found"
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
async def bulk_unarchive_pantry_items(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unarchive multiple pantry items."""
    result = await db.execute(
        select(PantryItem).where(
            and_(
                PantryItem.id.in_(request.ids),
                PantryItem.user_id == current_user.id
            )
        )
    )
    items = result.scalars().all()

    if not items:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching pantry items found"
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
async def bulk_delete_pantry_items(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple pantry items."""
    result = await db.execute(
        select(PantryItem).where(
            and_(
                PantryItem.id.in_(request.ids),
                PantryItem.user_id == current_user.id
            )
        )
    )
    items = result.scalars().all()

    if not items:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching pantry items found"
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


# ============ Waste Tracking ============

@router.post("/{item_id}/waste", response_model=PantryItemResponse)
async def mark_as_wasted(
    item_id: UUID,
    request: MarkAsWastedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a pantry item as wasted."""
    result = await db.execute(
        select(PantryItem).where(
            and_(PantryItem.id == item_id, PantryItem.user_id == current_user.id)
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pantry item not found"
        )

    item.is_wasted = True
    item.wasted_at = datetime.utcnow()
    item.waste_reason = request.waste_reason.value
    item.waste_notes = request.waste_notes
    item.is_archived = True

    await db.commit()
    await db.refresh(item)

    return PantryItemResponse.model_validate(item)


@router.post("/bulk-waste", response_model=BulkActionResponse)
async def bulk_mark_as_wasted(
    request: BulkMarkAsWastedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark multiple pantry items as wasted."""
    result = await db.execute(
        select(PantryItem).where(
            and_(
                PantryItem.id.in_(request.ids),
                PantryItem.user_id == current_user.id
            )
        )
    )
    items = result.scalars().all()

    if not items:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching pantry items found"
        )

    now = datetime.utcnow()
    for item in items:
        item.is_wasted = True
        item.wasted_at = now
        item.waste_reason = request.waste_reason.value
        item.waste_notes = request.waste_notes
        item.is_archived = True

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(items),
        message=f"Successfully marked {len(items)} item(s) as wasted"
    )


@router.post("/{item_id}/unwaste", response_model=PantryItemResponse)
async def unmark_as_wasted(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove wasted status from a pantry item."""
    result = await db.execute(
        select(PantryItem).where(
            and_(PantryItem.id == item_id, PantryItem.user_id == current_user.id)
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pantry item not found"
        )

    item.is_wasted = False
    item.wasted_at = None
    item.waste_reason = None
    item.waste_notes = None

    await db.commit()
    await db.refresh(item)

    return PantryItemResponse.model_validate(item)
