"""Service layer for restaurant meal operations.

Business/DB logic extracted verbatim from the restaurant route handlers.
Ownership lookups use ``get_owned_or_404``.

Note: this module raises ``HTTPException`` directly (via ``get_owned_or_404``
and inline raises) rather than translating in the router, to preserve the exact
status codes and detail strings of the original handlers.

Pagination is kept inline (``math.ceil(total / per_page) if total > 0 else 1``)
because the list endpoints use ``else 1`` for the empty case, which differs from
``app.utils.pagination.paginate`` (``else 0``); adopting ``paginate`` would change
behavior, so it is intentionally NOT used here.
"""
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import Optional, List
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from uuid import UUID
import math
import re

from app.api.deps import get_owned_or_404
from app.models.user import User
from app.models.restaurant import Restaurant, RestaurantMeal
from app.services.ai_service import ai_service
from app.api.v1.routes.restaurants.schemas import (
    # Restaurant schemas
    RestaurantCreate,
    RestaurantUpdate,
    RestaurantResponse,
    RestaurantListResponse,
    # Meal schemas
    RestaurantMealCreate,
    RestaurantMealBatchCreate,
    RestaurantMealUpdate,
    RestaurantMealResponse,
    RestaurantMealListResponse,
    # Bulk actions
    BulkActionRequest,
    BulkActionResponse,
    # Analytics
    RestaurantMealAnalytics,
    MealsByOrderType,
    MealsByMealType,
    TopRestaurant,
    MealsByTag,
    RestaurantMealHistory,
    MonthlyMealData,
    # Import
    ParseTextRequest,
    ParseTextResponse,
    MealType,
    OrderType,
    ImportSource,
)


# ============ Restaurant Meals CRUD ============

async def list_restaurant_meals(
    db: AsyncSession,
    current_user: User,
    search: Optional[str] = None,
    restaurant_id: Optional[UUID] = None,
    meal_type: Optional[str] = None,
    order_type: Optional[str] = None,
    rating_min: Optional[int] = None,
    rating_max: Optional[int] = None,
    tags: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    is_archived: bool = False,
    sort_by: str = "meal_date",
    sort_order: str = "desc",
    page: int = 1,
    per_page: int = 50,
) -> RestaurantMealListResponse:
    """List restaurant meals with filters, sorting, and pagination."""
    query = select(RestaurantMeal).where(RestaurantMeal.user_id == current_user.id)

    # Apply filters
    query = query.where(RestaurantMeal.is_archived == is_archived)

    if search:
        search_filter = or_(
            RestaurantMeal.restaurant_name.ilike(f"%{search}%"),
            RestaurantMeal.description.ilike(f"%{search}%"),
            RestaurantMeal.notes.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    if restaurant_id:
        query = query.where(RestaurantMeal.restaurant_id == restaurant_id)

    if meal_type:
        query = query.where(RestaurantMeal.meal_type == meal_type)

    if order_type:
        query = query.where(RestaurantMeal.order_type == order_type)

    if rating_min:
        query = query.where(RestaurantMeal.rating >= rating_min)

    if rating_max:
        query = query.where(RestaurantMeal.rating <= rating_max)

    if tags:
        tags_list = [t.strip() for t in tags.split(",")]
        query = query.where(RestaurantMeal.tags.overlap(tags_list))

    if date_from:
        query = query.where(RestaurantMeal.meal_date >= date_from)

    if date_to:
        query = query.where(RestaurantMeal.meal_date <= date_to)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply sorting
    sort_column = getattr(RestaurantMeal, sort_by, RestaurantMeal.meal_date)
    if sort_order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Apply pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    # Execute query
    result = await db.execute(query)
    meals = result.scalars().all()

    total_pages = math.ceil(total / per_page) if total > 0 else 1

    return RestaurantMealListResponse(
        items=[RestaurantMealResponse.model_validate(m) for m in meals],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


async def create_restaurant_meals(
    db: AsyncSession,
    current_user: User,
    request: RestaurantMealBatchCreate,
) -> List[RestaurantMealResponse]:
    """Create one or more restaurant meals with automatic nutrition estimation."""
    created_meals = []

    for item_data in request.items:
        # Start with provided nutrition values (if any)
        estimated_calories = item_data.estimated_calories
        estimated_protein_g = item_data.estimated_protein_g
        estimated_carbs_g = item_data.estimated_carbs_g
        estimated_fat_g = item_data.estimated_fat_g
        estimated_fiber_g = item_data.estimated_fiber_g
        estimated_sugar_g = item_data.estimated_sugar_g
        estimated_sodium_mg = item_data.estimated_sodium_mg

        # Auto-estimate nutrition if not provided and we have items ordered
        if estimated_calories is None and item_data.items_ordered:
            try:
                nutrition = await ai_service.estimate_restaurant_meal_nutrition(
                    restaurant_name=item_data.restaurant_name,
                    items_ordered=item_data.items_ordered,
                    meal_type=item_data.meal_type.value,
                )
                if nutrition:
                    estimated_calories = nutrition.get("calories")
                    estimated_protein_g = nutrition.get("protein_g")
                    estimated_carbs_g = nutrition.get("carbs_g")
                    estimated_fat_g = nutrition.get("fat_g")
                    estimated_fiber_g = nutrition.get("fiber_g")
                    estimated_sugar_g = nutrition.get("sugar_g")
                    estimated_sodium_mg = nutrition.get("sodium_mg")
            except Exception as e:
                # Log error but don't fail meal creation
                print(f"[Restaurants] Failed to estimate nutrition for '{item_data.restaurant_name}': {e}")

        meal = RestaurantMeal(
            user_id=current_user.id,
            restaurant_id=item_data.restaurant_id,
            restaurant_name=item_data.restaurant_name,
            meal_date=item_data.meal_date,
            meal_time=item_data.meal_time,
            meal_type=item_data.meal_type.value,
            order_type=item_data.order_type.value,
            items_ordered=item_data.items_ordered,
            description=item_data.description,
            estimated_calories=estimated_calories,
            estimated_protein_g=estimated_protein_g,
            estimated_carbs_g=estimated_carbs_g,
            estimated_fat_g=estimated_fat_g,
            estimated_fiber_g=estimated_fiber_g,
            estimated_sugar_g=estimated_sugar_g,
            estimated_sodium_mg=estimated_sodium_mg,
            rating=item_data.rating,
            feeling_after=item_data.feeling_after,
            tags=item_data.tags,
            notes=item_data.notes,
            image_url=item_data.image_url,
            import_source=item_data.import_source.value,
            is_archived=False,
        )
        db.add(meal)
        created_meals.append(meal)

    await db.commit()

    for meal in created_meals:
        await db.refresh(meal)

    return [RestaurantMealResponse.model_validate(m) for m in created_meals]


async def get_restaurant_meal_analytics(
    db: AsyncSession,
    current_user: User,
) -> RestaurantMealAnalytics:
    """Get restaurant meal analytics data."""
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Base query for user's non-archived meals
    base_query = select(RestaurantMeal).where(
        and_(RestaurantMeal.user_id == current_user.id, RestaurantMeal.is_archived == False)
    )

    # Total meals
    total_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total_meals = total_result.scalar() or 0

    # Meals this week
    week_result = await db.execute(
        select(func.count()).where(
            and_(
                RestaurantMeal.user_id == current_user.id,
                RestaurantMeal.is_archived == False,
                RestaurantMeal.meal_date >= week_ago
            )
        )
    )
    meals_this_week = week_result.scalar() or 0

    # Meals this month
    month_result = await db.execute(
        select(func.count()).where(
            and_(
                RestaurantMeal.user_id == current_user.id,
                RestaurantMeal.is_archived == False,
                RestaurantMeal.meal_date >= month_ago
            )
        )
    )
    meals_this_month = month_result.scalar() or 0

    # Average rating
    avg_rating_result = await db.execute(
        select(func.avg(RestaurantMeal.rating)).where(
            and_(
                RestaurantMeal.user_id == current_user.id,
                RestaurantMeal.is_archived == False,
                RestaurantMeal.rating.isnot(None)
            )
        )
    )
    avg_rating = avg_rating_result.scalar()
    avg_rating = round(float(avg_rating), 1) if avg_rating else None

    # Average feeling
    avg_feeling_result = await db.execute(
        select(func.avg(RestaurantMeal.feeling_after)).where(
            and_(
                RestaurantMeal.user_id == current_user.id,
                RestaurantMeal.is_archived == False,
                RestaurantMeal.feeling_after.isnot(None)
            )
        )
    )
    avg_feeling = avg_feeling_result.scalar()
    avg_feeling = round(float(avg_feeling), 1) if avg_feeling else None

    # By order type
    order_type_result = await db.execute(
        select(RestaurantMeal.order_type, func.count()).where(
            and_(RestaurantMeal.user_id == current_user.id, RestaurantMeal.is_archived == False)
        ).group_by(RestaurantMeal.order_type)
    )
    by_order_type = [
        MealsByOrderType(order_type=row[0], count=row[1])
        for row in order_type_result.all()
    ]

    # By meal type
    meal_type_result = await db.execute(
        select(RestaurantMeal.meal_type, func.count()).where(
            and_(RestaurantMeal.user_id == current_user.id, RestaurantMeal.is_archived == False)
        ).group_by(RestaurantMeal.meal_type)
    )
    by_meal_type = [
        MealsByMealType(meal_type=row[0], count=row[1])
        for row in meal_type_result.all()
    ]

    # Top restaurants
    top_restaurants_result = await db.execute(
        select(
            RestaurantMeal.restaurant_name,
            RestaurantMeal.restaurant_id,
            func.count().label("visit_count"),
            func.avg(RestaurantMeal.rating).label("avg_rating")
        ).where(
            and_(RestaurantMeal.user_id == current_user.id, RestaurantMeal.is_archived == False)
        ).group_by(
            RestaurantMeal.restaurant_name,
            RestaurantMeal.restaurant_id
        ).order_by(func.count().desc()).limit(10)
    )
    top_restaurants = [
        TopRestaurant(
            restaurant_name=row[0],
            restaurant_id=row[1],
            visit_count=row[2],
            avg_rating=round(float(row[3]), 1) if row[3] else None
        )
        for row in top_restaurants_result.all()
    ]

    # By tags
    all_meals_result = await db.execute(
        select(RestaurantMeal.tags).where(
            and_(
                RestaurantMeal.user_id == current_user.id,
                RestaurantMeal.is_archived == False,
                RestaurantMeal.tags.isnot(None)
            )
        )
    )
    tag_counts = {}
    for row in all_meals_result.all():
        if row[0]:
            for tag in row[0]:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
    by_tags = [
        MealsByTag(tag=tag, count=count)
        for tag, count in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
    ][:10]

    # Recent meals
    recent_result = await db.execute(
        select(RestaurantMeal).where(
            and_(RestaurantMeal.user_id == current_user.id, RestaurantMeal.is_archived == False)
        ).order_by(RestaurantMeal.meal_date.desc(), RestaurantMeal.created_at.desc()).limit(10)
    )
    recent_meals = [RestaurantMealResponse.model_validate(m) for m in recent_result.scalars().all()]

    return RestaurantMealAnalytics(
        total_meals=total_meals,
        meals_this_week=meals_this_week,
        meals_this_month=meals_this_month,
        avg_rating=avg_rating,
        avg_feeling=avg_feeling,
        by_order_type=by_order_type,
        by_meal_type=by_meal_type,
        top_restaurants=top_restaurants,
        by_tags=by_tags,
        home_vs_out=None,  # TODO: Integrate with meal planner for home-cooked meals
        recent_meals=recent_meals,
    )


async def get_restaurant_meal_history(
    db: AsyncSession,
    current_user: User,
    months: int = 3,
) -> RestaurantMealHistory:
    """Get historical restaurant meal analytics."""
    today = date.today()
    start_date = today - relativedelta(months=months)

    # Get all meals in the period
    result = await db.execute(
        select(RestaurantMeal).where(
            and_(
                RestaurantMeal.user_id == current_user.id,
                RestaurantMeal.meal_date >= start_date
            )
        ).order_by(RestaurantMeal.meal_date.desc())
    )
    all_meals = result.scalars().all()

    total_meals = len(all_meals)

    # Monthly breakdown
    monthly_data = []
    current_month = today.replace(day=1)

    for i in range(months):
        month_start = current_month - relativedelta(months=i)
        month_end = month_start + relativedelta(months=1) - timedelta(days=1)
        month_key = month_start.strftime("%Y-%m")
        month_label = month_start.strftime("%b %Y")

        # Filter meals for this month
        month_meals = [
            m for m in all_meals
            if month_start <= m.meal_date <= month_end
        ]

        # By order type
        order_type_breakdown = {}
        meal_type_breakdown = {}
        restaurant_set = set()
        ratings = []

        for m in month_meals:
            order_type_breakdown[m.order_type] = order_type_breakdown.get(m.order_type, 0) + 1
            meal_type_breakdown[m.meal_type] = meal_type_breakdown.get(m.meal_type, 0) + 1
            restaurant_set.add(m.restaurant_name)
            if m.rating:
                ratings.append(m.rating)

        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None

        monthly_data.append(MonthlyMealData(
            month=month_key,
            month_label=month_label,
            total_meals=len(month_meals),
            by_order_type=order_type_breakdown,
            by_meal_type=meal_type_breakdown,
            avg_rating=avg_rating,
            unique_restaurants=len(restaurant_set),
        ))

    # Reverse to show oldest first
    monthly_data.reverse()

    # All-time top restaurants
    restaurant_stats = {}
    for m in all_meals:
        key = m.restaurant_name
        if key not in restaurant_stats:
            restaurant_stats[key] = {
                "restaurant_name": m.restaurant_name,
                "restaurant_id": m.restaurant_id,
                "visit_count": 0,
                "ratings": []
            }
        restaurant_stats[key]["visit_count"] += 1
        if m.rating:
            restaurant_stats[key]["ratings"].append(m.rating)

    all_time_top = sorted(
        restaurant_stats.values(),
        key=lambda x: x["visit_count"],
        reverse=True
    )[:10]

    all_time_top_restaurants = [
        TopRestaurant(
            restaurant_name=r["restaurant_name"],
            restaurant_id=r["restaurant_id"],
            visit_count=r["visit_count"],
            avg_rating=round(sum(r["ratings"]) / len(r["ratings"]), 1) if r["ratings"] else None
        )
        for r in all_time_top
    ]

    return RestaurantMealHistory(
        period_months=months,
        total_meals=total_meals,
        avg_monthly_meals=total_meals / months if months > 0 else 0,
        monthly_data=monthly_data,
        all_time_top_restaurants=all_time_top_restaurants,
    )


async def get_restaurant_meal(
    db: AsyncSession,
    current_user: User,
    meal_id: UUID,
) -> RestaurantMealResponse:
    """Get a single restaurant meal by ID."""
    meal = await get_owned_or_404(
        db, RestaurantMeal, meal_id, current_user,
        detail="Restaurant meal not found",
    )

    return RestaurantMealResponse.model_validate(meal)


async def update_restaurant_meal(
    db: AsyncSession,
    current_user: User,
    meal_id: UUID,
    request: RestaurantMealUpdate,
) -> RestaurantMealResponse:
    """Update a restaurant meal."""
    meal = await get_owned_or_404(
        db, RestaurantMeal, meal_id, current_user,
        detail="Restaurant meal not found",
    )

    # Update only provided fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ("meal_type", "order_type") and value is not None:
            setattr(meal, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(meal, field, value)

    await db.commit()
    await db.refresh(meal)

    return RestaurantMealResponse.model_validate(meal)


async def calculate_restaurant_meal_nutrition(
    db: AsyncSession,
    current_user: User,
    meal_id: UUID,
) -> RestaurantMealResponse:
    """Calculate or recalculate nutrition for a restaurant meal using AI."""
    meal = await get_owned_or_404(
        db, RestaurantMeal, meal_id, current_user,
        detail="Restaurant meal not found",
    )

    if not meal.items_ordered:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot estimate nutrition without items ordered"
        )

    try:
        nutrition = await ai_service.estimate_restaurant_meal_nutrition(
            restaurant_name=meal.restaurant_name,
            items_ordered=meal.items_ordered,
            meal_type=meal.meal_type,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to estimate nutrition: {str(e)}"
        )

    if not nutrition:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI returned empty nutrition data"
        )

    # Update the meal with estimated nutrition
    meal.estimated_calories = nutrition.get("calories")
    meal.estimated_protein_g = nutrition.get("protein_g")
    meal.estimated_carbs_g = nutrition.get("carbs_g")
    meal.estimated_fat_g = nutrition.get("fat_g")
    meal.estimated_fiber_g = nutrition.get("fiber_g")
    meal.estimated_sugar_g = nutrition.get("sugar_g")
    meal.estimated_sodium_mg = nutrition.get("sodium_mg")

    await db.commit()
    await db.refresh(meal)

    return RestaurantMealResponse.model_validate(meal)


async def delete_restaurant_meal(
    db: AsyncSession,
    current_user: User,
    meal_id: UUID,
) -> None:
    """Delete a restaurant meal."""
    meal = await get_owned_or_404(
        db, RestaurantMeal, meal_id, current_user,
        detail="Restaurant meal not found",
    )

    await db.delete(meal)
    await db.commit()


# ============ Bulk Actions ============

async def bulk_archive_meals(
    db: AsyncSession,
    current_user: User,
    request: BulkActionRequest,
) -> BulkActionResponse:
    """Archive multiple restaurant meals."""
    result = await db.execute(
        select(RestaurantMeal).where(
            and_(
                RestaurantMeal.id.in_(request.ids),
                RestaurantMeal.user_id == current_user.id
            )
        )
    )
    meals = result.scalars().all()

    if not meals:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching meals found"
        )

    for meal in meals:
        meal.is_archived = True

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(meals),
        message=f"Successfully archived {len(meals)} meal(s)"
    )


async def bulk_unarchive_meals(
    db: AsyncSession,
    current_user: User,
    request: BulkActionRequest,
) -> BulkActionResponse:
    """Unarchive multiple restaurant meals."""
    result = await db.execute(
        select(RestaurantMeal).where(
            and_(
                RestaurantMeal.id.in_(request.ids),
                RestaurantMeal.user_id == current_user.id
            )
        )
    )
    meals = result.scalars().all()

    if not meals:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching meals found"
        )

    for meal in meals:
        meal.is_archived = False

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(meals),
        message=f"Successfully unarchived {len(meals)} meal(s)"
    )


async def bulk_delete_meals(
    db: AsyncSession,
    current_user: User,
    request: BulkActionRequest,
) -> BulkActionResponse:
    """Delete multiple restaurant meals."""
    result = await db.execute(
        select(RestaurantMeal).where(
            and_(
                RestaurantMeal.id.in_(request.ids),
                RestaurantMeal.user_id == current_user.id
            )
        )
    )
    meals = result.scalars().all()

    if not meals:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching meals found"
        )

    count = len(meals)
    for meal in meals:
        await db.delete(meal)

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=count,
        message=f"Successfully deleted {count} meal(s)"
    )


# ============ Import Endpoints ============

async def parse_meal_text(
    db: AsyncSession,
    current_user: User,
    request: ParseTextRequest,
) -> ParseTextResponse:
    """Parse restaurant meal from text input.

    Supports multiple formats:
    - Each line is a separate meal: "McDonald's: bigmac, fries"
    - With meal type: "McDonald's - lunch, delivery - bigmac, fries"
    - Simple format: "McDonald's bigmac fries"
    """
    default_date = request.default_date or date.today()
    text = request.text.strip()
    lines = [line.strip() for line in text.split("\n") if line.strip()]

    parsed_meals = []

    # Keywords for meal type detection
    meal_type_keywords = {
        "breakfast": MealType.BREAKFAST,
        "сніданок": MealType.BREAKFAST,
        "завтрак": MealType.BREAKFAST,
        "lunch": MealType.LUNCH,
        "обід": MealType.LUNCH,
        "обед": MealType.LUNCH,
        "dinner": MealType.DINNER,
        "вечеря": MealType.DINNER,
        "ужин": MealType.DINNER,
        "snack": MealType.SNACK,
        "перекус": MealType.SNACK,
    }

    # Keywords for order type detection
    order_type_keywords = {
        "delivery": OrderType.DELIVERY,
        "доставка": OrderType.DELIVERY,
        "takeout": OrderType.TAKEOUT,
        "takeaway": OrderType.TAKEOUT,
        "на виніс": OrderType.TAKEOUT,
        "самовивіз": OrderType.TAKEOUT,
        "на вынос": OrderType.TAKEOUT,
        "dine in": OrderType.DINE_IN,
        "dine-in": OrderType.DINE_IN,
        "в залі": OrderType.DINE_IN,
        "в зале": OrderType.DINE_IN,
    }

    def parse_single_line(line: str) -> Optional[RestaurantMealCreate]:
        """Parse a single line into a meal entry."""
        if not line:
            return None

        # Detect meal type and order type from the line
        line_lower = line.lower()
        detected_meal_type = MealType.LUNCH  # Default
        detected_order_type = OrderType.DINE_IN  # Default

        for keyword, meal_type in meal_type_keywords.items():
            if keyword in line_lower:
                detected_meal_type = meal_type
                break

        for keyword, order_type in order_type_keywords.items():
            if keyword in line_lower:
                detected_order_type = order_type
                break

        # Try to split by colon first (Restaurant: items)
        if ":" in line:
            parts = line.split(":", 1)
            restaurant_name = parts[0].strip()
            items_part = parts[1].strip() if len(parts) > 1 else ""
        # Try to split by " - " (Restaurant - items or Restaurant - meal_type - items)
        elif " - " in line:
            parts = [p.strip() for p in line.split(" - ")]
            restaurant_name = parts[0]
            items_part = ", ".join(parts[1:]) if len(parts) > 1 else ""
        else:
            # Just use the whole line as restaurant name
            restaurant_name = line
            items_part = ""

        # Clean up restaurant name - remove meal/order type keywords
        for keyword in list(meal_type_keywords.keys()) + list(order_type_keywords.keys()):
            restaurant_name = restaurant_name.replace(keyword, "").replace(keyword.title(), "")
        restaurant_name = restaurant_name.strip(" ,-:")

        # Parse items - split by comma, plus sign, or semicolon
        items = []
        if items_part:
            # Remove meal/order type keywords from items
            items_clean = items_part
            for keyword in list(meal_type_keywords.keys()) + list(order_type_keywords.keys()):
                items_clean = items_clean.replace(keyword, "").replace(keyword.title(), "")

            # Split by common delimiters
            raw_items = re.split(r'[,;+]', items_clean)
            items = [item.strip(" ,-:") for item in raw_items if item.strip(" ,-:")]

        if not restaurant_name:
            return None

        return RestaurantMealCreate(
            restaurant_name=restaurant_name,
            meal_date=default_date,
            meal_type=detected_meal_type,
            order_type=detected_order_type,
            items_ordered=items if items else None,
            import_source=ImportSource.TEXT,
        )

    # Parse each line as a separate meal
    for line in lines:
        meal = parse_single_line(line)
        if meal:
            parsed_meals.append(meal)

    return ParseTextResponse(
        parsed_meals=parsed_meals,
        raw_text=text,
        success=len(parsed_meals) > 0,
        message=f"Parsed {len(parsed_meals)} meal(s)" if parsed_meals else "Could not parse meal from text"
    )


async def parse_meal_voice(
    db: AsyncSession,
    current_user: User,
    audio: UploadFile,
    language: str = "auto",
    default_date: Optional[date] = None,
) -> ParseTextResponse:
    """Parse restaurant meal from voice recording using AI transcription."""
    meal_date = default_date or date.today()

    try:
        # Read audio file content
        audio_content = await audio.read()

        print(f"[Voice Parse] Received audio file: {audio.filename}, content_type: {audio.content_type}, size: {len(audio_content)} bytes")

        if len(audio_content) < 1000:
            print(f"[Voice Parse] Audio file too small: {len(audio_content)} bytes")
            return ParseTextResponse(
                parsed_meals=[],
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
        ai_parsed_items, transcribed_text = await ai_service.transcribe_and_parse_restaurant_meals(
            audio_file=audio_file,
            language=language,
            default_date=meal_date,
            db=db,
            user_id=current_user.id,
        )

        if not ai_parsed_items:
            return ParseTextResponse(
                parsed_meals=[],
                raw_text=f"[Transcribed: {transcribed_text}]" if transcribed_text else "[No transcription]",
                success=True,
                message=f"Audio was transcribed as: \"{transcribed_text}\". No restaurant meals were detected. Try speaking more clearly and mention restaurant names and items ordered."
            )

        # Convert to RestaurantMealCreate objects
        parsed_meals = []
        for item in ai_parsed_items:
            parsed_meals.append(RestaurantMealCreate(
                restaurant_name=item.get("restaurant_name", "Unknown").strip(),
                meal_date=date.fromisoformat(item["meal_date"]) if item.get("meal_date") else meal_date,
                meal_type=MealType(item.get("meal_type", "lunch")),
                order_type=OrderType(item.get("order_type", "dine_in")),
                items_ordered=item.get("items_ordered"),
                notes=item.get("notes"),
                rating=item.get("rating"),
                import_source=ImportSource.VOICE,
            ))

        return ParseTextResponse(
            parsed_meals=parsed_meals,
            raw_text=f"[Transcribed: {transcribed_text}]",
            success=True,
            message=f"Transcribed and parsed {len(parsed_meals)} meal(s)"
        )

    except Exception as e:
        import traceback
        print(f"Voice parsing failed: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process voice recording: {str(e)}"
        )


async def parse_meal_image(
    db: AsyncSession,
    current_user: User,
    image: Optional[UploadFile] = None,
    images: Optional[List[UploadFile]] = None,
    import_type: str = "food",
    default_date: Optional[date] = None,
) -> ParseTextResponse:
    """Parse restaurant meal from image(s) using AI vision."""
    meal_date = default_date or date.today()

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
                parsed_meals=[],
                raw_text="[No images provided]",
                success=False,
                message="No images were provided"
            )

        print(f"[Image Parse] Processing {len(image_data_list)} image(s), type: {import_type}")

        # Use AI service to parse images
        ai_parsed_items = await ai_service.parse_restaurant_meal_images(
            images=image_data_list,
            import_type=import_type,
            default_date=meal_date,
            db=db,
            user_id=current_user.id,
        )

        if not ai_parsed_items:
            return ParseTextResponse(
                parsed_meals=[],
                raw_text=f"[{len(image_data_list)} image(s) processed]",
                success=True,
                message="Could not extract restaurant meal information from the image(s). Try a clearer photo or different angle."
            )

        # Determine import source based on type
        if import_type == "receipt":
            source = ImportSource.RECEIPT
        elif import_type == "app_screenshot":
            source = ImportSource.SCREENSHOT
        else:
            source = ImportSource.PHOTO

        # Convert to RestaurantMealCreate objects
        parsed_meals = []
        for item in ai_parsed_items:
            parsed_meals.append(RestaurantMealCreate(
                restaurant_name=item.get("restaurant_name", "Unknown Restaurant").strip(),
                meal_date=date.fromisoformat(item["meal_date"]) if item.get("meal_date") else meal_date,
                meal_type=MealType(item.get("meal_type", "lunch")),
                order_type=OrderType(item.get("order_type", "dine_in")),
                items_ordered=item.get("items_ordered"),
                notes=item.get("notes"),
                rating=item.get("rating"),
                import_source=source,
            ))

        return ParseTextResponse(
            parsed_meals=parsed_meals,
            raw_text=f"[{len(image_data_list)} image(s) processed]",
            success=True,
            message=f"Parsed {len(parsed_meals)} meal(s) from image(s)"
        )

    except Exception as e:
        import traceback
        print(f"Image parsing failed: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process image(s): {str(e)}"
        )


# ============ Restaurants (Places) CRUD ============

async def list_restaurants(
    db: AsyncSession,
    current_user: User,
    search: Optional[str] = None,
    cuisine_type: Optional[str] = None,
    is_favorite: Optional[bool] = None,
    is_archived: bool = False,
    sort_by: str = "name",
    sort_order: str = "asc",
    page: int = 1,
    per_page: int = 50,
) -> RestaurantListResponse:
    """List saved restaurants."""
    query = select(Restaurant).where(Restaurant.user_id == current_user.id)

    query = query.where(Restaurant.is_archived == is_archived)

    if search:
        search_filter = or_(
            Restaurant.name.ilike(f"%{search}%"),
            Restaurant.cuisine_type.ilike(f"%{search}%"),
            Restaurant.location.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    if cuisine_type:
        query = query.where(Restaurant.cuisine_type == cuisine_type)

    if is_favorite is not None:
        query = query.where(Restaurant.is_favorite == is_favorite)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply sorting
    sort_column = getattr(Restaurant, sort_by, Restaurant.name)
    if sort_order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Apply pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    restaurants = result.scalars().all()

    total_pages = math.ceil(total / per_page) if total > 0 else 1

    # Get meal counts for each restaurant
    restaurant_responses = []
    for r in restaurants:
        meal_count_result = await db.execute(
            select(func.count()).where(
                and_(
                    RestaurantMeal.restaurant_id == r.id,
                    RestaurantMeal.is_archived == False
                )
            )
        )
        meal_count = meal_count_result.scalar() or 0

        response = RestaurantResponse.model_validate(r)
        response.meal_count = meal_count
        restaurant_responses.append(response)

    return RestaurantListResponse(
        items=restaurant_responses,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


async def create_restaurant(
    db: AsyncSession,
    current_user: User,
    request: RestaurantCreate,
) -> RestaurantResponse:
    """Create a new restaurant."""
    restaurant = Restaurant(
        user_id=current_user.id,
        name=request.name,
        cuisine_type=request.cuisine_type,
        location=request.location,
        notes=request.notes,
        favorite_dishes=request.favorite_dishes,
        image_url=request.image_url,
        is_favorite=request.is_favorite,
        is_archived=False,
    )
    db.add(restaurant)
    await db.commit()
    await db.refresh(restaurant)

    response = RestaurantResponse.model_validate(restaurant)
    response.meal_count = 0
    return response


async def get_restaurant(
    db: AsyncSession,
    current_user: User,
    restaurant_id: UUID,
) -> RestaurantResponse:
    """Get a single restaurant by ID."""
    restaurant = await get_owned_or_404(
        db, Restaurant, restaurant_id, current_user,
        detail="Restaurant not found",
    )

    # Get meal count
    meal_count_result = await db.execute(
        select(func.count()).where(
            and_(
                RestaurantMeal.restaurant_id == restaurant.id,
                RestaurantMeal.is_archived == False
            )
        )
    )
    meal_count = meal_count_result.scalar() or 0

    response = RestaurantResponse.model_validate(restaurant)
    response.meal_count = meal_count
    return response


async def update_restaurant(
    db: AsyncSession,
    current_user: User,
    restaurant_id: UUID,
    request: RestaurantUpdate,
) -> RestaurantResponse:
    """Update a restaurant."""
    restaurant = await get_owned_or_404(
        db, Restaurant, restaurant_id, current_user,
        detail="Restaurant not found",
    )

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(restaurant, field, value)

    await db.commit()
    await db.refresh(restaurant)

    # Get meal count
    meal_count_result = await db.execute(
        select(func.count()).where(
            and_(
                RestaurantMeal.restaurant_id == restaurant.id,
                RestaurantMeal.is_archived == False
            )
        )
    )
    meal_count = meal_count_result.scalar() or 0

    response = RestaurantResponse.model_validate(restaurant)
    response.meal_count = meal_count
    return response


async def delete_restaurant(
    db: AsyncSession,
    current_user: User,
    restaurant_id: UUID,
) -> None:
    """Delete a restaurant."""
    restaurant = await get_owned_or_404(
        db, Restaurant, restaurant_id, current_user,
        detail="Restaurant not found",
    )

    await db.delete(restaurant)
    await db.commit()
