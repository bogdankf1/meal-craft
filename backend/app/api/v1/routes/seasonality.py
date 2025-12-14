"""Seasonality API routes - Local & Seasonal Produce Guide."""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
import calendar
import json
import re

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_, any_
from openai import OpenAI

from app.core.database import get_db
from app.core.config import settings
from app.api.deps import get_current_user
from app.models.user import User
from app.models.seasonality import (
    SeasonalProduce,
    LocalSpecialty,
    UserSeasonalPreference,
)
from app.schemas.seasonality import (
    # Produce schemas
    SeasonalProduceCreate,
    SeasonalProduceUpdate,
    SeasonalProduceResponse,
    SeasonalProduceListResponse,
    SeasonalProduceFilters,
    # Specialty schemas
    LocalSpecialtyCreate,
    LocalSpecialtyUpdate,
    LocalSpecialtyResponse,
    LocalSpecialtyListResponse,
    LocalSpecialtyFilters,
    # User preference schemas
    UserSeasonalPreferenceCreate,
    UserSeasonalPreferenceUpdate,
    UserSeasonalPreferenceResponse,
    # AI recommendation schemas
    SeasonalRecommendationRequest,
    SeasonalRecommendationResponse,
    SeasonalRecommendation,
    WeeklyPicksRequest,
    WeeklyPicksResponse,
    WeeklyPick,
    # Calendar schemas
    SeasonalCalendarResponse,
    MonthlySeasonalData,
    # Country info
    CountryInfo,
    SupportedCountriesResponse,
)

router = APIRouter(prefix="/seasonality", tags=["seasonality"])


# Country data with hemisphere info
COUNTRY_DATA = {
    "UA": {"name": "Ukraine", "name_local": "Україна", "hemisphere": "northern"},
    "BR": {"name": "Brazil", "name_local": "Brasil", "hemisphere": "southern"},
    "US": {"name": "United States", "name_local": "United States", "hemisphere": "northern"},
    "PL": {"name": "Poland", "name_local": "Polska", "hemisphere": "northern"},
    "DE": {"name": "Germany", "name_local": "Deutschland", "hemisphere": "northern"},
    "FR": {"name": "France", "name_local": "France", "hemisphere": "northern"},
    "IT": {"name": "Italy", "name_local": "Italia", "hemisphere": "northern"},
    "ES": {"name": "Spain", "name_local": "España", "hemisphere": "northern"},
    "GB": {"name": "United Kingdom", "name_local": "United Kingdom", "hemisphere": "northern"},
}


def get_season(month: int, hemisphere: str) -> str:
    """Get season name based on month and hemisphere."""
    if hemisphere == "northern":
        if month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        elif month in [9, 10, 11]:
            return "autumn"
        else:
            return "winter"
    else:  # southern hemisphere
        if month in [3, 4, 5]:
            return "autumn"
        elif month in [6, 7, 8]:
            return "winter"
        elif month in [9, 10, 11]:
            return "spring"
        else:
            return "summer"


def get_openai_client():
    """Get OpenAI client instance."""
    api_key = settings.OPENAI_API_KEY
    if not api_key or len(api_key.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service not configured"
        )
    return OpenAI(api_key=api_key.strip())


# ============ Helper Functions ============

def _produce_to_response(
    produce: SeasonalProduce,
    current_month: int = None,
    favorite_ids: set = None
) -> SeasonalProduceResponse:
    """Convert produce model to response with computed fields."""
    if current_month is None:
        current_month = datetime.now().month
    if favorite_ids is None:
        favorite_ids = set()

    is_in_season = current_month in (produce.available_months or [])
    is_peak = current_month in (produce.peak_months or [])

    return SeasonalProduceResponse(
        id=produce.id,
        name=produce.name,
        name_local=produce.name_local,
        description=produce.description,
        category=produce.category,
        country_code=produce.country_code,
        region=produce.region,
        available_months=produce.available_months,
        peak_months=produce.peak_months,
        storage_tips=produce.storage_tips,
        nutrition_highlights=produce.nutrition_highlights,
        culinary_uses=produce.culinary_uses,
        image_url=produce.image_url,
        is_active=produce.is_active,
        created_at=produce.created_at,
        updated_at=produce.updated_at,
        is_in_season=is_in_season,
        is_peak_season=is_peak,
        is_favorite=produce.id in favorite_ids,
    )


def _specialty_to_response(specialty: LocalSpecialty) -> LocalSpecialtyResponse:
    """Convert specialty model to response."""
    return LocalSpecialtyResponse(
        id=specialty.id,
        name=specialty.name,
        name_local=specialty.name_local,
        description=specialty.description,
        specialty_type=specialty.specialty_type,
        country_code=specialty.country_code,
        region=specialty.region,
        cultural_info=specialty.cultural_info,
        how_to_use=specialty.how_to_use,
        where_to_find=specialty.where_to_find,
        related_dishes=specialty.related_dishes,
        seasonal_availability=specialty.seasonal_availability,
        image_url=specialty.image_url,
        is_active=specialty.is_active,
        is_featured=specialty.is_featured,
        created_at=specialty.created_at,
        updated_at=specialty.updated_at,
    )


# ============ Supported Countries ============

@router.get("/countries", response_model=SupportedCountriesResponse)
async def get_supported_countries(
    db: AsyncSession = Depends(get_db),
):
    """Get list of supported countries with produce/specialty counts."""
    countries = []

    for code, data in COUNTRY_DATA.items():
        # Count produce for this country
        produce_count = await db.scalar(
            select(func.count(SeasonalProduce.id)).where(
                and_(
                    SeasonalProduce.country_code == code,
                    SeasonalProduce.is_active == True
                )
            )
        )

        # Count specialties for this country
        specialty_count = await db.scalar(
            select(func.count(LocalSpecialty.id)).where(
                and_(
                    LocalSpecialty.country_code == code,
                    LocalSpecialty.is_active == True
                )
            )
        )

        countries.append(CountryInfo(
            code=code,
            name=data["name"],
            name_local=data["name_local"],
            hemisphere=data["hemisphere"],
            produce_count=produce_count or 0,
            specialty_count=specialty_count or 0,
        ))

    return SupportedCountriesResponse(countries=countries)


# ============ User Preferences ============

@router.get("/preferences", response_model=UserSeasonalPreferenceResponse)
async def get_user_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's seasonality preferences."""
    result = await db.execute(
        select(UserSeasonalPreference).where(
            UserSeasonalPreference.user_id == current_user.id
        )
    )
    preferences = result.scalar_one_or_none()

    if not preferences:
        # Create default preferences
        preferences = UserSeasonalPreference(
            user_id=current_user.id,
            country_code="UA",  # Default to Ukraine
            notification_enabled=False,
        )
        db.add(preferences)
        await db.commit()
        await db.refresh(preferences)

    return UserSeasonalPreferenceResponse(
        id=preferences.id,
        user_id=preferences.user_id,
        country_code=preferences.country_code,
        region=preferences.region,
        favorite_produce_ids=preferences.favorite_produce_ids,
        notification_enabled=preferences.notification_enabled,
        created_at=preferences.created_at,
        updated_at=preferences.updated_at,
    )


@router.put("/preferences", response_model=UserSeasonalPreferenceResponse)
async def update_user_preferences(
    data: UserSeasonalPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user's seasonality preferences."""
    result = await db.execute(
        select(UserSeasonalPreference).where(
            UserSeasonalPreference.user_id == current_user.id
        )
    )
    preferences = result.scalar_one_or_none()

    if not preferences:
        preferences = UserSeasonalPreference(user_id=current_user.id)
        db.add(preferences)

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preferences, field, value)

    await db.commit()
    await db.refresh(preferences)

    return UserSeasonalPreferenceResponse(
        id=preferences.id,
        user_id=preferences.user_id,
        country_code=preferences.country_code,
        region=preferences.region,
        favorite_produce_ids=preferences.favorite_produce_ids,
        notification_enabled=preferences.notification_enabled,
        created_at=preferences.created_at,
        updated_at=preferences.updated_at,
    )


@router.post("/preferences/favorites/{produce_id}")
async def add_favorite_produce(
    produce_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a produce item to favorites."""
    result = await db.execute(
        select(UserSeasonalPreference).where(
            UserSeasonalPreference.user_id == current_user.id
        )
    )
    preferences = result.scalar_one_or_none()

    if not preferences:
        preferences = UserSeasonalPreference(
            user_id=current_user.id,
            favorite_produce_ids=[produce_id],
        )
        db.add(preferences)
    else:
        current_favorites = preferences.favorite_produce_ids or []
        if produce_id not in current_favorites:
            preferences.favorite_produce_ids = current_favorites + [produce_id]

    await db.commit()
    return {"success": True, "message": "Added to favorites"}


@router.delete("/preferences/favorites/{produce_id}")
async def remove_favorite_produce(
    produce_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a produce item from favorites."""
    result = await db.execute(
        select(UserSeasonalPreference).where(
            UserSeasonalPreference.user_id == current_user.id
        )
    )
    preferences = result.scalar_one_or_none()

    if preferences and preferences.favorite_produce_ids:
        preferences.favorite_produce_ids = [
            pid for pid in preferences.favorite_produce_ids if pid != produce_id
        ]
        await db.commit()

    return {"success": True, "message": "Removed from favorites"}


# ============ Seasonal Produce ============

@router.get("/produce", response_model=SeasonalProduceListResponse)
async def get_seasonal_produce(
    search: Optional[str] = None,
    category: Optional[str] = None,
    country_code: Optional[str] = None,
    region: Optional[str] = None,
    month: Optional[int] = Query(None, ge=1, le=12),
    in_season_only: bool = False,
    peak_only: bool = False,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    sort_by: str = "name",
    sort_order: str = "asc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get seasonal produce with filters."""
    current_month = month or datetime.now().month

    # Get user's favorite IDs
    pref_result = await db.execute(
        select(UserSeasonalPreference).where(
            UserSeasonalPreference.user_id == current_user.id
        )
    )
    preferences = pref_result.scalar_one_or_none()
    favorite_ids = set(preferences.favorite_produce_ids or []) if preferences else set()

    # If no country specified, use user's preference
    if not country_code and preferences:
        country_code = preferences.country_code

    # Build query
    query = select(SeasonalProduce).where(SeasonalProduce.is_active == True)

    if search:
        search_filter = or_(
            SeasonalProduce.name.ilike(f"%{search}%"),
            SeasonalProduce.name_local.ilike(f"%{search}%"),
            SeasonalProduce.description.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    if category:
        query = query.where(SeasonalProduce.category == category)

    if country_code:
        query = query.where(SeasonalProduce.country_code == country_code)

    if region:
        query = query.where(SeasonalProduce.region == region)

    if in_season_only or peak_only:
        query = query.where(current_month == any_(SeasonalProduce.available_months))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Add sorting
    sort_column = getattr(SeasonalProduce, sort_by, SeasonalProduce.name)
    if sort_order == "desc":
        sort_column = sort_column.desc()
    query = query.order_by(sort_column)

    # Add pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    produce_list = result.scalars().all()

    # Convert to response, filtering peak_only after fetch if needed
    items = []
    for produce in produce_list:
        if peak_only and current_month not in (produce.peak_months or []):
            continue
        items.append(_produce_to_response(produce, current_month, favorite_ids))

    return SeasonalProduceListResponse(
        items=items,
        total=total or 0,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page if total else 0,
    )


@router.get("/produce/{produce_id}", response_model=SeasonalProduceResponse)
async def get_produce_by_id(
    produce_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific produce item by ID."""
    result = await db.execute(
        select(SeasonalProduce).where(SeasonalProduce.id == produce_id)
    )
    produce = result.scalar_one_or_none()

    if not produce:
        raise HTTPException(status_code=404, detail="Produce not found")

    # Get favorites
    pref_result = await db.execute(
        select(UserSeasonalPreference).where(
            UserSeasonalPreference.user_id == current_user.id
        )
    )
    preferences = pref_result.scalar_one_or_none()
    favorite_ids = set(preferences.favorite_produce_ids or []) if preferences else set()

    return _produce_to_response(produce, datetime.now().month, favorite_ids)


@router.delete("/produce/{produce_id}")
async def delete_produce(
    produce_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a produce item by ID. Also removes it from favorites."""
    result = await db.execute(
        select(SeasonalProduce).where(SeasonalProduce.id == produce_id)
    )
    produce = result.scalar_one_or_none()

    if not produce:
        raise HTTPException(status_code=404, detail="Produce not found")

    # Also remove from user's favorites if present
    pref_result = await db.execute(
        select(UserSeasonalPreference).where(
            UserSeasonalPreference.user_id == current_user.id
        )
    )
    preferences = pref_result.scalar_one_or_none()

    if preferences and preferences.favorite_produce_ids:
        preferences.favorite_produce_ids = [
            pid for pid in preferences.favorite_produce_ids if pid != produce_id
        ]

    await db.delete(produce)
    await db.commit()

    return {"success": True, "message": "Produce deleted"}


# ============ Local Specialties ============

@router.get("/specialties", response_model=LocalSpecialtyListResponse)
async def get_local_specialties(
    search: Optional[str] = None,
    specialty_type: Optional[str] = None,
    country_code: Optional[str] = None,
    region: Optional[str] = None,
    is_featured: Optional[bool] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = "name",
    sort_order: str = "asc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get local specialties with filters."""
    # If no country specified, use user's preference
    if not country_code:
        pref_result = await db.execute(
            select(UserSeasonalPreference).where(
                UserSeasonalPreference.user_id == current_user.id
            )
        )
        preferences = pref_result.scalar_one_or_none()
        if preferences:
            country_code = preferences.country_code

    # Build query
    query = select(LocalSpecialty).where(LocalSpecialty.is_active == True)

    if search:
        search_filter = or_(
            LocalSpecialty.name.ilike(f"%{search}%"),
            LocalSpecialty.name_local.ilike(f"%{search}%"),
            LocalSpecialty.description.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    if specialty_type:
        query = query.where(LocalSpecialty.specialty_type == specialty_type)

    if country_code:
        query = query.where(LocalSpecialty.country_code == country_code)

    if region:
        query = query.where(LocalSpecialty.region == region)

    if is_featured is not None:
        query = query.where(LocalSpecialty.is_featured == is_featured)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Add sorting
    sort_column = getattr(LocalSpecialty, sort_by, LocalSpecialty.name)
    if sort_order == "desc":
        sort_column = sort_column.desc()
    query = query.order_by(sort_column)

    # Add pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    specialties = result.scalars().all()

    return LocalSpecialtyListResponse(
        items=[_specialty_to_response(s) for s in specialties],
        total=total or 0,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page if total else 0,
    )


@router.get("/specialties/{specialty_id}", response_model=LocalSpecialtyResponse)
async def get_specialty_by_id(
    specialty_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific local specialty by ID."""
    result = await db.execute(
        select(LocalSpecialty).where(LocalSpecialty.id == specialty_id)
    )
    specialty = result.scalar_one_or_none()

    if not specialty:
        raise HTTPException(status_code=404, detail="Specialty not found")

    return _specialty_to_response(specialty)


# ============ Seasonal Calendar ============

@router.get("/calendar/{country_code}", response_model=SeasonalCalendarResponse)
async def get_seasonal_calendar(
    country_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full year seasonal calendar for a country."""
    if country_code not in COUNTRY_DATA:
        raise HTTPException(status_code=400, detail="Unsupported country")

    # Get all produce for this country
    result = await db.execute(
        select(SeasonalProduce).where(
            and_(
                SeasonalProduce.country_code == country_code,
                SeasonalProduce.is_active == True
            )
        )
    )
    all_produce = result.scalars().all()

    # Build monthly data
    months_data = []
    for month_num in range(1, 13):
        month_name = calendar.month_name[month_num]

        # Items in season this month
        in_season = [p for p in all_produce if month_num in (p.available_months or [])]

        # Peak items
        peak_items = [p.name for p in in_season if month_num in (p.peak_months or [])]

        # Coming soon (starts next month, not available this month)
        next_month = month_num % 12 + 1
        coming_soon = [
            p.name for p in all_produce
            if next_month in (p.available_months or [])
            and month_num not in (p.available_months or [])
        ][:5]

        # Ending soon (available this month, not next)
        ending_soon = [
            p.name for p in in_season
            if next_month not in (p.available_months or [])
        ][:5]

        months_data.append(MonthlySeasonalData(
            month=month_num,
            month_name=month_name,
            produce_count=len(in_season),
            peak_produce=peak_items[:10],
            coming_soon=coming_soon,
            ending_soon=ending_soon,
        ))

    return SeasonalCalendarResponse(
        country_code=country_code,
        country_name=COUNTRY_DATA[country_code]["name"],
        months=months_data,
    )


# ============ AI-Powered Recommendations ============

@router.post("/recommendations", response_model=SeasonalRecommendationResponse)
async def get_seasonal_recommendations(
    request: SeasonalRecommendationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-powered seasonal recommendations for a country/month."""
    if request.country_code not in COUNTRY_DATA:
        raise HTTPException(status_code=400, detail="Unsupported country")

    country_data = COUNTRY_DATA[request.country_code]
    month = request.month or datetime.now().month
    month_name = calendar.month_name[month]
    season = get_season(month, country_data["hemisphere"])

    # Get produce in season for context
    result = await db.execute(
        select(SeasonalProduce).where(
            and_(
                SeasonalProduce.country_code == request.country_code,
                SeasonalProduce.is_active == True,
                month == any_(SeasonalProduce.available_months)
            )
        ).limit(30)
    )
    seasonal_produce = result.scalars().all()

    # Build context for AI
    produce_context = "\n".join([
        f"- {p.name} ({p.category}){' [PEAK]' if month in (p.peak_months or []) else ''}"
        for p in seasonal_produce
    ])

    preferences_str = ", ".join(request.preferences) if request.preferences else "none specified"
    pantry_str = ", ".join(request.available_ingredients) if request.available_ingredients else "not specified"

    prompt = f"""You are a seasonal food expert for {country_data['name']}.
It is {month_name} ({season} season in the {country_data['hemisphere']} hemisphere).

Currently in season produce:
{produce_context if produce_context else "No data available yet - provide general recommendations for this region and season."}

User preferences: {preferences_str}
User's available ingredients: {pantry_str}

Provide 5-7 seasonal food recommendations. For each recommendation include:
1. produce_name: The name of the produce
2. category: vegetables/fruits/herbs/seafood/mushrooms/nuts
3. why_now: A brief explanation of why this is good to buy now (freshness, price, peak flavor)
4. recipe_ideas: 2-3 simple recipe ideas using this ingredient
5. storage_tip: How to store it properly (optional)
6. is_peak: true if this is at peak season, false otherwise

Also provide a general seasonal_tip for cooking/shopping in {month_name} in {country_data['name']}.

Return ONLY valid JSON in this format:
{{
  "recommendations": [
    {{
      "produce_name": "string",
      "category": "string",
      "why_now": "string",
      "recipe_ideas": ["string", "string"],
      "storage_tip": "string or null",
      "is_peak": boolean
    }}
  ],
  "seasonal_tip": "string"
}}"""

    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful seasonal food expert. Always return valid JSON only, no explanations."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
        )

        result_text = response.choices[0].message.content.strip()

        # Clean up response
        if result_text.startswith("```"):
            result_text = re.sub(r'^```json?\s*', '', result_text)
            result_text = re.sub(r'\s*```$', '', result_text)

        data = json.loads(result_text)

        recommendations = [
            SeasonalRecommendation(
                produce_name=r["produce_name"],
                category=r["category"],
                why_now=r["why_now"],
                recipe_ideas=r["recipe_ideas"],
                storage_tip=r.get("storage_tip"),
                is_peak=r.get("is_peak", False),
            )
            for r in data.get("recommendations", [])
        ]

        return SeasonalRecommendationResponse(
            country_code=request.country_code,
            country_name=country_data["name"],
            month=month,
            month_name=month_name,
            season=season,
            recommendations=recommendations,
            seasonal_tip=data.get("seasonal_tip", f"Enjoy the {season} produce!"),
            generated_at=datetime.now(),
        )

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse AI response"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
        )


@router.post("/weekly-picks", response_model=WeeklyPicksResponse)
async def get_weekly_picks(
    request: WeeklyPicksRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-powered weekly shopping picks."""
    if request.country_code not in COUNTRY_DATA:
        raise HTTPException(status_code=400, detail="Unsupported country")

    country_data = COUNTRY_DATA[request.country_code]
    now = datetime.now()
    month = now.month
    month_name = calendar.month_name[month]
    season = get_season(month, country_data["hemisphere"])

    # Calculate week range
    week_start = now - timedelta(days=now.weekday())
    week_end = week_start + timedelta(days=6)
    week_of = f"{week_start.strftime('%B %d')} - {week_end.strftime('%d, %Y')}"

    # Get produce in season
    result = await db.execute(
        select(SeasonalProduce).where(
            and_(
                SeasonalProduce.country_code == request.country_code,
                SeasonalProduce.is_active == True,
                month == any_(SeasonalProduce.available_months)
            )
        ).limit(20)
    )
    seasonal_produce = result.scalars().all()

    produce_list = "\n".join([
        f"- {p.name} (local: {p.name_local or 'N/A'}, category: {p.category})"
        for p in seasonal_produce
    ])

    prompt = f"""You are a local market shopping expert in {country_data['name']}.
It's the week of {week_of}, {season} season.

Available seasonal produce:
{produce_list if produce_list else "Provide general recommendations for this season."}

Create a "What to Buy This Week" list with 5-6 items. For each:
1. name: Product name
2. name_local: Name in local language (for {country_data['name']})
3. category: vegetables/fruits/herbs/etc
4. why_buy_now: Brief reason (freshness, price drop, perfect ripeness)
5. budget_friendly: true if it's a good deal right now
6. recipe_suggestion: One simple recipe idea

Also provide a market_tip - a practical tip for shopping at local markets this week.

Return ONLY valid JSON:
{{
  "picks": [
    {{
      "name": "string",
      "name_local": "string or null",
      "category": "string",
      "why_buy_now": "string",
      "budget_friendly": boolean,
      "recipe_suggestion": "string"
    }}
  ],
  "market_tip": "string"
}}"""

    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful local market expert. Return valid JSON only."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500,
        )

        result_text = response.choices[0].message.content.strip()

        if result_text.startswith("```"):
            result_text = re.sub(r'^```json?\s*', '', result_text)
            result_text = re.sub(r'\s*```$', '', result_text)

        data = json.loads(result_text)

        picks = [
            WeeklyPick(
                name=p["name"],
                name_local=p.get("name_local"),
                category=p["category"],
                why_buy_now=p["why_buy_now"],
                budget_friendly=p.get("budget_friendly", False),
                recipe_suggestion=p["recipe_suggestion"],
            )
            for p in data.get("picks", [])
        ]

        return WeeklyPicksResponse(
            country_code=request.country_code,
            country_name=country_data["name"],
            week_of=week_of,
            picks=picks,
            market_tip=data.get("market_tip", "Visit your local farmers market for the freshest picks!"),
        )

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


# ============ Save AI Recommendation as Produce ============

@router.post("/recommendations/save", response_model=SeasonalProduceResponse)
async def save_recommendation_as_produce(
    data: SeasonalProduceCreate,
    add_to_favorites: bool = Query(False, description="Also add to favorites"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save an AI recommendation as a seasonal produce entry in the database."""
    # Check if produce with same name and country already exists
    existing = await db.execute(
        select(SeasonalProduce).where(
            and_(
                func.lower(SeasonalProduce.name) == func.lower(data.name),
                SeasonalProduce.country_code == data.country_code
            )
        )
    )
    existing_produce = existing.scalar_one_or_none()

    if existing_produce:
        # Return existing produce, optionally add to favorites
        if add_to_favorites:
            pref_result = await db.execute(
                select(UserSeasonalPreference).where(
                    UserSeasonalPreference.user_id == current_user.id
                )
            )
            preferences = pref_result.scalar_one_or_none()

            if not preferences:
                preferences = UserSeasonalPreference(
                    user_id=current_user.id,
                    favorite_produce_ids=[existing_produce.id],
                )
                db.add(preferences)
            else:
                current_favorites = preferences.favorite_produce_ids or []
                if existing_produce.id not in current_favorites:
                    preferences.favorite_produce_ids = current_favorites + [existing_produce.id]

            await db.commit()

        # Get favorites for response
        pref_result = await db.execute(
            select(UserSeasonalPreference).where(
                UserSeasonalPreference.user_id == current_user.id
            )
        )
        preferences = pref_result.scalar_one_or_none()
        favorite_ids = set(preferences.favorite_produce_ids or []) if preferences else set()

        return _produce_to_response(existing_produce, datetime.now().month, favorite_ids)

    # Create new produce entry
    produce = SeasonalProduce(**data.model_dump())
    db.add(produce)
    await db.commit()
    await db.refresh(produce)

    favorite_ids = set()

    # Add to favorites if requested
    if add_to_favorites:
        pref_result = await db.execute(
            select(UserSeasonalPreference).where(
                UserSeasonalPreference.user_id == current_user.id
            )
        )
        preferences = pref_result.scalar_one_or_none()

        if not preferences:
            preferences = UserSeasonalPreference(
                user_id=current_user.id,
                favorite_produce_ids=[produce.id],
            )
            db.add(preferences)
        else:
            current_favorites = preferences.favorite_produce_ids or []
            preferences.favorite_produce_ids = current_favorites + [produce.id]

        await db.commit()
        favorite_ids = {produce.id}

    return _produce_to_response(produce, datetime.now().month, favorite_ids)


# ============ Admin Endpoints (for seeding data) ============

@router.post("/produce", response_model=SeasonalProduceResponse)
async def create_seasonal_produce(
    data: SeasonalProduceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new seasonal produce entry (admin only)."""
    produce = SeasonalProduce(**data.model_dump())
    db.add(produce)
    await db.commit()
    await db.refresh(produce)
    return _produce_to_response(produce)


@router.post("/specialties", response_model=LocalSpecialtyResponse)
async def create_local_specialty(
    data: LocalSpecialtyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new local specialty entry (admin only)."""
    specialty = LocalSpecialty(**data.model_dump())
    db.add(specialty)
    await db.commit()
    await db.refresh(specialty)
    return _specialty_to_response(specialty)
