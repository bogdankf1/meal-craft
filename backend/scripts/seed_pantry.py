"""Seed script to populate the pantry with sample items."""

import asyncio
import sys
import uuid
from pathlib import Path
from datetime import date, timedelta

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.pantry import PantryItem
from app.models.user import User


# Sample pantry items - including items that will be "low stock"
PANTRY_ITEMS = [
    # Fresh produce (some in peak season for December)
    {
        "item_name": "Apples",
        "quantity": 5,
        "unit": "pieces",
        "category": "produce",
        "storage_location": "fridge",
        "expiry_date": date.today() + timedelta(days=14),
        "minimum_quantity": 3,
    },
    {
        "item_name": "Oranges",
        "quantity": 8,
        "unit": "pieces",
        "category": "produce",
        "storage_location": "fridge",
        "expiry_date": date.today() + timedelta(days=10),
        "minimum_quantity": 4,
    },
    {
        "item_name": "Carrots",
        "quantity": 6,
        "unit": "pieces",
        "category": "produce",
        "storage_location": "fridge",
        "expiry_date": date.today() + timedelta(days=21),
        "minimum_quantity": 5,
    },
    {
        "item_name": "Spinach",
        "quantity": 1,
        "unit": "bag",
        "category": "produce",
        "storage_location": "fridge",
        "expiry_date": date.today() + timedelta(days=5),
        "minimum_quantity": 2,  # LOW STOCK
    },
    {
        "item_name": "Potatoes",
        "quantity": 3,
        "unit": "lbs",
        "category": "produce",
        "storage_location": "pantry",
        "expiry_date": date.today() + timedelta(days=30),
        "minimum_quantity": 5,  # LOW STOCK
    },
    # Dairy
    {
        "item_name": "Milk",
        "quantity": 0.5,
        "unit": "gallon",
        "category": "dairy",
        "storage_location": "fridge",
        "expiry_date": date.today() + timedelta(days=7),
        "minimum_quantity": 1,  # LOW STOCK
    },
    {
        "item_name": "Eggs",
        "quantity": 6,
        "unit": "pieces",
        "category": "dairy",
        "storage_location": "fridge",
        "expiry_date": date.today() + timedelta(days=14),
        "minimum_quantity": 12,  # LOW STOCK
    },
    {
        "item_name": "Butter",
        "quantity": 2,
        "unit": "sticks",
        "category": "dairy",
        "storage_location": "fridge",
        "expiry_date": date.today() + timedelta(days=30),
        "minimum_quantity": 2,
    },
    {
        "item_name": "Cheddar Cheese",
        "quantity": 1,
        "unit": "block",
        "category": "dairy",
        "storage_location": "fridge",
        "expiry_date": date.today() + timedelta(days=21),
        "minimum_quantity": 1,
    },
    # Pantry staples
    {
        "item_name": "All-Purpose Flour",
        "quantity": 1,
        "unit": "lb",
        "category": "baking",
        "storage_location": "pantry",
        "expiry_date": date.today() + timedelta(days=180),
        "minimum_quantity": 3,  # LOW STOCK
    },
    {
        "item_name": "Sugar",
        "quantity": 2,
        "unit": "lbs",
        "category": "baking",
        "storage_location": "pantry",
        "expiry_date": None,
        "minimum_quantity": 2,
    },
    {
        "item_name": "Brown Rice",
        "quantity": 3,
        "unit": "lbs",
        "category": "grains",
        "storage_location": "pantry",
        "expiry_date": date.today() + timedelta(days=365),
        "minimum_quantity": 2,
    },
    {
        "item_name": "Olive Oil",
        "quantity": 1,
        "unit": "bottle",
        "category": "oils",
        "storage_location": "pantry",
        "expiry_date": date.today() + timedelta(days=180),
        "minimum_quantity": 1,
    },
    {
        "item_name": "Pasta",
        "quantity": 1,
        "unit": "box",
        "category": "pasta",
        "storage_location": "pantry",
        "expiry_date": date.today() + timedelta(days=365),
        "minimum_quantity": 3,  # LOW STOCK
    },
    # Spices
    {
        "item_name": "Salt",
        "quantity": 1,
        "unit": "container",
        "category": "spices",
        "storage_location": "spice_rack",
        "expiry_date": None,
        "minimum_quantity": 1,
    },
    {
        "item_name": "Black Pepper",
        "quantity": 0.5,
        "unit": "container",
        "category": "spices",
        "storage_location": "spice_rack",
        "expiry_date": date.today() + timedelta(days=365),
        "minimum_quantity": 1,  # LOW STOCK
    },
    {
        "item_name": "Garlic Powder",
        "quantity": 1,
        "unit": "jar",
        "category": "spices",
        "storage_location": "spice_rack",
        "expiry_date": date.today() + timedelta(days=180),
        "minimum_quantity": 1,
    },
    # Meat
    {
        "item_name": "Chicken Breast",
        "quantity": 2,
        "unit": "lbs",
        "category": "meat",
        "storage_location": "freezer",
        "expiry_date": date.today() + timedelta(days=90),
        "minimum_quantity": 2,
    },
    {
        "item_name": "Ground Beef",
        "quantity": 1,
        "unit": "lb",
        "category": "meat",
        "storage_location": "freezer",
        "expiry_date": date.today() + timedelta(days=90),
        "minimum_quantity": 2,  # LOW STOCK
    },
    # Canned goods
    {
        "item_name": "Canned Tomatoes",
        "quantity": 3,
        "unit": "cans",
        "category": "canned",
        "storage_location": "pantry",
        "expiry_date": date.today() + timedelta(days=730),
        "minimum_quantity": 3,
    },
    {
        "item_name": "Black Beans",
        "quantity": 2,
        "unit": "cans",
        "category": "canned",
        "storage_location": "pantry",
        "expiry_date": date.today() + timedelta(days=730),
        "minimum_quantity": 3,  # LOW STOCK
    },
]


async def seed_pantry():
    """Seed the pantry with sample items."""
    async with async_session_maker() as session:
        # Get the first user
        result = await session.execute(select(User).limit(1))
        user = result.scalar_one_or_none()

        if not user:
            print("No users found. Please create a user first.")
            return

        print(f"Adding pantry items for user: {user.email}")

        # Add pantry items (always add new ones for demo)
        for item_data in PANTRY_ITEMS:
            pantry_item = PantryItem(
                id=uuid.uuid4(),
                user_id=user.id,
                **item_data
            )
            session.add(pantry_item)

        await session.commit()
        print(f"Added {len(PANTRY_ITEMS)} pantry items successfully!")

        # Count low stock items
        low_stock_count = sum(
            1 for item in PANTRY_ITEMS
            if item.get("minimum_quantity") and item["quantity"] < item["minimum_quantity"]
        )
        print(f"Of these, {low_stock_count} items are low stock (quantity < minimum)")


if __name__ == "__main__":
    asyncio.run(seed_pantry())
