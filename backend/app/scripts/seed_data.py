"""
Seed data script for MealCraft.
Run with: python -m app.scripts.seed_data
"""
import asyncio
import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base
from app.models.subscription import Tier, Feature, TierFeature


# Tier definitions
TIERS = [
    {
        "name": "HOME_COOK",
        "display_name": "Home Cook",
        "price_monthly": Decimal("0.00"),
        "features": {
            "meal_plans_per_month": 5,
            "max_saved_recipes": 20,
            "ai_generations_per_month": 5,
            "grocery_inventory": False,
            "expiry_tracking": False,
            "batch_cooking": False,
            "templates": False,
            "favorites": False,
            "health_integrations": False,
            "scheduled_backups": False,
            "advanced_analytics": False,
        },
    },
    {
        "name": "CHEFS_CHOICE",
        "display_name": "Chef's Choice",
        "price_monthly": Decimal("9.99"),
        "features": {
            "meal_plans_per_month": 30,
            "max_saved_recipes": 100,
            "ai_generations_per_month": 30,
            "grocery_inventory": True,
            "expiry_tracking": True,
            "batch_cooking": True,
            "templates": False,
            "favorites": True,
            "health_integrations": False,
            "scheduled_backups": False,
            "advanced_analytics": False,
        },
    },
    {
        "name": "MASTER_CHEF",
        "display_name": "Master Chef",
        "price_monthly": Decimal("19.99"),
        "features": {
            "meal_plans_per_month": -1,  # unlimited
            "max_saved_recipes": -1,  # unlimited
            "ai_generations_per_month": -1,  # unlimited
            "grocery_inventory": True,
            "expiry_tracking": True,
            "batch_cooking": True,
            "templates": True,
            "favorites": True,
            "health_integrations": True,
            "scheduled_backups": True,
            "advanced_analytics": True,
        },
    },
]

# Feature definitions
FEATURES = [
    {
        "key": "meal_plans_per_month",
        "name": "Monthly Meal Plans",
        "description": "Number of AI-generated meal plans allowed per month",
    },
    {
        "key": "max_saved_recipes",
        "name": "Saved Recipes",
        "description": "Maximum number of recipes that can be saved",
    },
    {
        "key": "ai_generations_per_month",
        "name": "AI Recipe Generations",
        "description": "Number of AI recipe generations allowed per month",
    },
    {
        "key": "grocery_inventory",
        "name": "Grocery Inventory",
        "description": "Full grocery inventory management",
    },
    {
        "key": "expiry_tracking",
        "name": "Expiry Tracking",
        "description": "Track expiration dates and get alerts",
    },
    {
        "key": "batch_cooking",
        "name": "Batch Cooking",
        "description": "Plan multi-day batch cooking sessions",
    },
    {
        "key": "templates",
        "name": "Meal Plan Templates",
        "description": "Save and reuse meal plan templates",
    },
    {
        "key": "favorites",
        "name": "Favorites",
        "description": "Save favorite recipes for quick access",
    },
    {
        "key": "health_integrations",
        "name": "Health Integrations",
        "description": "Connect with Apple Health and other health apps",
    },
    {
        "key": "scheduled_backups",
        "name": "Scheduled Backups",
        "description": "Automatic scheduled backups of your data",
    },
    {
        "key": "advanced_analytics",
        "name": "Advanced Analytics",
        "description": "Detailed analytics and insights",
    },
]


async def seed_database():
    """Seed the database with initial data."""
    engine = create_async_engine(settings.DATABASE_URL, echo=True)

    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Create features
        feature_map = {}
        for feature_data in FEATURES:
            feature = Feature(
                id=uuid.uuid4(),
                key=feature_data["key"],
                name=feature_data["name"],
                description=feature_data["description"],
            )
            session.add(feature)
            feature_map[feature_data["key"]] = feature

        await session.flush()

        # Create tiers
        for tier_data in TIERS:
            tier = Tier(
                id=uuid.uuid4(),
                name=tier_data["name"],
                display_name=tier_data["display_name"],
                price_monthly=tier_data["price_monthly"],
                features=tier_data["features"],
            )
            session.add(tier)
            await session.flush()

            # Create tier-feature mappings
            for feature_key, value in tier_data["features"].items():
                if feature_key in feature_map:
                    enabled = value if isinstance(value, bool) else True
                    limit = value if isinstance(value, int) and not isinstance(value, bool) else None

                    tier_feature = TierFeature(
                        id=uuid.uuid4(),
                        tier_id=tier.id,
                        feature_id=feature_map[feature_key].id,
                        enabled=enabled,
                        limit_value=limit if limit != -1 else None,  # -1 means unlimited
                    )
                    session.add(tier_feature)

        await session.commit()
        print("Database seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())
