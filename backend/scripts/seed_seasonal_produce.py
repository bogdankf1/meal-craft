"""Seed script to populate seasonal produce data for US."""

import asyncio
import sys
import uuid
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.seasonality import SeasonalProduce


# Sample seasonal produce for US - focusing on items in season in December
SEASONAL_PRODUCE = [
    # Winter produce (peak in December/January/February)
    {
        "name": "Apples",
        "name_local": None,
        "description": "Crisp and versatile fruit, great for eating fresh, baking, or making cider.",
        "category": "fruits",
        "country_code": "US",
        "region": None,
        "available_months": [9, 10, 11, 12, 1, 2, 3],
        "peak_months": [10, 11, 12],
        "storage_tips": "Store in refrigerator for up to 3 months.",
        "nutrition_highlights": "High in fiber, vitamin C, and antioxidants.",
        "culinary_uses": "Fresh eating, pies, sauces, cider, salads",
    },
    {
        "name": "Oranges",
        "name_local": None,
        "description": "Sweet and juicy citrus fruit, perfect for fresh eating or juicing.",
        "category": "fruits",
        "country_code": "US",
        "region": "California, Florida",
        "available_months": [11, 12, 1, 2, 3, 4],
        "peak_months": [12, 1, 2],
        "storage_tips": "Store at room temperature for a week or refrigerate for up to 2 weeks.",
        "nutrition_highlights": "Excellent source of vitamin C, folate, and potassium.",
        "culinary_uses": "Fresh eating, juicing, salads, desserts, marinades",
    },
    {
        "name": "Potatoes",
        "name_local": None,
        "description": "Versatile root vegetable, staple in many cuisines worldwide.",
        "category": "vegetables",
        "country_code": "US",
        "region": None,
        "available_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        "peak_months": [9, 10, 11, 12, 1],
        "storage_tips": "Store in cool, dark place. Do not refrigerate.",
        "nutrition_highlights": "Good source of potassium, vitamin C, and fiber.",
        "culinary_uses": "Baking, mashing, roasting, frying, soups",
    },
    {
        "name": "Carrots",
        "name_local": None,
        "description": "Sweet and crunchy root vegetable, versatile in cooking.",
        "category": "vegetables",
        "country_code": "US",
        "region": None,
        "available_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        "peak_months": [10, 11, 12, 1, 2, 3],
        "storage_tips": "Store in refrigerator for up to 4 weeks.",
        "nutrition_highlights": "High in beta-carotene, vitamin K, and fiber.",
        "culinary_uses": "Raw, roasted, steamed, soups, stews, juicing",
    },
    {
        "name": "Spinach",
        "name_local": None,
        "description": "Nutrient-dense leafy green, versatile in cooking and salads.",
        "category": "vegetables",
        "country_code": "US",
        "region": None,
        "available_months": [3, 4, 5, 9, 10, 11],
        "peak_months": [4, 5, 10, 11],
        "storage_tips": "Store in refrigerator for up to a week.",
        "nutrition_highlights": "Excellent source of iron, vitamin K, and folate.",
        "culinary_uses": "Salads, sautéed, smoothies, soups, pasta",
    },
    {
        "name": "Butternut Squash",
        "name_local": None,
        "description": "Sweet, nutty winter squash perfect for roasting and soups.",
        "category": "vegetables",
        "country_code": "US",
        "region": None,
        "available_months": [9, 10, 11, 12, 1, 2],
        "peak_months": [10, 11, 12],
        "storage_tips": "Store in cool, dry place for up to 3 months.",
        "nutrition_highlights": "High in vitamin A, vitamin C, and fiber.",
        "culinary_uses": "Roasted, soups, risotto, pasta, gratins",
    },
    {
        "name": "Pears",
        "name_local": None,
        "description": "Sweet and juicy fruit, excellent for fresh eating or baking.",
        "category": "fruits",
        "country_code": "US",
        "region": "Washington, Oregon, California",
        "available_months": [8, 9, 10, 11, 12, 1, 2],
        "peak_months": [9, 10, 11, 12],
        "storage_tips": "Ripen at room temperature, then refrigerate.",
        "nutrition_highlights": "Good source of fiber, vitamin C, and copper.",
        "culinary_uses": "Fresh eating, poached, baked, salads, cheese pairings",
    },
    {
        "name": "Pomegranates",
        "name_local": None,
        "description": "Jewel-like seeds with sweet-tart flavor, great for salads and garnishes.",
        "category": "fruits",
        "country_code": "US",
        "region": "California",
        "available_months": [9, 10, 11, 12, 1],
        "peak_months": [10, 11, 12],
        "storage_tips": "Store whole in refrigerator for up to 2 months.",
        "nutrition_highlights": "High in antioxidants, vitamin C, and potassium.",
        "culinary_uses": "Fresh, salads, juicing, desserts, cocktails",
    },
    {
        "name": "Brussels Sprouts",
        "name_local": None,
        "description": "Mini cabbages with earthy, slightly sweet flavor when roasted.",
        "category": "vegetables",
        "country_code": "US",
        "region": None,
        "available_months": [9, 10, 11, 12, 1, 2, 3],
        "peak_months": [10, 11, 12, 1],
        "storage_tips": "Store in refrigerator for up to 2 weeks.",
        "nutrition_highlights": "High in vitamin K, vitamin C, and fiber.",
        "culinary_uses": "Roasted, sautéed, shaved raw, gratins",
    },
    {
        "name": "Sweet Potatoes",
        "name_local": None,
        "description": "Sweet and nutritious root vegetable, versatile in cooking.",
        "category": "vegetables",
        "country_code": "US",
        "region": "North Carolina, Louisiana, California",
        "available_months": [9, 10, 11, 12, 1, 2, 3],
        "peak_months": [10, 11, 12],
        "storage_tips": "Store in cool, dark place. Do not refrigerate.",
        "nutrition_highlights": "Excellent source of vitamin A, fiber, and potassium.",
        "culinary_uses": "Baked, mashed, roasted, fries, casseroles, pies",
    },
    {
        "name": "Cranberries",
        "name_local": None,
        "description": "Tart berries essential for holiday sauces and baking.",
        "category": "fruits",
        "country_code": "US",
        "region": "Massachusetts, Wisconsin, New Jersey",
        "available_months": [10, 11, 12],
        "peak_months": [11, 12],
        "storage_tips": "Refrigerate for up to 2 months or freeze for longer storage.",
        "nutrition_highlights": "High in vitamin C and antioxidants.",
        "culinary_uses": "Sauces, baking, juicing, dried for snacking",
    },
    {
        "name": "Persimmons",
        "name_local": None,
        "description": "Sweet, honey-like fruit when ripe. Popular in fall desserts.",
        "category": "fruits",
        "country_code": "US",
        "region": "California",
        "available_months": [10, 11, 12, 1],
        "peak_months": [11, 12],
        "storage_tips": "Ripen at room temperature, then refrigerate.",
        "nutrition_highlights": "High in vitamin A, vitamin C, and fiber.",
        "culinary_uses": "Fresh eating, baking, salads, puddings",
    },
]


async def seed_seasonal_produce():
    """Seed seasonal produce data."""
    async with async_session_maker() as session:
        # Check if data already exists
        result = await session.execute(
            select(SeasonalProduce).where(SeasonalProduce.country_code == "US").limit(1)
        )
        if result.scalar_one_or_none():
            print("Seasonal produce for US already exists. Skipping seed.")
            return

        print("Adding seasonal produce for US...")

        for item_data in SEASONAL_PRODUCE:
            produce = SeasonalProduce(
                id=uuid.uuid4(),
                **item_data
            )
            session.add(produce)

        await session.commit()
        print(f"Added {len(SEASONAL_PRODUCE)} seasonal produce items successfully!")

        # Count items in peak season for December
        december_peak = sum(1 for item in SEASONAL_PRODUCE if 12 in (item.get("peak_months") or []))
        print(f"Of these, {december_peak} items are in peak season for December")


if __name__ == "__main__":
    asyncio.run(seed_seasonal_produce())
