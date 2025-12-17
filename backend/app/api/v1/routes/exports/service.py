"""
Export service for generating data exports
"""
import csv
import io
from datetime import datetime, date
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID
from decimal import Decimal

from app.models.grocery import Grocery, ShoppingList, ShoppingListItem
from app.models.pantry import PantryItem
from app.models.recipe import Recipe, RecipeIngredient, CookingHistory, RecipeCollection
from app.models.meal_plan import MealPlan, Meal
from app.models.kitchen_equipment import KitchenEquipment
from app.models.restaurant import Restaurant, RestaurantMeal
from app.models.nutrition import NutritionLog, NutritionGoal, HealthMetric
from app.models.learning import UserSkill, Skill
from app.api.v1.routes.exports.schemas import EntryType


# Field mappings for CSV export - (field_name, header_name)
FIELD_MAPPINGS = {
    "groceries": [
        ("item_name", "Item Name"),
        ("quantity", "Quantity"),
        ("unit", "Unit"),
        ("category", "Category"),
        ("purchase_date", "Purchase Date"),
        ("expiry_date", "Expiry Date"),
        ("cost", "Cost"),
        ("store", "Store"),
        ("is_wasted", "Wasted"),
        ("waste_reason", "Waste Reason"),
        ("is_archived", "Archived"),
    ],
    "pantry": [
        ("item_name", "Item Name"),
        ("quantity", "Quantity"),
        ("unit", "Unit"),
        ("category", "Category"),
        ("storage_location", "Storage Location"),
        ("expiry_date", "Expiry Date"),
        ("opened_date", "Opened Date"),
        ("minimum_quantity", "Minimum Quantity"),
        ("notes", "Notes"),
        ("is_wasted", "Wasted"),
        ("waste_reason", "Waste Reason"),
        ("is_archived", "Archived"),
    ],
    "shopping_lists": [
        ("name", "List Name"),
        ("status", "Status"),
        ("estimated_cost", "Estimated Cost"),
        ("completed_at", "Completed At"),
        ("is_archived", "Archived"),
        ("created_at", "Created At"),
    ],
    "recipes": [
        ("name", "Name"),
        ("description", "Description"),
        ("category", "Category"),
        ("cuisine_type", "Cuisine"),
        ("difficulty", "Difficulty"),
        ("prep_time", "Prep Time (min)"),
        ("cook_time", "Cook Time (min)"),
        ("servings", "Servings"),
        ("is_favorite", "Favorite"),
        ("rating", "Rating"),
        ("times_cooked", "Times Cooked"),
        ("source", "Source"),
        ("is_archived", "Archived"),
    ],
    "meal_plans": [
        ("name", "Name"),
        ("date_start", "Start Date"),
        ("date_end", "End Date"),
        ("servings", "Servings"),
        ("is_template", "Is Template"),
        ("is_archived", "Archived"),
    ],
    "kitchen_equipment": [
        ("name", "Name"),
        ("category", "Category"),
        ("brand", "Brand"),
        ("model", "Model"),
        ("condition", "Condition"),
        ("location", "Location"),
        ("purchase_date", "Purchase Date"),
        ("purchase_price", "Purchase Price"),
        ("last_maintenance_date", "Last Maintenance"),
        ("maintenance_interval_days", "Maintenance Interval (days)"),
        ("notes", "Notes"),
        ("is_archived", "Archived"),
    ],
    "restaurants": [
        ("name", "Name"),
        ("cuisine_type", "Cuisine Type"),
        ("location", "Location"),
        ("is_favorite", "Favorite"),
        ("notes", "Notes"),
        ("is_archived", "Archived"),
    ],
    "restaurant_meals": [
        ("restaurant_name", "Restaurant"),
        ("meal_date", "Date"),
        ("meal_type", "Meal Type"),
        ("order_type", "Order Type"),
        ("description", "Description"),
        ("estimated_calories", "Calories"),
        ("estimated_protein_g", "Protein (g)"),
        ("estimated_carbs_g", "Carbs (g)"),
        ("estimated_fat_g", "Fat (g)"),
        ("rating", "Rating"),
        ("feeling_after", "Feeling After"),
        ("notes", "Notes"),
        ("is_archived", "Archived"),
    ],
    "nutrition_logs": [
        ("date", "Date"),
        ("meal_type", "Meal Type"),
        ("name", "Item Name"),
        ("calories", "Calories"),
        ("protein_g", "Protein (g)"),
        ("carbs_g", "Carbs (g)"),
        ("fat_g", "Fat (g)"),
        ("fiber_g", "Fiber (g)"),
        ("sugar_g", "Sugar (g)"),
        ("sodium_mg", "Sodium (mg)"),
        ("manual_entry", "Manual Entry"),
        ("notes", "Notes"),
    ],
    "nutrition_goals": [
        ("goal_type", "Goal Type"),
        ("daily_calories", "Daily Calories"),
        ("daily_protein_g", "Daily Protein (g)"),
        ("daily_carbs_g", "Daily Carbs (g)"),
        ("daily_fat_g", "Daily Fat (g)"),
        ("daily_fiber_g", "Daily Fiber (g)"),
        ("daily_sugar_g", "Daily Sugar (g)"),
        ("daily_sodium_mg", "Daily Sodium (mg)"),
        ("start_date", "Start Date"),
        ("is_active", "Active"),
    ],
    "health_metrics": [
        ("date", "Date"),
        ("weight_kg", "Weight (kg)"),
        ("body_fat_percent", "Body Fat %"),
        ("steps", "Steps"),
        ("active_calories", "Active Calories"),
        ("sleep_hours", "Sleep Hours"),
        ("heart_rate_avg", "Avg Heart Rate"),
        ("source", "Source"),
    ],
    "user_skills": [
        ("skill_name", "Skill Name"),
        ("skill_category", "Category"),
        ("skill_difficulty", "Difficulty"),
        ("proficiency_level", "Proficiency Level"),
        ("status", "Status"),
        ("progress_percent", "Progress %"),
        ("times_practiced", "Times Practiced"),
        ("total_practice_minutes", "Total Practice (min)"),
        ("is_favorite", "Favorite"),
        ("started_at", "Started At"),
        ("last_practiced_at", "Last Practiced"),
        ("mastered_at", "Mastered At"),
    ],
    "cooking_history": [
        ("recipe_name", "Recipe"),
        ("cooked_at", "Cooked At"),
        ("servings_made", "Servings Made"),
        ("rating", "Rating"),
        ("notes", "Notes"),
    ],
    "recipe_collections": [
        ("name", "Name"),
        ("description", "Description"),
        ("color", "Color"),
        ("recipe_count", "Recipe Count"),
        ("is_archived", "Archived"),
        ("created_at", "Created At"),
    ],
}

MODEL_MAPPINGS = {
    "groceries": Grocery,
    "pantry": PantryItem,
    "shopping_lists": ShoppingList,
    "recipes": Recipe,
    "meal_plans": MealPlan,
    "kitchen_equipment": KitchenEquipment,
    "restaurants": Restaurant,
    "restaurant_meals": RestaurantMeal,
    "nutrition_logs": NutritionLog,
    "nutrition_goals": NutritionGoal,
    "health_metrics": HealthMetric,
    "user_skills": UserSkill,
    "cooking_history": CookingHistory,
    "recipe_collections": RecipeCollection,
}

# Entry types that support date filtering
DATE_FILTERABLE_TYPES = {
    "groceries",        # purchase_date
    "restaurant_meals", # meal_date
    "nutrition_logs",   # date
    "health_metrics",   # date
    "cooking_history",  # cooked_at
    "meal_plans",       # date_start
}


def format_value(value: Any) -> str:
    """Format a value for CSV export"""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (datetime, date)):
        if isinstance(value, datetime):
            return value.strftime('%Y-%m-%d %H:%M')
        return value.strftime('%Y-%m-%d')
    if isinstance(value, Decimal):
        return str(float(value))
    if isinstance(value, list):
        return ", ".join(str(v) for v in value)
    return str(value)


async def fetch_data_for_export(
    db: AsyncSession,
    user_id: UUID,
    entry_type: EntryType,
    start_date: datetime | None,
    end_date: datetime | None
) -> List[Dict[str, Any]]:
    """
    Fetch data for export based on entry type and date range.
    """
    model = MODEL_MAPPINGS[entry_type]

    # Convert timezone-aware datetimes to naive datetimes for database comparison
    if start_date and start_date.tzinfo:
        start_date = start_date.replace(tzinfo=None)
    if end_date and end_date.tzinfo:
        end_date = end_date.replace(tzinfo=None)

    # Build base query - filter by user_id
    conditions = [model.user_id == user_id]

    # Only filter by is_archived if the model has this field (exclude archived by default)
    # Note: We include archived items in export for completeness

    query = select(model).where(and_(*conditions))

    # Apply date filtering if date range is provided and entry type supports it
    if start_date and end_date and entry_type in DATE_FILTERABLE_TYPES:
        date_field = None
        if entry_type == "groceries":
            date_field = model.purchase_date
        elif entry_type == "restaurant_meals":
            date_field = model.meal_date
        elif entry_type == "nutrition_logs":
            date_field = model.date
        elif entry_type == "health_metrics":
            date_field = model.date
        elif entry_type == "cooking_history":
            date_field = model.cooked_at
        elif entry_type == "meal_plans":
            date_field = model.date_start

        if date_field is not None:
            # For date fields (not datetime), convert datetime to date
            start_date_value = start_date.date() if isinstance(start_date, datetime) else start_date
            end_date_value = end_date.date() if isinstance(end_date, datetime) else end_date

            query = query.where(
                and_(
                    date_field >= start_date_value,
                    date_field <= end_date_value
                )
            )

    result = await db.execute(query)
    records = result.scalars().all()

    # Convert to dictionaries with special handling for joined data
    data = []
    for record in records:
        record_dict = {}

        # Special handling for user_skills - need to join with skill data
        if entry_type == "user_skills":
            # Fetch skill data separately
            skill_result = await db.execute(select(Skill).where(Skill.id == record.skill_id))
            skill = skill_result.scalar_one_or_none()

            record_dict["skill_name"] = skill.name if skill else ""
            record_dict["skill_category"] = skill.category if skill else ""
            record_dict["skill_difficulty"] = skill.difficulty if skill else ""
            record_dict["proficiency_level"] = record.proficiency_level
            record_dict["status"] = record.status
            record_dict["progress_percent"] = record.progress_percent
            record_dict["times_practiced"] = record.times_practiced
            record_dict["total_practice_minutes"] = record.total_practice_minutes
            record_dict["is_favorite"] = record.is_favorite
            record_dict["started_at"] = record.started_at
            record_dict["last_practiced_at"] = record.last_practiced_at
            record_dict["mastered_at"] = record.mastered_at

        # Special handling for cooking_history - need recipe name
        elif entry_type == "cooking_history":
            recipe_result = await db.execute(select(Recipe).where(Recipe.id == record.recipe_id))
            recipe = recipe_result.scalar_one_or_none()

            record_dict["recipe_name"] = recipe.name if recipe else ""
            record_dict["cooked_at"] = record.cooked_at
            record_dict["servings_made"] = record.servings_made
            record_dict["rating"] = record.rating
            record_dict["notes"] = record.notes

        # Special handling for recipe_collections - need recipe count
        elif entry_type == "recipe_collections":
            record_dict["name"] = record.name
            record_dict["description"] = record.description
            record_dict["color"] = record.color
            record_dict["recipe_count"] = len(record.recipes) if record.recipes else 0
            record_dict["is_archived"] = record.is_archived
            record_dict["created_at"] = record.created_at

        else:
            # Standard field mapping
            for field, _ in FIELD_MAPPINGS[entry_type]:
                value = getattr(record, field, None)
                record_dict[field] = value

        data.append(record_dict)

    return data


def generate_csv(data: List[Dict[str, Any]], entry_type: EntryType) -> str:
    """Generate CSV string from data"""
    output = io.StringIO()
    writer = csv.writer(output)

    # Write headers
    headers = [header for _, header in FIELD_MAPPINGS[entry_type]]
    writer.writerow(headers)

    if not data:
        return output.getvalue()

    # Write data
    for row in data:
        formatted_row = []
        for field, _ in FIELD_MAPPINGS[entry_type]:
            value = row.get(field)
            formatted_row.append(format_value(value))
        writer.writerow(formatted_row)

    return output.getvalue()


async def export_data(
    db: AsyncSession,
    user_id: UUID,
    entry_type: EntryType,
    format: str,
    start_date: datetime | None = None,
    end_date: datetime | None = None
) -> tuple[str, int]:
    """
    Export data in specified format
    Returns: (exported_content, row_count)
    """
    # Fetch data
    data = await fetch_data_for_export(db, user_id, entry_type, start_date, end_date)

    # Generate export based on format
    if format == "csv":
        content = generate_csv(data, entry_type)
    else:
        raise ValueError(f"Unsupported export format: {format}")

    return content, len(data)
