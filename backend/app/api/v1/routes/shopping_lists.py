"""
Shopping Lists API routes - Full CRUD implementation.
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
import io

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.grocery import ShoppingList, ShoppingListItem, Grocery
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
from app.services.ai_service import ai_service

router = APIRouter()


def compute_list_summary(shopping_list: ShoppingList) -> dict:
    """Compute summary fields for a shopping list."""
    items = shopping_list.items or []
    total_items = len(items)
    purchased_items = sum(1 for item in items if item.is_purchased)
    return {
        "total_items": total_items,
        "purchased_items": purchased_items,
    }


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
    # Build base query with eager loading of items
    query = select(ShoppingList).options(
        selectinload(ShoppingList.items)
    ).where(ShoppingList.user_id == current_user.id)

    # Apply filters
    query = query.where(ShoppingList.is_archived == is_archived)

    if search:
        query = query.where(ShoppingList.name.ilike(f"%{search}%"))

    if status:
        query = query.where(ShoppingList.status == status)

    if date_from:
        query = query.where(func.date(ShoppingList.created_at) >= date_from)

    if date_to:
        query = query.where(func.date(ShoppingList.created_at) <= date_to)

    # Get total count
    count_query = select(func.count()).select_from(
        select(ShoppingList).where(
            and_(
                ShoppingList.user_id == current_user.id,
                ShoppingList.is_archived == is_archived,
                ShoppingList.name.ilike(f"%{search}%") if search else True,
                ShoppingList.status == status if status else True,
            )
        ).subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply sorting
    sort_column = getattr(ShoppingList, sort_by, ShoppingList.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Apply pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    # Execute query
    result = await db.execute(query)
    shopping_lists = result.scalars().all()

    total_pages = math.ceil(total / per_page) if total > 0 else 1

    # Build response with computed fields
    items = []
    for sl in shopping_lists:
        summary = compute_list_summary(sl)
        items.append(ShoppingListSummaryResponse(
            id=sl.id,
            user_id=sl.user_id,
            name=sl.name,
            status=sl.status,
            estimated_cost=float(sl.estimated_cost) if sl.estimated_cost else None,
            completed_at=sl.completed_at,
            is_archived=sl.is_archived,
            created_at=sl.created_at,
            updated_at=sl.updated_at,
            total_items=summary["total_items"],
            purchased_items=summary["purchased_items"],
        ))

    return ShoppingListListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("", response_model=ShoppingListResponse, status_code=status.HTTP_201_CREATED)
async def create_shopping_list(
    request: ShoppingListCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new shopping list with optional initial items."""
    shopping_list = ShoppingList(
        user_id=current_user.id,
        name=request.name,
        estimated_cost=request.estimated_cost,
        status="active",
        is_archived=False,
    )
    db.add(shopping_list)
    await db.flush()  # Get the ID before adding items

    # Add initial items if provided
    if request.items:
        for item_data in request.items:
            item = ShoppingListItem(
                shopping_list_id=shopping_list.id,
                ingredient_name=item_data.ingredient_name,
                quantity=item_data.quantity,
                unit=item_data.unit,
                category=item_data.category.value if item_data.category else None,
                is_purchased=False,
            )
            db.add(item)

    await db.commit()
    await db.refresh(shopping_list)

    # Reload with items
    result = await db.execute(
        select(ShoppingList).options(
            selectinload(ShoppingList.items)
        ).where(ShoppingList.id == shopping_list.id)
    )
    shopping_list = result.scalar_one()

    summary = compute_list_summary(shopping_list)
    return ShoppingListResponse(
        id=shopping_list.id,
        user_id=shopping_list.user_id,
        name=shopping_list.name,
        status=shopping_list.status,
        estimated_cost=float(shopping_list.estimated_cost) if shopping_list.estimated_cost else None,
        completed_at=shopping_list.completed_at,
        is_archived=shopping_list.is_archived,
        created_at=shopping_list.created_at,
        updated_at=shopping_list.updated_at,
        items=[ShoppingListItemResponse.model_validate(i) for i in shopping_list.items],
        total_items=summary["total_items"],
        purchased_items=summary["purchased_items"],
    )


@router.get("/analytics", response_model=ShoppingListAnalytics)
async def get_shopping_list_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get shopping list analytics data."""
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Total lists (non-archived)
    total_result = await db.execute(
        select(func.count()).where(
            and_(ShoppingList.user_id == current_user.id, ShoppingList.is_archived == False)
        )
    )
    total_lists = total_result.scalar() or 0

    # Active lists
    active_result = await db.execute(
        select(func.count()).where(
            and_(
                ShoppingList.user_id == current_user.id,
                ShoppingList.status == "active",
                ShoppingList.is_archived == False
            )
        )
    )
    active_lists = active_result.scalar() or 0

    # Completed lists
    completed_result = await db.execute(
        select(func.count()).where(
            and_(
                ShoppingList.user_id == current_user.id,
                ShoppingList.status == "completed",
                ShoppingList.is_archived == False
            )
        )
    )
    completed_lists = completed_result.scalar() or 0

    # Lists this week
    week_result = await db.execute(
        select(func.count()).where(
            and_(
                ShoppingList.user_id == current_user.id,
                func.date(ShoppingList.created_at) >= week_ago
            )
        )
    )
    lists_this_week = week_result.scalar() or 0

    # Lists this month
    month_result = await db.execute(
        select(func.count()).where(
            and_(
                ShoppingList.user_id == current_user.id,
                func.date(ShoppingList.created_at) >= month_ago
            )
        )
    )
    lists_this_month = month_result.scalar() or 0

    # Get all lists with items for statistics
    lists_result = await db.execute(
        select(ShoppingList).options(
            selectinload(ShoppingList.items)
        ).where(
            and_(ShoppingList.user_id == current_user.id, ShoppingList.is_archived == False)
        )
    )
    all_lists = lists_result.scalars().all()

    # Calculate item statistics
    total_items_purchased = 0
    total_items_count = 0
    completion_rates = []
    category_breakdown = {}

    for sl in all_lists:
        items = sl.items or []
        total = len(items)
        purchased = sum(1 for i in items if i.is_purchased)
        total_items_count += total
        total_items_purchased += purchased

        if total > 0:
            completion_rates.append(purchased / total * 100)

        for item in items:
            cat = item.category or "uncategorized"
            category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

    avg_items_per_list = total_items_count / len(all_lists) if all_lists else 0
    avg_completion_rate = sum(completion_rates) / len(completion_rates) if completion_rates else 0

    # Recent lists
    recent_result = await db.execute(
        select(ShoppingList).options(
            selectinload(ShoppingList.items)
        ).where(
            and_(ShoppingList.user_id == current_user.id, ShoppingList.is_archived == False)
        ).order_by(ShoppingList.created_at.desc()).limit(5)
    )
    recent = recent_result.scalars().all()

    recent_lists = []
    for sl in recent:
        summary = compute_list_summary(sl)
        recent_lists.append(ShoppingListSummaryResponse(
            id=sl.id,
            user_id=sl.user_id,
            name=sl.name,
            status=sl.status,
            estimated_cost=float(sl.estimated_cost) if sl.estimated_cost else None,
            completed_at=sl.completed_at,
            is_archived=sl.is_archived,
            created_at=sl.created_at,
            updated_at=sl.updated_at,
            total_items=summary["total_items"],
            purchased_items=summary["purchased_items"],
        ))

    return ShoppingListAnalytics(
        total_lists=total_lists,
        active_lists=active_lists,
        completed_lists=completed_lists,
        lists_this_week=lists_this_week,
        lists_this_month=lists_this_month,
        total_items_purchased=total_items_purchased,
        avg_items_per_list=avg_items_per_list,
        avg_completion_rate=avg_completion_rate,
        category_breakdown=category_breakdown,
        completion_trend={},  # TODO: Implement trend calculation
        recent_lists=recent_lists,
    )


@router.get("/history", response_model=ShoppingListHistory)
async def get_shopping_list_history(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get historical shopping list analytics."""
    today = date.today()
    start_date = today - relativedelta(months=months)

    # Get all lists in period with items
    result = await db.execute(
        select(ShoppingList).options(
            selectinload(ShoppingList.items)
        ).where(
            and_(
                ShoppingList.user_id == current_user.id,
                func.date(ShoppingList.created_at) >= start_date
            )
        ).order_by(ShoppingList.created_at.desc())
    )
    all_lists = result.scalars().all()

    # Calculate totals
    total_lists = len(all_lists)
    completed_lists = sum(1 for sl in all_lists if sl.status == "completed")
    total_items = sum(len(sl.items or []) for sl in all_lists)
    purchased_items = sum(
        sum(1 for i in (sl.items or []) if i.is_purchased)
        for sl in all_lists
    )

    # Monthly breakdown
    monthly_data = []
    category_trends = {}
    item_stats = {}

    current_month = today.replace(day=1)
    for i in range(months):
        month_start = current_month - relativedelta(months=i)
        month_end = month_start + relativedelta(months=1) - timedelta(days=1)
        month_key = month_start.strftime("%Y-%m")
        month_label = month_start.strftime("%b %Y")

        # Filter lists for this month
        month_lists = [
            sl for sl in all_lists
            if month_start <= sl.created_at.date() <= month_end
        ]

        month_total_items = 0
        month_purchased = 0
        cat_breakdown = {}

        for sl in month_lists:
            items = sl.items or []
            month_total_items += len(items)
            month_purchased += sum(1 for i in items if i.is_purchased)

            for item in items:
                cat = item.category or "uncategorized"
                cat_breakdown[cat] = cat_breakdown.get(cat, 0) + 1

                # Track item statistics
                name = item.ingredient_name.lower().strip()
                if name not in item_stats:
                    item_stats[name] = {
                        "item_name": item.ingredient_name,
                        "occurrence_count": 0,
                        "purchase_count": 0,
                        "last_added": sl.created_at.date(),
                    }
                item_stats[name]["occurrence_count"] += 1
                if item.is_purchased:
                    item_stats[name]["purchase_count"] += 1
                if sl.created_at.date() > item_stats[name]["last_added"]:
                    item_stats[name]["last_added"] = sl.created_at.date()

        completion_rate = (month_purchased / month_total_items * 100) if month_total_items > 0 else 0
        month_completed = sum(1 for sl in month_lists if sl.status == "completed")

        monthly_data.append(MonthlyShoppingData(
            month=month_key,
            month_label=month_label,
            total_lists=len(month_lists),
            completed_lists=month_completed,
            total_items=month_total_items,
            purchased_items=month_purchased,
            completion_rate=completion_rate,
            category_breakdown=cat_breakdown,
        ))

        # Aggregate category trends
        for cat, count in cat_breakdown.items():
            if cat not in category_trends:
                category_trends[cat] = {}
            category_trends[cat][month_key] = count

    # Reverse to show oldest first
    monthly_data.reverse()

    # Top items
    top_items = sorted(
        item_stats.values(),
        key=lambda x: x["occurrence_count"],
        reverse=True
    )[:10]

    top_items_response = [
        TopShoppingItem(
            item_name=item["item_name"],
            occurrence_count=item["occurrence_count"],
            purchase_count=item["purchase_count"],
            last_added=item["last_added"],
        )
        for item in top_items
    ]

    avg_completion_rate = (purchased_items / total_items * 100) if total_items > 0 else 0

    return ShoppingListHistory(
        period_months=months,
        total_lists=total_lists,
        completed_lists=completed_lists,
        total_items=total_items,
        purchased_items=purchased_items,
        avg_monthly_lists=total_lists / months if months > 0 else 0,
        avg_completion_rate=avg_completion_rate,
        monthly_data=monthly_data,
        top_items=top_items_response,
        category_trends=category_trends,
    )


@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(
    months: int = Query(3, ge=1, le=12, description="Months to analyze for suggestions"),
    limit: int = Query(20, ge=1, le=50, description="Max suggestions to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get item suggestions based on grocery purchase history."""
    start_date = date.today() - relativedelta(months=months)

    # Get grocery purchase history
    result = await db.execute(
        select(Grocery).where(
            and_(
                Grocery.user_id == current_user.id,
                Grocery.purchase_date >= start_date
            )
        )
    )
    groceries = result.scalars().all()

    # Aggregate by item name
    item_stats = {}
    for g in groceries:
        name = g.item_name.lower().strip()
        if name not in item_stats:
            item_stats[name] = {
                "item_name": g.item_name,
                "category": g.category,
                "frequency": 0,
                "last_purchased": g.purchase_date,
                "quantities": [],
                "units": {},
            }
        item_stats[name]["frequency"] += 1
        if g.purchase_date > item_stats[name]["last_purchased"]:
            item_stats[name]["last_purchased"] = g.purchase_date
        if g.quantity:
            item_stats[name]["quantities"].append(g.quantity)
        if g.unit:
            item_stats[name]["units"][g.unit] = item_stats[name]["units"].get(g.unit, 0) + 1

    # Sort by frequency and build response
    sorted_items = sorted(item_stats.values(), key=lambda x: x["frequency"], reverse=True)[:limit]

    suggestions = []
    for item in sorted_items:
        avg_qty = sum(item["quantities"]) / len(item["quantities"]) if item["quantities"] else None
        common_unit = max(item["units"].items(), key=lambda x: x[1])[0] if item["units"] else None

        suggestions.append(SuggestedItem(
            item_name=item["item_name"],
            category=item["category"],
            frequency=item["frequency"],
            last_purchased=item["last_purchased"],
            avg_quantity=avg_qty,
            common_unit=common_unit,
        ))

    return SuggestionsResponse(
        suggestions=suggestions,
        based_on_months=months,
    )


# ==================== Import/Parse Endpoints ====================


def _convert_ai_item_to_shopping_list_item(item: dict) -> ShoppingListItemCreate:
    """Convert AI parsed item to ShoppingListItemCreate schema."""
    # Map category if valid
    category = None
    if item.get("category"):
        try:
            category = ShoppingListItemCategory(item["category"])
        except ValueError:
            pass

    return ShoppingListItemCreate(
        ingredient_name=item.get("item_name", "").strip(),
        quantity=item.get("quantity"),
        unit=item.get("unit"),
        category=category,
    )


def _simple_parse_shopping_list_text(text: str) -> ParseShoppingListResponse:
    """Simple line-by-line parsing as fallback."""
    import re
    parsed_items = []

    lines = text.strip().split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Try to extract quantity and unit from the start
        # Pattern: "2 kg apples" or "3x milk" or "2л молока"
        match = re.match(r"^(\d+(?:\.\d+)?)\s*([a-zA-Zа-яА-ЯіІїЇєЄґҐ]*)\s*[x×]?\s*(.+)$", line, re.IGNORECASE)
        if match:
            quantity = float(match.group(1))
            unit = match.group(2).lower() if match.group(2) else None
            item_name = match.group(3).strip()
        else:
            # Just the item name
            quantity = None
            unit = None
            item_name = line

        if item_name:
            parsed_items.append(ShoppingListItemCreate(
                ingredient_name=item_name,
                quantity=quantity,
                unit=unit,
                category=None,
            ))

    return ParseShoppingListResponse(
        parsed_items=parsed_items,
        raw_text=text,
        success=True,
        message=None,
    )


@router.post("/parse-text", response_model=ParseShoppingListResponse)
async def parse_shopping_list_text(
    request: ParseShoppingListTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse shopping list items from text using AI."""
    try:
        # Use AI service to parse the text (reuse grocery parser)
        ai_parsed_items = await ai_service.parse_grocery_text(
            text=request.text,
            db=db,
            user_id=current_user.id,
        )

        if not ai_parsed_items:
            # Fall back to simple parsing if AI fails
            return _simple_parse_shopping_list_text(request.text)

        # Convert AI response to ShoppingListItemCreate objects
        parsed_items = [_convert_ai_item_to_shopping_list_item(item) for item in ai_parsed_items]

        return ParseShoppingListResponse(
            parsed_items=parsed_items,
            raw_text=request.text,
            success=True,
            message=None,
        )

    except Exception as e:
        print(f"[Shopping List Parse] Error: {str(e)}")
        # Fall back to simple parsing
        return _simple_parse_shopping_list_text(request.text)


@router.post("/parse-voice", response_model=ParseShoppingListResponse)
async def parse_shopping_list_voice(
    audio: UploadFile = File(...),
    language: str = Form(default="auto"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse shopping list items from voice recording using AI transcription."""
    try:
        # Read audio file content
        audio_content = await audio.read()

        if len(audio_content) < 1000:
            return ParseShoppingListResponse(
                parsed_items=[],
                raw_text="[Voice recording too short]",
                success=True,
                message="Recording too short. Please record for at least a few seconds."
            )

        # Create a file-like object for OpenAI
        audio_file = io.BytesIO(audio_content)
        filename = audio.filename or "recording.webm"
        audio_file.name = filename

        # Transcribe audio using OpenAI Whisper
        transcript = ai_service.client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=None if language == "auto" else language,
        )

        transcribed_text = transcript.text.strip()

        if not transcribed_text:
            return ParseShoppingListResponse(
                parsed_items=[],
                raw_text="",
                success=True,
                message="Could not transcribe any text from the audio."
            )

        # Parse the transcribed text using AI
        ai_parsed_items = await ai_service.parse_grocery_text(
            text=transcribed_text,
            db=db,
            user_id=current_user.id,
        )

        if ai_parsed_items:
            parsed_items = [_convert_ai_item_to_shopping_list_item(item) for item in ai_parsed_items]
        else:
            # Fall back to simple parsing
            result = _simple_parse_shopping_list_text(transcribed_text)
            parsed_items = result.parsed_items

        return ParseShoppingListResponse(
            parsed_items=parsed_items,
            raw_text=transcribed_text,
            success=True,
            message=None,
        )

    except Exception as e:
        print(f"[Shopping List Voice Parse] Error: {str(e)}")
        return ParseShoppingListResponse(
            parsed_items=[],
            raw_text="",
            success=False,
            message=f"Failed to process voice recording: {str(e)}"
        )


@router.post("/parse-image", response_model=ParseShoppingListResponse)
async def parse_shopping_list_image(
    image: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None),
    import_type: str = Form(default="shopping_list"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse shopping list items from image (handwritten list, screenshot, etc.)."""
    try:
        # Get the image(s) to process
        files_to_process = []
        if images:
            files_to_process = images
        elif image:
            files_to_process = [image]
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No image provided"
            )

        # Read and encode images
        image_contents = []
        for file in files_to_process:
            content = await file.read()
            image_contents.append(content)

        # Use AI service to parse the image(s)
        ai_parsed_items = await ai_service.parse_grocery_images(
            images=image_contents,
            import_type=import_type,
            db=db,
            user_id=current_user.id,
        )

        if not ai_parsed_items:
            return ParseShoppingListResponse(
                parsed_items=[],
                raw_text=f"[{import_type} image]",
                success=True,
                message="Could not extract items from the image. Please try with a clearer image."
            )

        # Convert to ShoppingListItemCreate objects
        parsed_items = [_convert_ai_item_to_shopping_list_item(item) for item in ai_parsed_items]

        return ParseShoppingListResponse(
            parsed_items=parsed_items,
            raw_text=f"[Parsed from {import_type} image]",
            success=True,
            message=None,
        )

    except Exception as e:
        print(f"[Shopping List Image Parse] Error: {str(e)}")
        return ParseShoppingListResponse(
            parsed_items=[],
            raw_text="",
            success=False,
            message=f"Failed to process image: {str(e)}"
        )


@router.get("/{list_id}", response_model=ShoppingListResponse)
async def get_shopping_list(
    list_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single shopping list by ID with all items."""
    result = await db.execute(
        select(ShoppingList).options(
            selectinload(ShoppingList.items)
        ).where(
            and_(ShoppingList.id == list_id, ShoppingList.user_id == current_user.id)
        )
    )
    shopping_list = result.scalar_one_or_none()

    if not shopping_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found"
        )

    summary = compute_list_summary(shopping_list)
    return ShoppingListResponse(
        id=shopping_list.id,
        user_id=shopping_list.user_id,
        name=shopping_list.name,
        status=shopping_list.status,
        estimated_cost=float(shopping_list.estimated_cost) if shopping_list.estimated_cost else None,
        completed_at=shopping_list.completed_at,
        is_archived=shopping_list.is_archived,
        created_at=shopping_list.created_at,
        updated_at=shopping_list.updated_at,
        items=[ShoppingListItemResponse.model_validate(i) for i in shopping_list.items],
        total_items=summary["total_items"],
        purchased_items=summary["purchased_items"],
    )


@router.put("/{list_id}", response_model=ShoppingListResponse)
async def update_shopping_list(
    list_id: UUID,
    request: ShoppingListUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a shopping list."""
    result = await db.execute(
        select(ShoppingList).options(
            selectinload(ShoppingList.items)
        ).where(
            and_(ShoppingList.id == list_id, ShoppingList.user_id == current_user.id)
        )
    )
    shopping_list = result.scalar_one_or_none()

    if not shopping_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found"
        )

    # Update only provided fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "status" and value is not None:
            setattr(shopping_list, field, value.value if hasattr(value, "value") else value)
            # Set completed_at when status changes to completed
            if value == "completed" or value.value == "completed":
                shopping_list.completed_at = datetime.utcnow()
        else:
            setattr(shopping_list, field, value)

    await db.commit()
    await db.refresh(shopping_list)

    summary = compute_list_summary(shopping_list)
    return ShoppingListResponse(
        id=shopping_list.id,
        user_id=shopping_list.user_id,
        name=shopping_list.name,
        status=shopping_list.status,
        estimated_cost=float(shopping_list.estimated_cost) if shopping_list.estimated_cost else None,
        completed_at=shopping_list.completed_at,
        is_archived=shopping_list.is_archived,
        created_at=shopping_list.created_at,
        updated_at=shopping_list.updated_at,
        items=[ShoppingListItemResponse.model_validate(i) for i in shopping_list.items],
        total_items=summary["total_items"],
        purchased_items=summary["purchased_items"],
    )


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shopping_list(
    list_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a shopping list and all its items."""
    result = await db.execute(
        select(ShoppingList).where(
            and_(ShoppingList.id == list_id, ShoppingList.user_id == current_user.id)
        )
    )
    shopping_list = result.scalar_one_or_none()

    if not shopping_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found"
        )

    await db.delete(shopping_list)
    await db.commit()


# ==================== Item Management ====================

@router.post("/{list_id}/items", response_model=List[ShoppingListItemResponse], status_code=status.HTTP_201_CREATED)
async def add_items_to_list(
    list_id: UUID,
    request: AddItemsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add items to a shopping list."""
    result = await db.execute(
        select(ShoppingList).where(
            and_(ShoppingList.id == list_id, ShoppingList.user_id == current_user.id)
        )
    )
    shopping_list = result.scalar_one_or_none()

    if not shopping_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found"
        )

    created_items = []
    for item_data in request.items:
        item = ShoppingListItem(
            shopping_list_id=list_id,
            ingredient_name=item_data.ingredient_name,
            quantity=item_data.quantity,
            unit=item_data.unit,
            category=item_data.category.value if item_data.category else None,
            is_purchased=False,
        )
        db.add(item)
        created_items.append(item)

    await db.commit()

    for item in created_items:
        await db.refresh(item)

    return [ShoppingListItemResponse.model_validate(i) for i in created_items]


@router.put("/{list_id}/items/{item_id}", response_model=ShoppingListItemResponse)
async def update_item(
    list_id: UUID,
    item_id: UUID,
    request: ShoppingListItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a shopping list item."""
    # Verify list ownership
    list_result = await db.execute(
        select(ShoppingList).where(
            and_(ShoppingList.id == list_id, ShoppingList.user_id == current_user.id)
        )
    )
    if not list_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found"
        )

    # Get item
    item_result = await db.execute(
        select(ShoppingListItem).where(
            and_(ShoppingListItem.id == item_id, ShoppingListItem.shopping_list_id == list_id)
        )
    )
    item = item_result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "category" and value is not None:
            setattr(item, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(item, field, value)

    await db.commit()
    await db.refresh(item)

    return ShoppingListItemResponse.model_validate(item)


@router.delete("/{list_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    list_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a shopping list item."""
    # Verify list ownership
    list_result = await db.execute(
        select(ShoppingList).where(
            and_(ShoppingList.id == list_id, ShoppingList.user_id == current_user.id)
        )
    )
    if not list_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found"
        )

    # Get and delete item
    item_result = await db.execute(
        select(ShoppingListItem).where(
            and_(ShoppingListItem.id == item_id, ShoppingListItem.shopping_list_id == list_id)
        )
    )
    item = item_result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    await db.delete(item)
    await db.commit()


@router.post("/{list_id}/toggle-items", response_model=BulkActionResponse)
async def toggle_items_purchased(
    list_id: UUID,
    request: ToggleItemsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle purchased status for multiple items."""
    # Verify list ownership
    list_result = await db.execute(
        select(ShoppingList).where(
            and_(ShoppingList.id == list_id, ShoppingList.user_id == current_user.id)
        )
    )
    if not list_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shopping list not found"
        )

    # Get items
    items_result = await db.execute(
        select(ShoppingListItem).where(
            and_(
                ShoppingListItem.id.in_(request.item_ids),
                ShoppingListItem.shopping_list_id == list_id
            )
        )
    )
    items = items_result.scalars().all()

    if not items:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching items found"
        )

    for item in items:
        item.is_purchased = request.is_purchased

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(items),
        message=f"Updated {len(items)} item(s)"
    )


# ==================== Bulk Operations ====================

@router.post("/bulk-archive", response_model=BulkActionResponse)
async def bulk_archive_lists(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive multiple shopping lists."""
    result = await db.execute(
        select(ShoppingList).where(
            and_(
                ShoppingList.id.in_(request.ids),
                ShoppingList.user_id == current_user.id
            )
        )
    )
    lists = result.scalars().all()

    if not lists:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching shopping lists found"
        )

    for sl in lists:
        sl.is_archived = True

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(lists),
        message=f"Successfully archived {len(lists)} list(s)"
    )


@router.post("/bulk-unarchive", response_model=BulkActionResponse)
async def bulk_unarchive_lists(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unarchive multiple shopping lists."""
    result = await db.execute(
        select(ShoppingList).where(
            and_(
                ShoppingList.id.in_(request.ids),
                ShoppingList.user_id == current_user.id
            )
        )
    )
    lists = result.scalars().all()

    if not lists:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching shopping lists found"
        )

    for sl in lists:
        sl.is_archived = False

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(lists),
        message=f"Successfully unarchived {len(lists)} list(s)"
    )


@router.post("/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_lists(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple shopping lists."""
    result = await db.execute(
        select(ShoppingList).where(
            and_(
                ShoppingList.id.in_(request.ids),
                ShoppingList.user_id == current_user.id
            )
        )
    )
    lists = result.scalars().all()

    if not lists:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching shopping lists found"
        )

    count = len(lists)
    for sl in lists:
        await db.delete(sl)

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=count,
        message=f"Successfully deleted {count} list(s)"
    )


@router.post("/bulk-complete", response_model=BulkActionResponse)
async def bulk_complete_lists(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark multiple shopping lists as completed."""
    result = await db.execute(
        select(ShoppingList).where(
            and_(
                ShoppingList.id.in_(request.ids),
                ShoppingList.user_id == current_user.id
            )
        )
    )
    lists = result.scalars().all()

    if not lists:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching shopping lists found"
        )

    for sl in lists:
        sl.status = "completed"
        sl.completed_at = datetime.utcnow()

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(lists),
        message=f"Successfully completed {len(lists)} list(s)"
    )
