"""
Dashboard service - aggregates data from all modules.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import List, Optional
from uuid import UUID
import calendar

from app.models.grocery import Grocery, ShoppingList
from app.models.pantry import PantryItem
from app.models.recipe import Recipe
from app.models.meal_plan import MealPlan, Meal
from app.models.nutrition import NutritionGoal, NutritionLog
from app.models.learning import Skill, UserSkill, LearningPath, UserLearningPath
from app.models.seasonality import SeasonalProduce
from app.models.kitchen_equipment import KitchenEquipment
from app.models.support import SupportTopic, SupportMessage

from app.api.v1.routes.dashboard.schemas import (
    DashboardResponse,
    MealPlanStats,
    PantryStats,
    RecipeStats,
    BudgetStats,
    NutritionStats,
    UpcomingMeal,
    ExpiringItem,
    ActivityItem,
    WasteStats,
    SkillProgress,
    LearningPathProgress,
    SeasonalItem,
    EquipmentAlert,
)


async def get_meal_plan_stats(db: AsyncSession, user_id: UUID) -> MealPlanStats:
    """Get meal planning statistics."""
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    last_week_start = week_start - timedelta(days=7)
    last_week_end = week_start - timedelta(days=1)

    # Count meals this week
    this_week_query = select(func.count(Meal.id)).join(MealPlan).where(
        and_(
            MealPlan.user_id == user_id,
            Meal.date >= week_start,
            Meal.date <= week_end
        )
    )
    this_week_result = await db.execute(this_week_query)
    meals_this_week = this_week_result.scalar() or 0

    # Count meals last week
    last_week_query = select(func.count(Meal.id)).join(MealPlan).where(
        and_(
            MealPlan.user_id == user_id,
            Meal.date >= last_week_start,
            Meal.date <= last_week_end
        )
    )
    last_week_result = await db.execute(last_week_query)
    meals_last_week = last_week_result.scalar() or 0

    # Count active meal plans
    active_plans_query = select(func.count(MealPlan.id)).where(
        and_(
            MealPlan.user_id == user_id,
            MealPlan.is_archived == False,
            MealPlan.date_end >= today
        )
    )
    active_plans_result = await db.execute(active_plans_query)
    active_plans = active_plans_result.scalar() or 0

    return MealPlanStats(
        meals_planned_this_week=meals_this_week,
        total_meal_slots=21,  # 7 days * 3 meals
        meals_planned_last_week=meals_last_week,
        active_meal_plans=active_plans
    )


async def get_pantry_stats(db: AsyncSession, user_id: UUID) -> PantryStats:
    """Get pantry inventory statistics."""
    today = date.today()
    expiry_threshold = today + timedelta(days=7)

    # Total items
    total_query = select(func.count(PantryItem.id)).where(
        and_(
            PantryItem.user_id == user_id,
            PantryItem.is_archived == False
        )
    )
    total_result = await db.execute(total_query)
    total_items = total_result.scalar() or 0

    # Expiring soon (within 7 days)
    expiring_query = select(func.count(PantryItem.id)).where(
        and_(
            PantryItem.user_id == user_id,
            PantryItem.is_archived == False,
            PantryItem.expiry_date.isnot(None),
            PantryItem.expiry_date <= expiry_threshold,
            PantryItem.expiry_date >= today
        )
    )
    expiring_result = await db.execute(expiring_query)
    expiring_soon = expiring_result.scalar() or 0

    # Expired
    expired_query = select(func.count(PantryItem.id)).where(
        and_(
            PantryItem.user_id == user_id,
            PantryItem.is_archived == False,
            PantryItem.expiry_date.isnot(None),
            PantryItem.expiry_date < today
        )
    )
    expired_result = await db.execute(expired_query)
    expired = expired_result.scalar() or 0

    # Low stock (below minimum quantity)
    low_stock_query = select(func.count(PantryItem.id)).where(
        and_(
            PantryItem.user_id == user_id,
            PantryItem.is_archived == False,
            PantryItem.minimum_quantity.isnot(None),
            PantryItem.quantity < PantryItem.minimum_quantity
        )
    )
    low_stock_result = await db.execute(low_stock_query)
    low_stock = low_stock_result.scalar() or 0

    return PantryStats(
        total_items=total_items,
        expiring_soon=expiring_soon,
        expired=expired,
        low_stock=low_stock
    )


async def get_recipe_stats(db: AsyncSession, user_id: UUID) -> RecipeStats:
    """Get recipe collection statistics."""
    today = date.today()
    month_start = today.replace(day=1)

    # Total recipes
    total_query = select(func.count(Recipe.id)).where(
        and_(
            Recipe.user_id == user_id,
            Recipe.is_archived == False
        )
    )
    total_result = await db.execute(total_query)
    total_recipes = total_result.scalar() or 0

    # Favorites
    favorites_query = select(func.count(Recipe.id)).where(
        and_(
            Recipe.user_id == user_id,
            Recipe.is_archived == False,
            Recipe.is_favorite == True
        )
    )
    favorites_result = await db.execute(favorites_query)
    favorites = favorites_result.scalar() or 0

    # Recipes added this month
    this_month_query = select(func.count(Recipe.id)).where(
        and_(
            Recipe.user_id == user_id,
            Recipe.created_at >= month_start
        )
    )
    this_month_result = await db.execute(this_month_query)
    recipes_this_month = this_month_result.scalar() or 0

    # Most cooked recipe count
    most_cooked_query = select(func.max(Recipe.times_cooked)).where(
        and_(
            Recipe.user_id == user_id,
            Recipe.is_archived == False
        )
    )
    most_cooked_result = await db.execute(most_cooked_query)
    most_cooked_count = most_cooked_result.scalar() or 0

    return RecipeStats(
        total_recipes=total_recipes,
        favorites=favorites,
        recipes_this_month=recipes_this_month,
        most_cooked_count=most_cooked_count
    )


async def get_budget_stats(db: AsyncSession, user_id: UUID) -> BudgetStats:
    """Get grocery budget statistics."""
    today = date.today()
    month_start = today.replace(day=1)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    last_month_end = month_start - timedelta(days=1)

    # Spent this month
    this_month_query = select(func.coalesce(func.sum(Grocery.cost), 0)).where(
        and_(
            Grocery.user_id == user_id,
            Grocery.purchase_date >= month_start,
            Grocery.purchase_date <= today
        )
    )
    this_month_result = await db.execute(this_month_query)
    spent_this_month = float(this_month_result.scalar() or 0)

    # Spent last month
    last_month_query = select(func.coalesce(func.sum(Grocery.cost), 0)).where(
        and_(
            Grocery.user_id == user_id,
            Grocery.purchase_date >= last_month_start,
            Grocery.purchase_date <= last_month_end
        )
    )
    last_month_result = await db.execute(last_month_query)
    spent_last_month = float(last_month_result.scalar() or 0)

    # Average monthly (last 6 months)
    six_months_ago = (today - relativedelta(months=6)).replace(day=1)
    avg_query = select(func.coalesce(func.sum(Grocery.cost), 0)).where(
        and_(
            Grocery.user_id == user_id,
            Grocery.purchase_date >= six_months_ago,
            Grocery.purchase_date < month_start
        )
    )
    avg_result = await db.execute(avg_query)
    total_6_months = float(avg_result.scalar() or 0)
    average_monthly = total_6_months / 6 if total_6_months > 0 else 0

    return BudgetStats(
        spent_this_month=round(spent_this_month, 2),
        spent_last_month=round(spent_last_month, 2),
        average_monthly=round(average_monthly, 2),
        currency="UAH"  # All grocery costs are stored in UAH; frontend converts to user's preferred currency
    )


async def get_nutrition_stats(db: AsyncSession, user_id: UUID) -> Optional[NutritionStats]:
    """Get nutrition goal statistics."""
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    # Get user's nutrition goals (may have multiple for different profiles)
    # Aggregate all active goals for dashboard summary
    goal_query = select(
        func.sum(NutritionGoal.daily_calories).label('daily_calories'),
        func.sum(NutritionGoal.daily_protein_g).label('daily_protein_g'),
        func.sum(NutritionGoal.daily_carbs_g).label('daily_carbs_g'),
        func.sum(NutritionGoal.daily_fat_g).label('daily_fat_g'),
    ).where(
        and_(
            NutritionGoal.user_id == user_id,
            NutritionGoal.is_active == True
        )
    )
    goal_result = await db.execute(goal_query)
    goal = goal_result.first()

    # Check if there are no active goals (all aggregated values will be NULL)
    if not goal or goal.daily_calories is None:
        return None

    # Get today's nutrition logs
    today_logs_query = select(
        func.coalesce(func.sum(NutritionLog.calories), 0).label('calories'),
        func.coalesce(func.sum(NutritionLog.protein_g), 0).label('protein'),
        func.coalesce(func.sum(NutritionLog.carbs_g), 0).label('carbs'),
        func.coalesce(func.sum(NutritionLog.fat_g), 0).label('fat'),
    ).where(
        and_(
            NutritionLog.user_id == user_id,
            NutritionLog.date == today
        )
    )
    today_result = await db.execute(today_logs_query)
    today_totals = today_result.first()

    # Calculate goal adherence this week
    # Count days where calories were within 10% of goal
    adherence_days = 0
    for i in range(7):
        check_date = week_start + timedelta(days=i)
        if check_date > today:
            break

        day_query = select(func.coalesce(func.sum(NutritionLog.calories), 0)).where(
            and_(
                NutritionLog.user_id == user_id,
                NutritionLog.date == check_date
            )
        )
        day_result = await db.execute(day_query)
        day_calories = day_result.scalar() or 0

        if goal.daily_calories:
            lower = goal.daily_calories * 0.9
            upper = goal.daily_calories * 1.1
            if lower <= day_calories <= upper:
                adherence_days += 1

    days_passed = min((today - week_start).days + 1, 7)
    adherence_percent = int((adherence_days / days_passed) * 100) if days_passed > 0 else 0

    return NutritionStats(
        calories_today=int(today_totals.calories) if today_totals else 0,
        calories_goal=goal.daily_calories or 2000,
        protein_today=int(today_totals.protein) if today_totals else 0,
        protein_goal=goal.daily_protein_g or 50,
        carbs_today=int(today_totals.carbs) if today_totals else 0,
        carbs_goal=goal.daily_carbs_g or 250,
        fat_today=int(today_totals.fat) if today_totals else 0,
        fat_goal=goal.daily_fat_g or 65,
        goal_adherence_percent=adherence_percent
    )


async def get_upcoming_meals(db: AsyncSession, user_id: UUID, days: int = 7) -> List[UpcomingMeal]:
    """Get upcoming scheduled meals."""
    today = date.today()
    end_date = today + timedelta(days=days)

    query = (
        select(Meal)
        .join(MealPlan)
        .options(selectinload(Meal.recipe))
        .where(
            and_(
                MealPlan.user_id == user_id,
                MealPlan.is_archived == False,
                Meal.date >= today,
                Meal.date <= end_date
            )
        )
        .order_by(Meal.date, Meal.meal_type)
        .limit(15)
    )
    result = await db.execute(query)
    meals = result.scalars().all()

    return [
        UpcomingMeal(
            id=meal.id,
            date=meal.date,
            meal_type=meal.meal_type,
            recipe_id=meal.recipe_id,
            recipe_name=meal.recipe.name if meal.recipe else None,
            custom_meal_name=meal.custom_name,
            is_leftover=meal.is_leftover or False
        )
        for meal in meals
    ]


async def get_expiring_items(db: AsyncSession, user_id: UUID, days: int = 7) -> List[ExpiringItem]:
    """Get items expiring soon from pantry and groceries."""
    today = date.today()
    expiry_threshold = today + timedelta(days=days)
    items = []

    # Pantry items expiring soon
    pantry_query = select(PantryItem).where(
        and_(
            PantryItem.user_id == user_id,
            PantryItem.is_archived == False,
            PantryItem.expiry_date.isnot(None),
            PantryItem.expiry_date <= expiry_threshold,
            PantryItem.expiry_date >= today
        )
    ).order_by(PantryItem.expiry_date).limit(10)

    pantry_result = await db.execute(pantry_query)
    pantry_items = pantry_result.scalars().all()

    for item in pantry_items:
        days_until = (item.expiry_date - today).days
        items.append(ExpiringItem(
            id=item.id,
            name=item.item_name,
            expiry_date=item.expiry_date,
            days_until_expiry=days_until,
            quantity=item.quantity,
            unit=item.unit,
            location=item.storage_location,
            source="pantry"
        ))

    # Grocery items expiring soon (not yet in pantry)
    grocery_query = select(Grocery).where(
        and_(
            Grocery.user_id == user_id,
            Grocery.is_archived == False,
            Grocery.expiry_date.isnot(None),
            Grocery.expiry_date <= expiry_threshold,
            Grocery.expiry_date >= today
        )
    ).order_by(Grocery.expiry_date).limit(10)

    grocery_result = await db.execute(grocery_query)
    grocery_items = grocery_result.scalars().all()

    for item in grocery_items:
        days_until = (item.expiry_date - today).days
        items.append(ExpiringItem(
            id=item.id,
            name=item.item_name,
            expiry_date=item.expiry_date,
            days_until_expiry=days_until,
            quantity=item.quantity,
            unit=item.unit,
            location=None,
            source="grocery"
        ))

    # Sort all by days until expiry
    items.sort(key=lambda x: x.days_until_expiry)
    return items[:10]


async def get_recent_activity(db: AsyncSession, user_id: UUID, limit: int = 10) -> List[ActivityItem]:
    """Get recent activity across all modules."""
    activities = []
    cutoff = datetime.utcnow() - timedelta(days=7)

    # Recent recipes
    recipe_query = select(Recipe).where(
        and_(
            Recipe.user_id == user_id,
            Recipe.created_at >= cutoff
        )
    ).order_by(desc(Recipe.created_at)).limit(5)
    recipe_result = await db.execute(recipe_query)
    for recipe in recipe_result.scalars().all():
        activities.append(ActivityItem(
            id=f"recipe_{recipe.id}",
            type="recipe_added",
            title=f"Added recipe: {recipe.name}",
            description=recipe.category,
            timestamp=recipe.created_at,
            icon="book-open",
            link=f"/recipes/{recipe.id}"
        ))

    # Recent groceries
    grocery_query = select(Grocery).where(
        and_(
            Grocery.user_id == user_id,
            Grocery.created_at >= cutoff
        )
    ).order_by(desc(Grocery.created_at)).limit(5)
    grocery_result = await db.execute(grocery_query)
    for grocery in grocery_result.scalars().all():
        activities.append(ActivityItem(
            id=f"grocery_{grocery.id}",
            type="grocery_added",
            title=f"Added grocery: {grocery.item_name}",
            description=grocery.category,
            timestamp=grocery.created_at,
            icon="shopping-cart",
            link="/groceries"
        ))

    # Recent pantry items
    pantry_query = select(PantryItem).where(
        and_(
            PantryItem.user_id == user_id,
            PantryItem.created_at >= cutoff
        )
    ).order_by(desc(PantryItem.created_at)).limit(5)
    pantry_result = await db.execute(pantry_query)
    for item in pantry_result.scalars().all():
        activities.append(ActivityItem(
            id=f"pantry_{item.id}",
            type="pantry_added",
            title=f"Added to pantry: {item.item_name}",
            description=item.storage_location,
            timestamp=item.created_at,
            icon="package",
            link="/pantry"
        ))

    # Sort by timestamp and limit
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    return activities[:limit]


async def get_waste_stats(db: AsyncSession, user_id: UUID) -> WasteStats:
    """Get food waste statistics."""
    today = date.today()
    month_start = today.replace(day=1)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    last_month_end = month_start - timedelta(days=1)

    # Wasted this month (from both groceries and pantry)
    grocery_wasted_query = select(func.count(Grocery.id)).where(
        and_(
            Grocery.user_id == user_id,
            Grocery.is_wasted == True,
            Grocery.wasted_at >= month_start
        )
    )
    grocery_wasted_result = await db.execute(grocery_wasted_query)
    grocery_wasted = grocery_wasted_result.scalar() or 0

    pantry_wasted_query = select(func.count(PantryItem.id)).where(
        and_(
            PantryItem.user_id == user_id,
            PantryItem.is_wasted == True,
            PantryItem.wasted_at >= month_start
        )
    )
    pantry_wasted_result = await db.execute(pantry_wasted_query)
    pantry_wasted = pantry_wasted_result.scalar() or 0

    wasted_this_month = grocery_wasted + pantry_wasted

    # Wasted last month
    grocery_last_query = select(func.count(Grocery.id)).where(
        and_(
            Grocery.user_id == user_id,
            Grocery.is_wasted == True,
            Grocery.wasted_at >= last_month_start,
            Grocery.wasted_at <= last_month_end
        )
    )
    grocery_last_result = await db.execute(grocery_last_query)

    pantry_last_query = select(func.count(PantryItem.id)).where(
        and_(
            PantryItem.user_id == user_id,
            PantryItem.is_wasted == True,
            PantryItem.wasted_at >= last_month_start,
            PantryItem.wasted_at <= last_month_end
        )
    )
    pantry_last_result = await db.execute(pantry_last_query)

    wasted_last_month = (grocery_last_result.scalar() or 0) + (pantry_last_result.scalar() or 0)

    # Waste rate (% of items wasted in last 30 days)
    thirty_days_ago = today - timedelta(days=30)
    total_items_query = select(func.count(Grocery.id)).where(
        and_(
            Grocery.user_id == user_id,
            Grocery.created_at >= thirty_days_ago
        )
    )
    total_items_result = await db.execute(total_items_query)
    total_items = total_items_result.scalar() or 0

    waste_rate = (wasted_this_month / total_items * 100) if total_items > 0 else 0

    # Top waste reason
    reason_query = select(
        Grocery.waste_reason,
        func.count(Grocery.id).label('count')
    ).where(
        and_(
            Grocery.user_id == user_id,
            Grocery.is_wasted == True,
            Grocery.waste_reason.isnot(None)
        )
    ).group_by(Grocery.waste_reason).order_by(desc('count')).limit(1)
    reason_result = await db.execute(reason_query)
    top_reason_row = reason_result.first()
    top_reason = top_reason_row.waste_reason if top_reason_row else None

    # Estimated cost wasted this month
    cost_query = select(func.coalesce(func.sum(Grocery.cost), 0)).where(
        and_(
            Grocery.user_id == user_id,
            Grocery.is_wasted == True,
            Grocery.wasted_at >= month_start
        )
    )
    cost_result = await db.execute(cost_query)
    cost_wasted = float(cost_result.scalar() or 0)

    return WasteStats(
        wasted_this_month=wasted_this_month,
        wasted_last_month=wasted_last_month,
        waste_rate_percent=round(waste_rate, 1),
        top_waste_reason=top_reason,
        estimated_cost_wasted=round(cost_wasted, 2)
    )


async def get_skills_progress(db: AsyncSession, user_id: UUID) -> List[SkillProgress]:
    """Get skills in progress."""
    query = (
        select(UserSkill)
        .options(selectinload(UserSkill.skill))
        .where(
            and_(
                UserSkill.user_id == user_id,
                UserSkill.status.in_(['learning', 'practicing'])
            )
        )
        .order_by(desc(UserSkill.updated_at))
        .limit(5)
    )
    result = await db.execute(query)
    user_skills = result.scalars().all()

    return [
        SkillProgress(
            id=us.skill_id,
            name=us.skill.name if us.skill else "Unknown",
            category=us.skill.category if us.skill else "other",
            proficiency=us.proficiency_level or "beginner",
            progress_percent=us.progress_percent or 0,
            times_practiced=us.times_practiced or 0
        )
        for us in user_skills
    ]


async def get_learning_paths(db: AsyncSession, user_id: UUID) -> List[LearningPathProgress]:
    """Get learning path progress."""
    query = (
        select(UserLearningPath)
        .options(selectinload(UserLearningPath.learning_path))
        .where(
            and_(
                UserLearningPath.user_id == user_id,
                UserLearningPath.status == 'in_progress'
            )
        )
        .limit(3)
    )
    result = await db.execute(query)
    user_paths = result.scalars().all()

    paths = []
    for up in user_paths:
        if up.learning_path:
            total_skills = up.learning_path.skill_count or 0
            completed = up.skills_completed or 0
            progress = int((completed / total_skills) * 100) if total_skills > 0 else 0

            paths.append(LearningPathProgress(
                id=up.learning_path_id,
                name=up.learning_path.name,
                skills_completed=completed,
                total_skills=total_skills,
                progress_percent=progress
            ))

    return paths


async def get_seasonal_items(db: AsyncSession, user_id: UUID, limit: int = 6) -> List[SeasonalItem]:
    """Get current seasonal produce."""
    current_month = date.today().month

    # Use any_() for PostgreSQL ARRAY column check
    query = select(SeasonalProduce).where(
        SeasonalProduce.available_months.any(current_month)
    ).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()

    return [
        SeasonalItem(
            id=item.id,
            name=item.name,
            category=item.category,
            is_peak=current_month in (item.peak_months or []),
            nutrition_highlight=item.nutrition_highlights
        )
        for item in items
    ]


async def get_equipment_alerts(db: AsyncSession, user_id: UUID) -> List[EquipmentAlert]:
    """Get kitchen equipment maintenance alerts."""
    today = date.today()

    query = select(KitchenEquipment).where(
        and_(
            KitchenEquipment.user_id == user_id,
            KitchenEquipment.is_archived == False,
            KitchenEquipment.maintenance_interval_days.isnot(None)
        )
    )

    result = await db.execute(query)
    equipment = result.scalars().all()

    alerts = []
    for eq in equipment:
        if eq.last_maintenance_date and eq.maintenance_interval_days:
            next_maintenance = eq.last_maintenance_date + timedelta(days=eq.maintenance_interval_days)
            if next_maintenance <= today:
                days_overdue = (today - next_maintenance).days
                alerts.append(EquipmentAlert(
                    id=eq.id,
                    name=eq.name,
                    category=eq.category,
                    maintenance_type="overdue" if days_overdue > 0 else "due",
                    days_overdue=days_overdue if days_overdue > 0 else None,
                    last_maintenance=eq.last_maintenance_date
                ))
            elif next_maintenance <= today + timedelta(days=7):
                # Due within a week
                alerts.append(EquipmentAlert(
                    id=eq.id,
                    name=eq.name,
                    category=eq.category,
                    maintenance_type="due",
                    days_overdue=None,
                    last_maintenance=eq.last_maintenance_date
                ))

    # Sort by overdue first
    alerts.sort(key=lambda x: (x.maintenance_type != "overdue", -(x.days_overdue or 0)))
    return alerts[:5]


async def get_pending_shopping_lists(db: AsyncSession, user_id: UUID) -> int:
    """Get count of pending shopping lists."""
    query = select(func.count(ShoppingList.id)).where(
        and_(
            ShoppingList.user_id == user_id,
            ShoppingList.status == "active",
            ShoppingList.is_archived == False
        )
    )
    result = await db.execute(query)
    return result.scalar() or 0


async def get_unread_support_messages(db: AsyncSession, user_id: UUID) -> int:
    """Get count of support topics with new admin replies."""
    # This is a simplified check - in production you'd track read status
    query = select(func.count(SupportTopic.id)).where(
        and_(
            SupportTopic.user_id == user_id,
            SupportTopic.status != 'resolved'
        )
    )
    result = await db.execute(query)
    return result.scalar() or 0


async def get_dashboard_data(db: AsyncSession, user_id: UUID) -> DashboardResponse:
    """Aggregate all dashboard data."""
    # Fetch all data concurrently would be ideal, but for simplicity we'll do sequential
    meal_plan_stats = await get_meal_plan_stats(db, user_id)
    pantry_stats = await get_pantry_stats(db, user_id)
    recipe_stats = await get_recipe_stats(db, user_id)
    budget_stats = await get_budget_stats(db, user_id)
    nutrition_stats = await get_nutrition_stats(db, user_id)
    upcoming_meals = await get_upcoming_meals(db, user_id)
    expiring_items = await get_expiring_items(db, user_id)
    recent_activity = await get_recent_activity(db, user_id)
    waste_stats = await get_waste_stats(db, user_id)
    skills_in_progress = await get_skills_progress(db, user_id)
    learning_paths = await get_learning_paths(db, user_id)
    seasonal_items = await get_seasonal_items(db, user_id)
    equipment_alerts = await get_equipment_alerts(db, user_id)
    pending_shopping_lists = await get_pending_shopping_lists(db, user_id)
    unread_support = await get_unread_support_messages(db, user_id)

    return DashboardResponse(
        meal_plan_stats=meal_plan_stats,
        pantry_stats=pantry_stats,
        recipe_stats=recipe_stats,
        budget_stats=budget_stats,
        nutrition_stats=nutrition_stats,
        upcoming_meals=upcoming_meals,
        expiring_items=expiring_items,
        recent_activity=recent_activity,
        waste_stats=waste_stats,
        skills_in_progress=skills_in_progress,
        learning_paths=learning_paths,
        seasonal_items=seasonal_items,
        equipment_alerts=equipment_alerts,
        pending_shopping_lists=pending_shopping_lists,
        unread_support_messages=unread_support
    )
