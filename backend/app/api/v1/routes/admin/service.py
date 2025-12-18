"""
Admin service layer for business logic.
"""
from datetime import datetime, timedelta
from typing import List, Tuple, Optional, Dict, Any
from uuid import UUID

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User, UserRole, SubscriptionTier
from app.models.subscription import Tier, Feature, TierFeature, Subscription
from app.models.billing import UserSubscription, PaymentHistory
from app.models.recipe import Recipe
from app.models.grocery import Grocery, ShoppingList
from app.models.pantry import PantryItem
from app.models.meal_plan import MealPlan
from app.models.restaurant import Restaurant, RestaurantMeal
from app.models.nutrition import NutritionLog, NutritionGoal, HealthMetric
from app.models.learning import UserSkill
from app.models.kitchen_equipment import KitchenEquipment
from app.models.currency import Currency


class AdminService:
    """Service class for admin operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ==================== USER MANAGEMENT ====================

    async def get_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        tier: Optional[SubscriptionTier] = None,
    ) -> Tuple[List[User], int]:
        """Get paginated list of users with optional filters."""
        query = select(User)
        count_query = select(func.count(User.id))

        # Apply filters
        filters = []
        if search:
            search_filter = or_(
                User.email.ilike(f"%{search}%"),
                User.name.ilike(f"%{search}%"),
            )
            filters.append(search_filter)

        if role:
            filters.append(User.role == role)

        if tier:
            filters.append(User.subscription_tier == tier)

        if filters:
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        offset = (page - 1) * page_size
        query = query.order_by(User.created_at.desc()).offset(offset).limit(page_size)

        result = await self.db.execute(query)
        users = list(result.scalars().all())

        return users, total

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Get a user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def update_user(
        self,
        user_id: UUID,
        role: Optional[UserRole] = None,
        subscription_tier: Optional[SubscriptionTier] = None,
        is_active: Optional[bool] = None,
    ) -> Optional[User]:
        """Update user role, tier, or status."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None

        if role is not None:
            user.role = role
        if subscription_tier is not None:
            user.subscription_tier = subscription_tier
        if is_active is not None:
            user.is_active = is_active

        user.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def suspend_user(self, user_id: UUID, reason: Optional[str] = None) -> Optional[User]:
        """Suspend a user (set is_active to False)."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None

        user.is_active = False
        user.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def unsuspend_user(self, user_id: UUID) -> Optional[User]:
        """Unsuspend a user (set is_active to True)."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None

        user.is_active = True
        user.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(user)
        return user

    # ==================== TIER MANAGEMENT ====================

    async def get_tiers(self) -> List[Tier]:
        """Get all tiers."""
        result = await self.db.execute(
            select(Tier).order_by(Tier.name)
        )
        return list(result.scalars().all())

    async def get_tier_by_id(self, tier_id: UUID) -> Optional[Tier]:
        """Get a tier by ID."""
        result = await self.db.execute(select(Tier).where(Tier.id == tier_id))
        return result.scalar_one_or_none()

    async def update_tier(
        self,
        tier_id: UUID,
        display_name: Optional[str] = None,
        price_monthly: Optional[float] = None,
        features: Optional[dict] = None,
    ) -> Optional[Tier]:
        """Update tier details."""
        tier = await self.get_tier_by_id(tier_id)
        if not tier:
            return None

        if display_name is not None:
            tier.display_name = display_name
        if price_monthly is not None:
            tier.price_monthly = price_monthly
        if features is not None:
            tier.features = features

        await self.db.commit()
        await self.db.refresh(tier)
        return tier

    async def get_tier_features(self, tier_id: UUID) -> List[Dict[str, Any]]:
        """Get features for a tier with feature details."""
        result = await self.db.execute(
            select(TierFeature, Feature)
            .join(Feature, TierFeature.feature_id == Feature.id)
            .where(TierFeature.tier_id == tier_id)
        )
        rows = result.all()

        features = []
        for tier_feature, feature in rows:
            features.append({
                "tier_id": tier_feature.tier_id,
                "feature_id": tier_feature.feature_id,
                "feature_key": feature.key,
                "feature_name": feature.name,
                "enabled": tier_feature.enabled,
                "limit_value": tier_feature.limit_value,
            })
        return features

    async def get_all_features(self) -> List[Feature]:
        """Get all available features."""
        result = await self.db.execute(select(Feature).order_by(Feature.name))
        return list(result.scalars().all())

    async def get_all_tiers_features(self) -> Dict[str, Dict[str, Dict[str, Any]]]:
        """Get all features for all tiers for comparison table."""
        # Get all tiers
        tiers_result = await self.db.execute(select(Tier))
        tiers = list(tiers_result.scalars().all())

        # Get all tier features in one query
        result = await self.db.execute(
            select(TierFeature, Feature, Tier)
            .join(Feature, TierFeature.feature_id == Feature.id)
            .join(Tier, TierFeature.tier_id == Tier.id)
        )
        rows = result.all()

        # Organize by tier_id -> feature_id -> feature data
        tier_features: Dict[str, Dict[str, Dict[str, Any]]] = {}
        for tier in tiers:
            tier_features[str(tier.id)] = {}

        for tier_feature, feature, tier in rows:
            tier_features[str(tier.id)][str(feature.id)] = {
                "enabled": tier_feature.enabled,
                "limit_value": tier_feature.limit_value,
                "feature_key": feature.key,
                "feature_name": feature.name,
            }

        return tier_features

    async def assign_feature_to_tier(
        self,
        tier_id: UUID,
        feature_id: UUID,
        enabled: bool = True,
        limit_value: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        """Assign or update a feature for a tier."""
        # Check if assignment exists
        result = await self.db.execute(
            select(TierFeature).where(
                and_(
                    TierFeature.tier_id == tier_id,
                    TierFeature.feature_id == feature_id,
                )
            )
        )
        tier_feature = result.scalar_one_or_none()

        if tier_feature:
            # Update existing
            tier_feature.enabled = enabled
            tier_feature.limit_value = limit_value
        else:
            # Create new
            tier_feature = TierFeature(
                tier_id=tier_id,
                feature_id=feature_id,
                enabled=enabled,
                limit_value=limit_value,
            )
            self.db.add(tier_feature)

        await self.db.commit()
        await self.db.refresh(tier_feature)

        # Get feature details
        feature_result = await self.db.execute(
            select(Feature).where(Feature.id == feature_id)
        )
        feature = feature_result.scalar_one_or_none()

        return {
            "tier_id": tier_feature.tier_id,
            "feature_id": tier_feature.feature_id,
            "feature_key": feature.key if feature else None,
            "feature_name": feature.name if feature else None,
            "enabled": tier_feature.enabled,
            "limit_value": tier_feature.limit_value,
        }

    # ==================== ANALYTICS ====================

    async def get_platform_stats(self) -> Dict[str, Any]:
        """Get platform-wide statistics."""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)

        # Total users
        total_users_result = await self.db.execute(select(func.count(User.id)))
        total_users = total_users_result.scalar() or 0

        # Active users (is_active = True)
        active_users_result = await self.db.execute(
            select(func.count(User.id)).where(User.is_active == True)
        )
        active_users = active_users_result.scalar() or 0

        # New users today
        new_today_result = await self.db.execute(
            select(func.count(User.id)).where(User.created_at >= today_start)
        )
        new_users_today = new_today_result.scalar() or 0

        # New users this week
        new_week_result = await self.db.execute(
            select(func.count(User.id)).where(User.created_at >= week_start)
        )
        new_users_this_week = new_week_result.scalar() or 0

        # New users this month
        new_month_result = await self.db.execute(
            select(func.count(User.id)).where(User.created_at >= month_start)
        )
        new_users_this_month = new_month_result.scalar() or 0

        # Subscription stats
        total_subs_result = await self.db.execute(
            select(func.count(User.id)).where(
                User.subscription_tier != SubscriptionTier.FREE
            )
        )
        total_subscriptions = total_subs_result.scalar() or 0

        active_subs_result = await self.db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.subscription_tier != SubscriptionTier.FREE,
                    User.is_active == True,
                )
            )
        )
        active_subscriptions = active_subs_result.scalar() or 0

        # Get tier prices from database
        tiers_result = await self.db.execute(select(Tier))
        tiers = {tier.name: float(tier.price_monthly or 0) for tier in tiers_result.scalars().all()}

        # Fallback prices if tiers not in DB
        plus_price = tiers.get("PLUS", 9.99)
        pro_price = tiers.get("PRO", 19.99)

        # Calculate MRR from actual tier prices
        plus_count_result = await self.db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.subscription_tier == SubscriptionTier.PLUS,
                    User.is_active == True,
                )
            )
        )
        plus_count = plus_count_result.scalar() or 0

        pro_count_result = await self.db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.subscription_tier == SubscriptionTier.PRO,
                    User.is_active == True,
                )
            )
        )
        pro_count = pro_count_result.scalar() or 0

        mrr = (plus_count * plus_price) + (pro_count * pro_price)
        arr = mrr * 12

        # Churn rate calculation
        # Count users who were paying subscribers at the start of the month
        # but became inactive or downgraded to free
        inactive_this_month = await self.db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.is_active == False,
                    User.updated_at >= month_start,
                )
            )
        )
        churned = inactive_this_month.scalar() or 0

        # Churn rate = churned subscribers / total subscribers at start of period
        churn_rate = (churned / active_subscriptions * 100) if active_subscriptions > 0 else 0.0

        return {
            "total_users": total_users,
            "active_users": active_users,
            "new_users_today": new_users_today,
            "new_users_this_week": new_users_this_week,
            "new_users_this_month": new_users_this_month,
            "total_subscriptions": total_subscriptions,
            "active_subscriptions": active_subscriptions,
            "mrr": round(mrr, 2),
            "arr": round(arr, 2),
            "churn_rate": round(churn_rate, 2),
        }

    async def get_user_acquisition_data(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get user acquisition data for the past N days with all days filled in."""
        now = datetime.utcnow()
        start_date = now - timedelta(days=days)

        # Group users by date
        result = await self.db.execute(
            select(
                func.date(User.created_at).label("date"),
                func.count(User.id).label("count"),
            )
            .where(User.created_at >= start_date)
            .group_by(func.date(User.created_at))
            .order_by(func.date(User.created_at))
        )
        rows = result.all()

        # Create a dict of actual data
        data_dict = {str(row.date): row.count for row in rows}

        # Fill in all days in the range (including days with 0 signups)
        all_days = []
        current_date = start_date.date()
        end_date = now.date()
        while current_date <= end_date:
            date_str = str(current_date)
            all_days.append({
                "date": date_str,
                "count": data_dict.get(date_str, 0)
            })
            current_date += timedelta(days=1)

        return all_days

    async def get_engagement_metrics(self) -> Dict[str, Any]:
        """Get user engagement metrics based on actual activity across all modules."""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)
        prev_month_start = month_start - timedelta(days=30)

        # Models to track activity from - use only created_at as all models have it
        # Some models have updated_at, some don't - be safe with created_at only
        activity_models = [
            (Recipe, "user_id", True),  # has updated_at
            (Grocery, "user_id", False),  # no updated_at
            (ShoppingList, "user_id", True),  # has updated_at
            (PantryItem, "user_id", True),  # has updated_at
            (MealPlan, "user_id", True),  # has updated_at
            (NutritionLog, "user_id", False),  # no updated_at
        ]

        # DAU - users who created/updated anything today
        dau_user_ids = set()
        for model, user_field, has_updated in activity_models:
            if has_updated:
                result = await self.db.execute(
                    select(func.distinct(getattr(model, user_field))).where(
                        or_(
                            model.created_at >= today_start,
                            model.updated_at >= today_start,
                        )
                    )
                )
            else:
                result = await self.db.execute(
                    select(func.distinct(getattr(model, user_field))).where(
                        model.created_at >= today_start
                    )
                )
            dau_user_ids.update(uid for uid in result.scalars().all() if uid)
        dau = len(dau_user_ids)

        # WAU - users active this week
        wau_user_ids = set()
        for model, user_field, has_updated in activity_models:
            if has_updated:
                result = await self.db.execute(
                    select(func.distinct(getattr(model, user_field))).where(
                        or_(
                            model.created_at >= week_start,
                            model.updated_at >= week_start,
                        )
                    )
                )
            else:
                result = await self.db.execute(
                    select(func.distinct(getattr(model, user_field))).where(
                        model.created_at >= week_start
                    )
                )
            wau_user_ids.update(uid for uid in result.scalars().all() if uid)
        wau = len(wau_user_ids)

        # MAU - users active this month
        mau_user_ids = set()
        for model, user_field, has_updated in activity_models:
            if has_updated:
                result = await self.db.execute(
                    select(func.distinct(getattr(model, user_field))).where(
                        or_(
                            model.created_at >= month_start,
                            model.updated_at >= month_start,
                        )
                    )
                )
            else:
                result = await self.db.execute(
                    select(func.distinct(getattr(model, user_field))).where(
                        model.created_at >= month_start
                    )
                )
            mau_user_ids.update(uid for uid in result.scalars().all() if uid)
        mau = len(mau_user_ids)

        # Previous month active users for retention calculation
        prev_month_user_ids = set()
        for model, user_field, _ in activity_models:
            result = await self.db.execute(
                select(func.distinct(getattr(model, user_field))).where(
                    and_(
                        model.created_at >= prev_month_start,
                        model.created_at < month_start,
                    )
                )
            )
            prev_month_user_ids.update(uid for uid in result.scalars().all() if uid)

        # Retention rate = users active in both periods / users active in previous period
        if prev_month_user_ids:
            retained_users = mau_user_ids & prev_month_user_ids
            retention_rate_30d = (len(retained_users) / len(prev_month_user_ids)) * 100
        else:
            # If no previous month data, show 100% for existing active users
            retention_rate_30d = 100.0 if mau > 0 else 0.0

        # Average session duration - estimate from total activity
        # In production, this would come from a proper analytics service
        avg_session_duration = 0.0
        total_items = 0
        for model, _, _ in activity_models:
            count_result = await self.db.execute(
                select(func.count(model.id)).where(model.created_at >= month_start)
            )
            total_items += count_result.scalar() or 0

        # Estimate: average 3 min per item created, cap at 30 min
        if total_items > 0 and mau > 0:
            avg_session_duration = min((total_items / mau) * 3.0, 30.0)

        return {
            "dau": dau,
            "wau": wau,
            "mau": mau,
            "avg_session_duration": round(avg_session_duration, 1),
            "retention_rate_30d": round(retention_rate_30d, 1),
        }

    async def get_module_usage_stats(self) -> List[Dict[str, Any]]:
        """Get usage statistics for each module."""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)

        modules = [
            ("recipes", Recipe, "user_id"),
            ("groceries", Grocery, "user_id"),
            ("shopping_lists", ShoppingList, "user_id"),
            ("pantry", PantryItem, "user_id"),
            ("meal_plans", MealPlan, "user_id"),
            ("restaurants", Restaurant, "user_id"),
            ("restaurant_meals", RestaurantMeal, "user_id"),
            ("nutrition_logs", NutritionLog, "user_id"),
            ("nutrition_goals", NutritionGoal, "user_id"),
            ("health_metrics", HealthMetric, "user_id"),
            ("user_skills", UserSkill, "user_id"),
            ("kitchen_equipment", KitchenEquipment, "user_id"),
        ]

        stats = []
        for module_name, model, user_field in modules:
            # Total items
            total_result = await self.db.execute(select(func.count(model.id)))
            total_items = total_result.scalar() or 0

            # Active users (distinct users with items)
            active_users_result = await self.db.execute(
                select(func.count(func.distinct(getattr(model, user_field))))
            )
            active_users = active_users_result.scalar() or 0

            # Items created today
            today_result = await self.db.execute(
                select(func.count(model.id)).where(model.created_at >= today_start)
            )
            items_today = today_result.scalar() or 0

            # Items created this week
            week_result = await self.db.execute(
                select(func.count(model.id)).where(model.created_at >= week_start)
            )
            items_week = week_result.scalar() or 0

            stats.append({
                "module": module_name,
                "total_items": total_items,
                "active_users": active_users,
                "items_created_today": items_today,
                "items_created_this_week": items_week,
            })

        return stats

    # ==================== CURRENCY MANAGEMENT ====================

    async def get_currencies(self, active_only: bool = False) -> List[Currency]:
        """Get all currencies, optionally filtered by active status."""
        query = select(Currency).order_by(Currency.code)
        if active_only:
            query = query.where(Currency.is_active == True)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_currency_by_code(self, code: str) -> Optional[Currency]:
        """Get a currency by its code."""
        result = await self.db.execute(
            select(Currency).where(Currency.code == code.upper())
        )
        return result.scalar_one_or_none()

    async def get_currency_by_id(self, currency_id: UUID) -> Optional[Currency]:
        """Get a currency by its ID."""
        result = await self.db.execute(
            select(Currency).where(Currency.id == currency_id)
        )
        return result.scalar_one_or_none()

    async def create_currency(
        self,
        code: str,
        name: str,
        symbol: str,
        decimal_places: int = 2,
        symbol_position: str = "before",
        exchange_rate: float = 1.0,
        is_active: bool = True,
    ) -> Currency:
        """Create a new currency."""
        currency = Currency(
            code=code.upper(),
            name=name,
            symbol=symbol,
            decimal_places=decimal_places,
            symbol_position=symbol_position,
            exchange_rate=exchange_rate,
            is_active=is_active,
        )
        self.db.add(currency)
        await self.db.commit()
        await self.db.refresh(currency)
        return currency

    async def update_currency(
        self,
        currency_id: UUID,
        name: Optional[str] = None,
        symbol: Optional[str] = None,
        decimal_places: Optional[int] = None,
        symbol_position: Optional[str] = None,
        exchange_rate: Optional[float] = None,
        is_active: Optional[bool] = None,
    ) -> Optional[Currency]:
        """Update a currency."""
        currency = await self.get_currency_by_id(currency_id)
        if not currency:
            return None

        if name is not None:
            currency.name = name
        if symbol is not None:
            currency.symbol = symbol
        if decimal_places is not None:
            currency.decimal_places = decimal_places
        if symbol_position is not None:
            currency.symbol_position = symbol_position
        if exchange_rate is not None:
            currency.exchange_rate = exchange_rate
        if is_active is not None:
            currency.is_active = is_active

        currency.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(currency)
        return currency

    async def delete_currency(self, currency_id: UUID) -> bool:
        """Delete a currency (soft delete by deactivating)."""
        currency = await self.get_currency_by_id(currency_id)
        if not currency:
            return False

        currency.is_active = False
        currency.updated_at = datetime.utcnow()
        await self.db.commit()
        return True
