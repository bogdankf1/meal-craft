"""
Groceries API routes - Full CRUD implementation.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from uuid import UUID
import math

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.grocery import Grocery, GroceryCategory
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
import httpx
from app.services.ai_service import ai_service

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
    # Build base query
    query = select(Grocery).where(Grocery.user_id == current_user.id)

    # Apply filters - filter by archived status
    query = query.where(Grocery.is_archived == is_archived)

    if search:
        query = query.where(Grocery.item_name.ilike(f"%{search}%"))

    if category:
        query = query.where(Grocery.category == category)

    if store:
        query = query.where(Grocery.store.ilike(f"%{store}%"))

    if date_from:
        query = query.where(Grocery.purchase_date >= date_from)

    if date_to:
        query = query.where(Grocery.purchase_date <= date_to)

    if expiring_within_days is not None:
        expiry_threshold = date.today() + timedelta(days=expiring_within_days)
        query = query.where(
            and_(
                Grocery.expiry_date.isnot(None),
                Grocery.expiry_date <= expiry_threshold,
                Grocery.expiry_date >= date.today()
            )
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply sorting
    sort_column = getattr(Grocery, sort_by, Grocery.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Apply pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    # Execute query
    result = await db.execute(query)
    groceries = result.scalars().all()

    total_pages = math.ceil(total / per_page) if total > 0 else 1

    return GroceryListResponse(
        items=[GroceryResponse.model_validate(g) for g in groceries],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("", response_model=List[GroceryResponse], status_code=status.HTTP_201_CREATED)
async def create_groceries(
    request: GroceryBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create one or more grocery items."""
    created_groceries = []

    for item_data in request.items:
        grocery = Grocery(
            user_id=current_user.id,
            item_name=item_data.item_name,
            quantity=item_data.quantity,
            unit=item_data.unit,
            category=item_data.category.value if item_data.category else None,
            purchase_date=item_data.purchase_date,
            expiry_date=item_data.expiry_date,
            cost=item_data.cost,
            store=item_data.store,
            is_archived=False,
        )
        db.add(grocery)
        created_groceries.append(grocery)

    await db.commit()

    # Refresh to get generated IDs and timestamps
    for grocery in created_groceries:
        await db.refresh(grocery)

    return [GroceryResponse.model_validate(g) for g in created_groceries]


@router.get("/analytics", response_model=GroceryAnalytics)
async def get_grocery_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get grocery analytics data."""
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    expiry_threshold = today + timedelta(days=7)

    # Base query for user's non-archived groceries
    base_query = select(Grocery).where(
        and_(Grocery.user_id == current_user.id, Grocery.is_archived == False)
    )

    # Total items
    total_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total_items = total_result.scalar() or 0

    # Items this week
    week_result = await db.execute(
        select(func.count()).where(
            and_(
                Grocery.user_id == current_user.id,
                Grocery.is_archived == False,
                Grocery.purchase_date >= week_ago
            )
        )
    )
    items_this_week = week_result.scalar() or 0

    # Items this month
    month_result = await db.execute(
        select(func.count()).where(
            and_(
                Grocery.user_id == current_user.id,
                Grocery.is_archived == False,
                Grocery.purchase_date >= month_ago
            )
        )
    )
    items_this_month = month_result.scalar() or 0

    # Total spent this week
    week_spent_result = await db.execute(
        select(func.coalesce(func.sum(Grocery.cost), 0)).where(
            and_(
                Grocery.user_id == current_user.id,
                Grocery.is_archived == False,
                Grocery.purchase_date >= week_ago
            )
        )
    )
    total_spent_this_week = float(week_spent_result.scalar() or 0)

    # Total spent this month
    month_spent_result = await db.execute(
        select(func.coalesce(func.sum(Grocery.cost), 0)).where(
            and_(
                Grocery.user_id == current_user.id,
                Grocery.is_archived == False,
                Grocery.purchase_date >= month_ago
            )
        )
    )
    total_spent_this_month = float(month_spent_result.scalar() or 0)

    # Expiring soon (within 7 days)
    expiring_result = await db.execute(
        select(func.count()).where(
            and_(
                Grocery.user_id == current_user.id,
                Grocery.is_archived == False,
                Grocery.expiry_date.isnot(None),
                Grocery.expiry_date <= expiry_threshold,
                Grocery.expiry_date >= today
            )
        )
    )
    expiring_soon = expiring_result.scalar() or 0

    # Already expired
    expired_result = await db.execute(
        select(func.count()).where(
            and_(
                Grocery.user_id == current_user.id,
                Grocery.is_archived == False,
                Grocery.expiry_date.isnot(None),
                Grocery.expiry_date < today
            )
        )
    )
    expired = expired_result.scalar() or 0

    # Category breakdown
    category_result = await db.execute(
        select(Grocery.category, func.count()).where(
            and_(Grocery.user_id == current_user.id, Grocery.is_archived == False)
        ).group_by(Grocery.category)
    )
    category_breakdown = {row[0] or "uncategorized": row[1] for row in category_result.all()}

    # Store breakdown
    store_result = await db.execute(
        select(Grocery.store, func.count()).where(
            and_(
                Grocery.user_id == current_user.id,
                Grocery.is_archived == False,
                Grocery.store.isnot(None)
            )
        ).group_by(Grocery.store)
    )
    store_breakdown = {row[0]: row[1] for row in store_result.all()}

    # Spending by category
    spending_result = await db.execute(
        select(Grocery.category, func.coalesce(func.sum(Grocery.cost), 0)).where(
            and_(Grocery.user_id == current_user.id, Grocery.is_archived == False)
        ).group_by(Grocery.category)
    )
    spending_by_category = {row[0] or "uncategorized": float(row[1]) for row in spending_result.all()}

    # Recent items (last 10)
    recent_result = await db.execute(
        select(Grocery).where(
            and_(Grocery.user_id == current_user.id, Grocery.is_archived == False)
        ).order_by(Grocery.created_at.desc()).limit(10)
    )
    recent_items = [GroceryResponse.model_validate(g) for g in recent_result.scalars().all()]

    return GroceryAnalytics(
        total_items=total_items,
        items_this_week=items_this_week,
        items_this_month=items_this_month,
        total_spent_this_week=total_spent_this_week,
        total_spent_this_month=total_spent_this_month,
        expiring_soon=expiring_soon,
        expired=expired,
        category_breakdown=category_breakdown,
        store_breakdown=store_breakdown,
        spending_by_category=spending_by_category,
        recent_items=recent_items,
    )


@router.get("/history", response_model=GroceryHistory)
async def get_grocery_history(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze (1-24)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get historical grocery analytics for the specified number of months."""
    today = date.today()
    start_date = today - relativedelta(months=months)

    # Get all groceries in the period (including archived for historical accuracy)
    result = await db.execute(
        select(Grocery).where(
            and_(
                Grocery.user_id == current_user.id,
                Grocery.purchase_date >= start_date
            )
        ).order_by(Grocery.purchase_date.desc())
    )
    all_groceries = result.scalars().all()

    # Calculate totals
    total_items = len(all_groceries)
    total_spent = sum(g.cost or 0 for g in all_groceries)

    # Monthly breakdown
    monthly_data = []
    category_trends = {}
    store_trends = {}

    current_month = today.replace(day=1)
    for i in range(months):
        month_start = current_month - relativedelta(months=i)
        month_end = month_start + relativedelta(months=1) - timedelta(days=1)
        month_key = month_start.strftime("%Y-%m")
        month_label = month_start.strftime("%b %Y")

        # Filter groceries for this month
        month_groceries = [
            g for g in all_groceries
            if month_start <= g.purchase_date <= month_end
        ]

        # Category breakdown for month
        cat_breakdown = {}
        cat_spending = {}
        for g in month_groceries:
            cat = g.category or "uncategorized"
            cat_breakdown[cat] = cat_breakdown.get(cat, 0) + 1
            cat_spending[cat] = cat_spending.get(cat, 0) + (g.cost or 0)

        # Store breakdown for month
        store_breakdown = {}
        for g in month_groceries:
            if g.store:
                store_breakdown[g.store] = store_breakdown.get(g.store, 0) + 1

        monthly_data.append(MonthlyData(
            month=month_key,
            month_label=month_label,
            total_items=len(month_groceries),
            total_spent=sum(g.cost or 0 for g in month_groceries),
            category_breakdown=cat_breakdown,
            store_breakdown=store_breakdown,
            spending_by_category=cat_spending,
        ))

        # Aggregate category trends
        for cat, count in cat_breakdown.items():
            if cat not in category_trends:
                category_trends[cat] = {}
            category_trends[cat][month_key] = count

        # Aggregate store trends
        for store, count in store_breakdown.items():
            if store not in store_trends:
                store_trends[store] = {}
            store_trends[store][month_key] = count

    # Reverse monthly data to show oldest first
    monthly_data.reverse()

    # Top items - aggregate by item name
    item_stats = {}
    for g in all_groceries:
        name = g.item_name.lower().strip()
        if name not in item_stats:
            item_stats[name] = {
                "item_name": g.item_name,
                "total_quantity": 0,
                "purchase_count": 0,
                "total_spent": 0,
                "last_purchased": g.purchase_date,
            }
        item_stats[name]["total_quantity"] += g.quantity or 1
        item_stats[name]["purchase_count"] += 1
        item_stats[name]["total_spent"] += g.cost or 0
        if g.purchase_date > item_stats[name]["last_purchased"]:
            item_stats[name]["last_purchased"] = g.purchase_date

    # Sort by purchase count and take top 10
    top_items = sorted(
        item_stats.values(),
        key=lambda x: x["purchase_count"],
        reverse=True
    )[:10]

    top_items_response = [
        TopItem(
            item_name=item["item_name"],
            total_quantity=item["total_quantity"],
            purchase_count=item["purchase_count"],
            total_spent=item["total_spent"],
            avg_price=item["total_spent"] / item["purchase_count"] if item["purchase_count"] > 0 else 0,
            last_purchased=item["last_purchased"],
        )
        for item in top_items
    ]

    return GroceryHistory(
        period_months=months,
        total_items=total_items,
        total_spent=total_spent,
        avg_monthly_items=total_items / months if months > 0 else 0,
        avg_monthly_spending=total_spent / months if months > 0 else 0,
        monthly_data=monthly_data,
        top_items=top_items_response,
        category_trends=category_trends,
        store_trends=store_trends,
    )


@router.get("/{grocery_id}", response_model=GroceryResponse)
async def get_grocery(
    grocery_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single grocery item by ID."""
    result = await db.execute(
        select(Grocery).where(
            and_(Grocery.id == grocery_id, Grocery.user_id == current_user.id)
        )
    )
    grocery = result.scalar_one_or_none()

    if not grocery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grocery item not found"
        )

    return GroceryResponse.model_validate(grocery)


@router.put("/{grocery_id}", response_model=GroceryResponse)
async def update_grocery(
    grocery_id: UUID,
    request: GroceryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a grocery item."""
    result = await db.execute(
        select(Grocery).where(
            and_(Grocery.id == grocery_id, Grocery.user_id == current_user.id)
        )
    )
    grocery = result.scalar_one_or_none()

    if not grocery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grocery item not found"
        )

    # Update only provided fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "category" and value is not None:
            setattr(grocery, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(grocery, field, value)

    await db.commit()
    await db.refresh(grocery)

    return GroceryResponse.model_validate(grocery)


@router.delete("/{grocery_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grocery(
    grocery_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a grocery item."""
    result = await db.execute(
        select(Grocery).where(
            and_(Grocery.id == grocery_id, Grocery.user_id == current_user.id)
        )
    )
    grocery = result.scalar_one_or_none()

    if not grocery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grocery item not found"
        )

    await db.delete(grocery)
    await db.commit()


@router.post("/bulk-archive", response_model=BulkActionResponse)
async def bulk_archive_groceries(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive multiple grocery items."""
    result = await db.execute(
        select(Grocery).where(
            and_(
                Grocery.id.in_(request.ids),
                Grocery.user_id == current_user.id
            )
        )
    )
    groceries = result.scalars().all()

    if not groceries:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching grocery items found"
        )

    for grocery in groceries:
        grocery.is_archived = True

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(groceries),
        message=f"Successfully archived {len(groceries)} item(s)"
    )


@router.post("/bulk-unarchive", response_model=BulkActionResponse)
async def bulk_unarchive_groceries(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unarchive multiple grocery items."""
    result = await db.execute(
        select(Grocery).where(
            and_(
                Grocery.id.in_(request.ids),
                Grocery.user_id == current_user.id
            )
        )
    )
    groceries = result.scalars().all()

    if not groceries:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching grocery items found"
        )

    for grocery in groceries:
        grocery.is_archived = False

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(groceries),
        message=f"Successfully unarchived {len(groceries)} item(s)"
    )


@router.post("/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_groceries(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple grocery items."""
    result = await db.execute(
        select(Grocery).where(
            and_(
                Grocery.id.in_(request.ids),
                Grocery.user_id == current_user.id
            )
        )
    )
    groceries = result.scalars().all()

    if not groceries:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching grocery items found"
        )

    count = len(groceries)
    for grocery in groceries:
        await db.delete(grocery)

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=count,
        message=f"Successfully deleted {count} item(s)"
    )


@router.post("/{grocery_id}/waste", response_model=GroceryResponse)
async def mark_as_wasted(
    grocery_id: UUID,
    request: MarkAsWastedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a grocery item as wasted."""
    result = await db.execute(
        select(Grocery).where(
            and_(Grocery.id == grocery_id, Grocery.user_id == current_user.id)
        )
    )
    grocery = result.scalar_one_or_none()

    if not grocery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grocery item not found"
        )

    grocery.is_wasted = True
    grocery.wasted_at = datetime.utcnow()
    grocery.waste_reason = request.waste_reason.value
    grocery.waste_notes = request.waste_notes
    grocery.is_archived = True  # Auto-archive wasted items

    await db.commit()
    await db.refresh(grocery)

    return GroceryResponse.model_validate(grocery)


@router.post("/bulk-waste", response_model=BulkActionResponse)
async def bulk_mark_as_wasted(
    request: BulkMarkAsWastedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark multiple grocery items as wasted."""
    result = await db.execute(
        select(Grocery).where(
            and_(
                Grocery.id.in_(request.ids),
                Grocery.user_id == current_user.id
            )
        )
    )
    groceries = result.scalars().all()

    if not groceries:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching grocery items found"
        )

    now = datetime.utcnow()
    for grocery in groceries:
        grocery.is_wasted = True
        grocery.wasted_at = now
        grocery.waste_reason = request.waste_reason.value
        grocery.waste_notes = request.waste_notes
        grocery.is_archived = True  # Auto-archive wasted items

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(groceries),
        message=f"Successfully marked {len(groceries)} item(s) as wasted"
    )


@router.post("/{grocery_id}/unwaste", response_model=GroceryResponse)
async def unmark_as_wasted(
    grocery_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove wasted status from a grocery item."""
    result = await db.execute(
        select(Grocery).where(
            and_(Grocery.id == grocery_id, Grocery.user_id == current_user.id)
        )
    )
    grocery = result.scalar_one_or_none()

    if not grocery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grocery item not found"
        )

    grocery.is_wasted = False
    grocery.wasted_at = None
    grocery.waste_reason = None
    grocery.waste_notes = None

    await db.commit()
    await db.refresh(grocery)

    return GroceryResponse.model_validate(grocery)


@router.get("/waste/analytics", response_model=WasteAnalytics)
async def get_waste_analytics(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get waste analytics data with trends and suggestions."""
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    start_date = today - relativedelta(months=months)

    # Get all wasted items
    wasted_result = await db.execute(
        select(Grocery).where(
            and_(
                Grocery.user_id == current_user.id,
                Grocery.is_wasted == True
            )
        ).order_by(Grocery.wasted_at.desc())
    )
    all_wasted = wasted_result.scalars().all()

    # Total wasted items and cost
    total_wasted_items = len(all_wasted)
    total_wasted_cost = sum(g.cost or 0 for g in all_wasted)

    # Get total items (for waste rate calculation)
    total_items_result = await db.execute(
        select(func.count()).where(Grocery.user_id == current_user.id)
    )
    total_items = total_items_result.scalar() or 0
    waste_rate = (total_wasted_items / total_items * 100) if total_items > 0 else 0

    # Wasted this week
    wasted_week = [g for g in all_wasted if g.wasted_at and g.wasted_at.date() >= week_ago]
    wasted_this_week = len(wasted_week)
    cost_wasted_this_week = sum(g.cost or 0 for g in wasted_week)

    # Wasted this month
    wasted_month = [g for g in all_wasted if g.wasted_at and g.wasted_at.date() >= month_ago]
    wasted_this_month = len(wasted_month)
    cost_wasted_this_month = sum(g.cost or 0 for g in wasted_month)

    # Breakdown by reason
    reason_breakdown = {}
    for g in all_wasted:
        reason = g.waste_reason or "other"
        if reason not in reason_breakdown:
            reason_breakdown[reason] = {"count": 0, "total_cost": 0}
        reason_breakdown[reason]["count"] += 1
        reason_breakdown[reason]["total_cost"] += g.cost or 0

    by_reason = [
        WasteByReason(reason=reason, count=data["count"], total_cost=data["total_cost"])
        for reason, data in sorted(reason_breakdown.items(), key=lambda x: x[1]["count"], reverse=True)
    ]

    # Breakdown by category
    category_breakdown = {}
    for g in all_wasted:
        category = g.category or "other"
        if category not in category_breakdown:
            category_breakdown[category] = {"count": 0, "total_cost": 0}
        category_breakdown[category]["count"] += 1
        category_breakdown[category]["total_cost"] += g.cost or 0

    by_category = [
        WasteByCategory(category=cat, count=data["count"], total_cost=data["total_cost"])
        for cat, data in sorted(category_breakdown.items(), key=lambda x: x[1]["count"], reverse=True)
    ]

    # Recent wasted items (last 10)
    recent_wasted = [
        WastedItem(
            id=g.id,
            item_name=g.item_name,
            quantity=g.quantity,
            unit=g.unit,
            category=g.category,
            purchase_date=g.purchase_date,
            cost=g.cost,
            store=g.store,
            wasted_at=g.wasted_at,
            waste_reason=g.waste_reason,
            waste_notes=g.waste_notes,
        )
        for g in all_wasted[:10] if g.wasted_at
    ]

    # Monthly trends
    monthly_trends = []
    current_month = today.replace(day=1)
    for i in range(months):
        month_start = current_month - relativedelta(months=i)
        month_end = month_start + relativedelta(months=1) - timedelta(days=1)
        month_key = month_start.strftime("%Y-%m")
        month_label = month_start.strftime("%b %Y")

        # Filter wasted items for this month
        month_wasted = [
            g for g in all_wasted
            if g.wasted_at and month_start <= g.wasted_at.date() <= month_end
        ]

        # Breakdown by reason and category for month
        month_by_reason = {}
        month_by_category = {}
        for g in month_wasted:
            reason = g.waste_reason or "other"
            category = g.category or "other"
            month_by_reason[reason] = month_by_reason.get(reason, 0) + 1
            month_by_category[category] = month_by_category.get(category, 0) + 1

        monthly_trends.append(MonthlyWasteData(
            month=month_key,
            month_label=month_label,
            wasted_count=len(month_wasted),
            wasted_cost=sum(g.cost or 0 for g in month_wasted),
            by_reason=month_by_reason,
            by_category=month_by_category,
        ))

    # Reverse to show oldest first
    monthly_trends.reverse()

    # Generate suggestions based on data
    suggestions = _generate_waste_suggestions(
        by_reason=by_reason,
        by_category=by_category,
        waste_rate=waste_rate,
        total_wasted_cost=total_wasted_cost,
    )

    return WasteAnalytics(
        total_wasted_items=total_wasted_items,
        total_wasted_cost=total_wasted_cost,
        wasted_this_week=wasted_this_week,
        wasted_this_month=wasted_this_month,
        cost_wasted_this_week=cost_wasted_this_week,
        cost_wasted_this_month=cost_wasted_this_month,
        waste_rate=round(waste_rate, 1),
        by_reason=by_reason,
        by_category=by_category,
        recent_wasted=recent_wasted,
        monthly_trends=monthly_trends,
        suggestions=suggestions,
    )


def _generate_waste_suggestions(
    by_reason: List[WasteByReason],
    by_category: List[WasteByCategory],
    waste_rate: float,
    total_wasted_cost: float,
) -> List[str]:
    """Generate personalized suggestions to reduce food waste."""
    suggestions = []

    if not by_reason:
        suggestions.append("Start tracking your food waste to get personalized tips!")
        return suggestions

    # Find top waste reasons
    if by_reason:
        top_reason = by_reason[0].reason
        if top_reason == "expired":
            suggestions.append("Consider organizing your fridge with FIFO (First In, First Out) to use older items first.")
            suggestions.append("Set reminders for items approaching expiry dates.")
        elif top_reason == "spoiled":
            suggestions.append("Check your fridge temperature (should be below 4°C / 40°F).")
            suggestions.append("Store produce properly - some items need refrigeration, others don't.")
        elif top_reason == "forgot":
            suggestions.append("Keep a running inventory of what's in your fridge.")
            suggestions.append("Plan your meals for the week to ensure you use what you buy.")
        elif top_reason == "too_much":
            suggestions.append("Try buying smaller quantities more frequently.")
            suggestions.append("Consider meal prepping to use up ingredients efficiently.")
        elif top_reason == "overcooked":
            suggestions.append("Use timers when cooking to avoid overcooking.")
            suggestions.append("Consider batch cooking and freezing portions.")
        elif top_reason == "didnt_like":
            suggestions.append("Try smaller portions when trying new foods.")
            suggestions.append("Look for recipes that transform ingredients you don't normally enjoy.")

    # Category-specific suggestions
    if by_category:
        top_category = by_category[0].category
        if top_category == "produce":
            suggestions.append("Buy frozen vegetables as alternatives - they last longer and are just as nutritious.")
            suggestions.append("Store leafy greens with a paper towel to absorb excess moisture.")
        elif top_category == "dairy":
            suggestions.append("Check expiry dates carefully when shopping for dairy products.")
            suggestions.append("Freeze milk, cheese, and yogurt before they expire.")
        elif top_category == "bakery":
            suggestions.append("Freeze bread and defrost slices as needed.")
            suggestions.append("Make breadcrumbs or croutons from stale bread.")

    # Waste rate suggestions
    if waste_rate > 20:
        suggestions.append("Your waste rate is above 20%. Consider making a detailed shopping list before grocery trips.")
    elif waste_rate > 10:
        suggestions.append("Your waste rate is moderate. Try planning meals before shopping to reduce overbuying.")

    # Cost suggestions
    if total_wasted_cost > 100:
        suggestions.append(f"You've wasted ${total_wasted_cost:.2f} worth of food. A meal planning app could help reduce this significantly.")

    return suggestions[:5]  # Return top 5 suggestions


@router.post("/parse-text", response_model=ParseTextResponse)
async def parse_grocery_text(
    request: ParseTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse grocery items from text using AI."""
    default_date = request.default_purchase_date or date.today()

    try:
        # Use AI service to parse the text
        ai_parsed_items = await ai_service.parse_grocery_text(
            text=request.text,
            db=db,
            user_id=current_user.id,
        )

        if not ai_parsed_items:
            # Fall back to simple line-by-line parsing if AI fails
            return _simple_parse_text(request.text, default_date)

        # Convert AI response to GroceryCreate objects
        parsed_items = []
        for item in ai_parsed_items:
            parsed_items.append(GroceryCreate(
                item_name=item.get("item_name", "").strip(),
                quantity=item.get("quantity"),
                unit=item.get("unit"),
                category=item.get("category"),
                purchase_date=default_date,
                expiry_date=date.fromisoformat(item["expiry_date"]) if item.get("expiry_date") else None,
                cost=item.get("cost"),
                store=item.get("store"),
            ))

        return ParseTextResponse(
            parsed_items=parsed_items,
            raw_text=request.text,
            success=True,
            message=f"Parsed {len(parsed_items)} item(s) with AI"
        )

    except Exception as e:
        import traceback
        print(f"AI parsing failed: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        # Fall back to simple parsing
        return _simple_parse_text(request.text, default_date)


def _simple_parse_text(text: str, default_date: date) -> ParseTextResponse:
    """Fallback simple line-by-line parsing without AI."""
    lines = text.strip().split("\n")
    parsed_items = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Remove common prefixes like "- ", "* ", numbers, etc.
        for prefix in ["- ", "* ", "• "]:
            if line.startswith(prefix):
                line = line[len(prefix):]

        # Try to extract quantity and unit (e.g., "2 kg apples" or "apples 2kg")
        parts = line.split()
        item_name = line
        quantity = None
        unit = None

        # Simple pattern matching for quantity at start
        if len(parts) >= 2:
            try:
                quantity = float(parts[0].replace(",", "."))
                # Check if second part is a unit
                common_units = ["kg", "g", "ml", "l", "pcs", "piece", "pieces", "pack", "packs", "box", "boxes"]
                if parts[1].lower() in common_units:
                    unit = parts[1].lower()
                    item_name = " ".join(parts[2:]) if len(parts) > 2 else parts[1]
                else:
                    item_name = " ".join(parts[1:])
            except ValueError:
                # First part is not a number
                pass

        if item_name:
            parsed_items.append(GroceryCreate(
                item_name=item_name.strip(),
                quantity=quantity,
                unit=unit,
                purchase_date=default_date,
                category=None,
                expiry_date=None,
                cost=None,
                store=None,
            ))

    return ParseTextResponse(
        parsed_items=parsed_items,
        raw_text=text,
        success=True,
        message=f"Parsed {len(parsed_items)} item(s)" if parsed_items else "No items could be parsed"
    )


@router.post("/parse-voice", response_model=ParseTextResponse)
async def parse_grocery_voice(
    audio: UploadFile = File(...),
    language: str = Form(default="auto"),
    default_purchase_date: Optional[date] = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse grocery items from voice recording using AI transcription."""
    purchase_date = default_purchase_date or date.today()

    try:
        # Read audio file content
        audio_content = await audio.read()

        print(f"[Voice Parse] Received audio file: {audio.filename}, content_type: {audio.content_type}, size: {len(audio_content)} bytes")

        if len(audio_content) < 1000:
            print(f"[Voice Parse] Audio file too small: {len(audio_content)} bytes")
            return ParseTextResponse(
                parsed_items=[],
                raw_text="[Voice recording too short]",
                success=True,
                message="Recording too short. Please record for at least a few seconds."
            )

        # Create a file-like object for OpenAI
        import io
        audio_file = io.BytesIO(audio_content)
        # Use filename from upload or default based on content type
        filename = audio.filename or "recording.webm"
        # Ensure proper extension for Whisper
        if audio.content_type:
            ext_map = {
                "audio/webm": ".webm",
                "audio/mp4": ".mp4",
                "audio/ogg": ".ogg",
                "audio/mpeg": ".mp3",
                "audio/wav": ".wav",
            }
            for content_type, ext in ext_map.items():
                if content_type in audio.content_type and not filename.endswith(ext):
                    filename = filename.rsplit(".", 1)[0] + ext
                    break
        audio_file.name = filename
        print(f"[Voice Parse] Using filename: {filename}")

        # Transcribe and parse
        ai_parsed_items, transcribed_text = await ai_service.transcribe_and_parse_groceries(
            audio_file=audio_file,
            language=language,
            db=db,
            user_id=current_user.id,
        )

        if not ai_parsed_items:
            return ParseTextResponse(
                parsed_items=[],
                raw_text=f"[Transcribed: {transcribed_text}]" if transcribed_text else "[No transcription]",
                success=True,
                message=f"Audio was transcribed as: \"{transcribed_text}\". No grocery items were detected. Try speaking more clearly and mention specific items like 'milk, eggs, bread'."
            )

        # Convert to GroceryCreate objects
        parsed_items = []
        for item in ai_parsed_items:
            parsed_items.append(GroceryCreate(
                item_name=item.get("item_name", "").strip(),
                quantity=item.get("quantity"),
                unit=item.get("unit"),
                category=item.get("category"),
                purchase_date=purchase_date,
                expiry_date=date.fromisoformat(item["expiry_date"]) if item.get("expiry_date") else None,
                cost=item.get("cost"),
                store=item.get("store"),
            ))

        return ParseTextResponse(
            parsed_items=parsed_items,
            raw_text=f"[Transcribed: {transcribed_text}]",
            success=True,
            message=f"Transcribed and parsed {len(parsed_items)} item(s)"
        )

    except Exception as e:
        import traceback
        print(f"Voice parsing failed: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process voice recording: {str(e)}"
        )


@router.post("/parse-receipt-url", response_model=ParseTextResponse)
async def parse_receipt_url(
    request: ParseReceiptUrlRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse grocery items from a digital receipt URL."""
    purchase_date = request.default_purchase_date or date.today()

    try:
        # Use AI service to fetch and parse the receipt
        ai_parsed_items = await ai_service.parse_receipt_from_url(
            url=request.url,
            db=db,
            user_id=current_user.id,
        )

        if not ai_parsed_items:
            return ParseTextResponse(
                parsed_items=[],
                raw_text=f"[Receipt URL: {request.url}]",
                success=True,
                message="Could not extract items from this receipt. The page may require JavaScript or the format is not supported."
            )

        # Convert to GroceryCreate objects
        parsed_items = []
        for item in ai_parsed_items:
            parsed_items.append(GroceryCreate(
                item_name=item.get("item_name", "").strip(),
                quantity=item.get("quantity"),
                unit=item.get("unit"),
                category=item.get("category"),
                purchase_date=purchase_date,
                expiry_date=date.fromisoformat(item["expiry_date"]) if item.get("expiry_date") else None,
                cost=item.get("cost"),
                store=item.get("store"),
            ))

        return ParseTextResponse(
            parsed_items=parsed_items,
            raw_text=f"[Receipt URL: {request.url}]",
            success=True,
            message=f"Parsed {len(parsed_items)} item(s) from receipt"
        )

    except ValueError as e:
        # HTTP errors from fetching
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        print(f"Receipt URL parsing failed: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse receipt: {str(e)}"
        )


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
    purchase_date = default_purchase_date or date.today()

    try:
        # Collect all images
        image_data_list: List[bytes] = []

        # Single image
        if image is not None:
            content = await image.read()
            if content:
                image_data_list.append(content)
                print(f"[Image Parse] Single image: {image.filename}, size: {len(content)} bytes")

        # Multiple images
        if images is not None:
            for img in images:
                content = await img.read()
                if content:
                    image_data_list.append(content)
                    print(f"[Image Parse] Multi image: {img.filename}, size: {len(content)} bytes")

        if not image_data_list:
            return ParseTextResponse(
                parsed_items=[],
                raw_text="[No images provided]",
                success=False,
                message="No images were provided"
            )

        print(f"[Image Parse] Processing {len(image_data_list)} image(s), type: {import_type}")

        # Use AI service to parse images
        ai_parsed_items = await ai_service.parse_grocery_images(
            images=image_data_list,
            import_type=import_type,
            db=db,
            user_id=current_user.id,
        )

        if not ai_parsed_items:
            return ParseTextResponse(
                parsed_items=[],
                raw_text=f"[{len(image_data_list)} image(s) processed]",
                success=True,
                message="Could not extract items from the image(s). Please try with a clearer photo."
            )

        # Convert to GroceryCreate objects
        parsed_items = []
        for item in ai_parsed_items:
            parsed_items.append(GroceryCreate(
                item_name=item.get("item_name", "").strip(),
                quantity=item.get("quantity"),
                unit=item.get("unit"),
                category=item.get("category"),
                purchase_date=purchase_date,
                expiry_date=date.fromisoformat(item["expiry_date"]) if item.get("expiry_date") else None,
                cost=item.get("cost"),
                store=item.get("store"),
            ))

        return ParseTextResponse(
            parsed_items=parsed_items,
            raw_text=f"[{len(image_data_list)} image(s) processed]",
            success=True,
            message=f"Parsed {len(parsed_items)} item(s) from {len(image_data_list)} image(s)"
        )

    except Exception as e:
        import traceback
        print(f"Image parsing failed: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse image(s): {str(e)}"
        )


# Category mapping from Open Food Facts to our categories
OFF_CATEGORY_MAPPING = {
    "fruits": "produce",
    "vegetables": "produce",
    "fresh-foods": "produce",
    "plant-based-foods": "produce",
    "meats": "meat",
    "beef": "meat",
    "pork": "meat",
    "poultry": "meat",
    "chicken": "meat",
    "fish": "seafood",
    "seafood": "seafood",
    "dairies": "dairy",
    "milk": "dairy",
    "cheese": "dairy",
    "yogurt": "dairy",
    "eggs": "dairy",
    "breads": "bakery",
    "pastries": "bakery",
    "frozen-foods": "frozen",
    "beverages": "beverages",
    "drinks": "beverages",
    "waters": "beverages",
    "juices": "beverages",
    "sodas": "beverages",
    "snacks": "snacks",
    "chips": "snacks",
    "cookies": "snacks",
    "chocolates": "snacks",
    "candies": "snacks",
    "sauces": "condiments",
    "condiments": "condiments",
    "spices": "spices",
    "herbs": "spices",
    "cereals": "pantry",
    "pasta": "pantry",
    "rice": "pantry",
    "canned-foods": "pantry",
}


def map_off_category(categories_tags: list) -> Optional[str]:
    """Map Open Food Facts categories to our grocery categories."""
    if not categories_tags:
        return None

    for tag in categories_tags:
        # Remove language prefix (e.g., "en:fruits" -> "fruits")
        clean_tag = tag.split(":")[-1].lower()
        for off_key, our_category in OFF_CATEGORY_MAPPING.items():
            if off_key in clean_tag:
                return our_category

    return "other"


def parse_quantity_from_off(product: dict) -> tuple:
    """Parse quantity and unit from Open Food Facts product data."""
    quantity = None
    unit = None

    # Try to get quantity from product_quantity field (in grams or ml)
    if product.get("product_quantity"):
        try:
            quantity = float(product["product_quantity"])
            # Determine unit based on product categories
            categories = " ".join(product.get("categories_tags", [])).lower()
            if "beverage" in categories or "drink" in categories or "juice" in categories:
                unit = "ml"
            else:
                unit = "g"
        except (ValueError, TypeError):
            pass

    # Try to parse from quantity string (e.g., "500 g", "1 L")
    if not quantity and product.get("quantity"):
        import re
        qty_str = product["quantity"]
        match = re.match(r"([\d.]+)\s*(\w+)", qty_str)
        if match:
            try:
                quantity = float(match.group(1))
                unit = match.group(2).lower()
                # Normalize units
                if unit in ["g", "gr", "gram", "grams"]:
                    unit = "g"
                elif unit in ["kg", "kilo", "kilogram"]:
                    unit = "kg"
                elif unit in ["ml", "milliliter", "milliliters"]:
                    unit = "ml"
                elif unit in ["l", "liter", "liters", "litre"]:
                    unit = "l"
                elif unit in ["pcs", "pc", "piece", "pieces", "шт"]:
                    unit = "pcs"
            except (ValueError, TypeError):
                pass

    return quantity, unit


@router.get("/lookup-barcode/{barcode}", response_model=BarcodeLookupResponse)
async def lookup_barcode(
    barcode: str,
    current_user: User = Depends(get_current_user),
):
    """
    Look up product information by barcode using Open Food Facts API.
    Returns product name, brand, category, and other details if found.
    """
    try:
        # Query Open Food Facts API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json",
                timeout=10.0,
                headers={"User-Agent": "MealCraft/1.0"}
            )

        if response.status_code != 200:
            return BarcodeLookupResponse(
                success=False,
                barcode=barcode,
                message="Failed to lookup barcode"
            )

        data = response.json()

        if data.get("status") != 1 or not data.get("product"):
            return BarcodeLookupResponse(
                success=False,
                barcode=barcode,
                message="Product not found in database"
            )

        product = data["product"]

        # Extract product information
        product_name = (
            product.get("product_name") or
            product.get("product_name_en") or
            product.get("product_name_uk") or
            product.get("generic_name") or
            "Unknown Product"
        )

        brand = product.get("brands", "").split(",")[0].strip() if product.get("brands") else None

        # Map category
        category = map_off_category(product.get("categories_tags", []))

        # Parse quantity
        quantity, unit = parse_quantity_from_off(product)

        # Get image URL
        image_url = product.get("image_front_url") or product.get("image_url")

        return BarcodeLookupResponse(
            success=True,
            barcode=barcode,
            product_name=product_name,
            brand=brand,
            category=category,
            quantity=quantity,
            unit=unit,
            image_url=image_url,
            message="Product found"
        )

    except httpx.TimeoutException:
        return BarcodeLookupResponse(
            success=False,
            barcode=barcode,
            message="Request timed out"
        )
    except Exception as e:
        print(f"Barcode lookup failed: {e}")
        return BarcodeLookupResponse(
            success=False,
            barcode=barcode,
            message=f"Lookup failed: {str(e)}"
        )
