"""
Service layer for backup operations.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from dateutil import parser as date_parser

from app.models.backup import Backup
from app.models.grocery import Grocery, ShoppingList, ShoppingListItem
from app.models.pantry import PantryItem
from app.models.recipe import Recipe, RecipeIngredient, RecipeNutrition, CookingHistory, RecipeCollection
from app.models.meal_plan import MealPlan, Meal
from app.models.kitchen_equipment import KitchenEquipment
from app.models.restaurant import Restaurant, RestaurantMeal
from app.models.nutrition import NutritionLog, NutritionGoal, HealthMetric
from app.models.learning import UserSkill
from app.api.v1.routes.backups.schemas import BackupCreate, ModuleType


# Mapping of module types to their models
MODULE_MODELS = {
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

# Fields to exclude from backup (internal fields)
EXCLUDED_FIELDS = {'id', 'user_id', 'created_at', 'updated_at', 'deleted_at'}

# Related models that need special handling during backup/restore
# Format: {model: [{related_model, foreign_key, related_field_name}]}
RELATED_MODELS = {
    "shopping_lists": [
        {"model": ShoppingListItem, "fk": "shopping_list_id", "field": "items"}
    ],
    "recipes": [
        {"model": RecipeIngredient, "fk": "recipe_id", "field": "ingredients"},
        {"model": RecipeNutrition, "fk": "recipe_id", "field": "nutrition", "single": True},
    ],
    "meal_plans": [
        {"model": Meal, "fk": "meal_plan_id", "field": "meals"}
    ],
}


def model_to_dict(obj: Any, exclude_fields: set = None) -> Dict[str, Any]:
    """
    Convert SQLAlchemy model instance to dictionary.
    Excludes internal fields.
    """
    if exclude_fields is None:
        exclude_fields = EXCLUDED_FIELDS

    data = {}
    for column in obj.__table__.columns:
        if column.name in exclude_fields:
            continue
        value = getattr(obj, column.name)
        # Convert datetime objects to ISO format strings
        if isinstance(value, datetime):
            data[column.name] = value.isoformat()
        # Convert date objects to ISO format strings
        elif isinstance(value, date):
            data[column.name] = value.isoformat()
        # Convert Decimal to float for JSON serialization
        elif isinstance(value, Decimal):
            data[column.name] = float(value)
        # Convert UUID to string for JSON serialization
        elif isinstance(value, UUID):
            data[column.name] = str(value)
        else:
            data[column.name] = value
    return data


def dict_to_model_data(model: Any, item_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert dictionary to model data, parsing date/datetime strings back to proper objects.
    """
    converted_data = {}

    for column in model.__table__.columns:
        if column.name not in item_data:
            continue

        value = item_data[column.name]

        if value is None:
            converted_data[column.name] = None
            continue

        # Parse date strings back to date objects
        if isinstance(column.type, Date) and isinstance(value, str):
            try:
                parsed = date_parser.parse(value)
                if type(column.type).__name__ == 'Date':
                    converted_data[column.name] = parsed.date()
                else:
                    converted_data[column.name] = parsed
            except (ValueError, TypeError):
                converted_data[column.name] = value
        # Parse datetime strings back to datetime objects
        elif isinstance(column.type, DateTime) and isinstance(value, str):
            try:
                converted_data[column.name] = date_parser.parse(value)
            except (ValueError, TypeError):
                converted_data[column.name] = value
        # Parse UUID strings back to UUID objects
        elif isinstance(column.type, PG_UUID) and isinstance(value, str):
            try:
                converted_data[column.name] = UUID(value)
            except (ValueError, TypeError):
                converted_data[column.name] = value
        else:
            converted_data[column.name] = value

    return converted_data


async def create_backup(
    db: AsyncSession,
    user_id: UUID,
    backup_data: BackupCreate
) -> Backup:
    """
    Create a backup of all items from a specific module for the user.
    """
    module_type = backup_data.module_type
    model = MODULE_MODELS.get(module_type)

    if not model:
        raise ValueError(f"Invalid module type: {module_type}")

    # Query all items for this module and user
    query = select(model).where(model.user_id == user_id)

    # Exclude soft-deleted items if the model supports soft deletes
    if hasattr(model, 'deleted_at'):
        query = query.where(model.deleted_at.is_(None))

    # Exclude archived items if applicable
    if hasattr(model, 'is_archived'):
        query = query.where(model.is_archived == False)

    result = await db.execute(query)
    items = result.scalars().all()

    # Convert items to dictionaries with related data
    items_data = []
    for item in items:
        item_dict = model_to_dict(item)

        # Handle related models
        if module_type in RELATED_MODELS:
            for related_info in RELATED_MODELS[module_type]:
                related_model = related_info["model"]
                fk_field = related_info["fk"]
                field_name = related_info["field"]
                is_single = related_info.get("single", False)

                # Query related items
                related_query = select(related_model).where(
                    getattr(related_model, fk_field) == item.id
                )
                related_result = await db.execute(related_query)

                if is_single:
                    related_item = related_result.scalar_one_or_none()
                    if related_item:
                        # Exclude the foreign key from related item
                        related_exclude = EXCLUDED_FIELDS | {fk_field}
                        item_dict[field_name] = model_to_dict(related_item, related_exclude)
                    else:
                        item_dict[field_name] = None
                else:
                    related_items = related_result.scalars().all()
                    # Exclude the foreign key from related items
                    related_exclude = EXCLUDED_FIELDS | {fk_field}
                    item_dict[field_name] = [
                        model_to_dict(ri, related_exclude) for ri in related_items
                    ]

        items_data.append(item_dict)

    # Create backup
    backup = Backup(
        user_id=user_id,
        module_type=module_type,
        backup_data=items_data
    )

    db.add(backup)
    await db.commit()
    await db.refresh(backup)

    return backup


async def get_user_backups(
    db: AsyncSession,
    user_id: UUID
) -> List[Backup]:
    """
    Get all backups for a user.
    """
    result = await db.execute(
        select(Backup)
        .where(and_(
            Backup.user_id == user_id,
            Backup.deleted_at.is_(None)
        ))
        .order_by(Backup.created_at.desc())
    )
    return list(result.scalars().all())


async def restore_backup(
    db: AsyncSession,
    user_id: UUID,
    backup_id: UUID
) -> int:
    """
    Restore a backup by replacing all existing items with the backup data.
    This will DELETE all current items and restore from the backup.
    """
    # Get the backup
    result = await db.execute(
        select(Backup).where(and_(
            Backup.id == backup_id,
            Backup.user_id == user_id,
            Backup.deleted_at.is_(None)
        ))
    )
    backup = result.scalar_one_or_none()

    if not backup:
        raise ValueError("Backup not found")

    module_type = backup.module_type
    model = MODULE_MODELS.get(module_type)

    if not model:
        raise ValueError(f"Invalid module type: {module_type}")

    # Delete all existing items for this module and user
    delete_query = select(model).where(model.user_id == user_id)

    # Only delete non-archived, non-deleted items
    if hasattr(model, 'is_archived'):
        delete_query = delete_query.where(model.is_archived == False)

    existing_items_result = await db.execute(delete_query)
    existing_items = existing_items_result.scalars().all()

    # Delete all existing items (this will cascade to related items via FK)
    for item in existing_items:
        await db.delete(item)

    await db.flush()

    # Create new items from backup data
    restored_count = 0
    for item_data in backup.backup_data:
        # Extract related data before converting
        related_data = {}
        if module_type in RELATED_MODELS:
            for related_info in RELATED_MODELS[module_type]:
                field_name = related_info["field"]
                if field_name in item_data:
                    related_data[field_name] = item_data.pop(field_name)

        # Convert data types from JSON to proper Python objects
        converted_data = dict_to_model_data(model, item_data)

        # Create new instance with user_id
        new_item = model(
            user_id=user_id,
            **converted_data
        )
        db.add(new_item)
        await db.flush()  # Get the new item's ID

        # Restore related items
        if module_type in RELATED_MODELS:
            for related_info in RELATED_MODELS[module_type]:
                related_model = related_info["model"]
                fk_field = related_info["fk"]
                field_name = related_info["field"]
                is_single = related_info.get("single", False)

                if field_name in related_data and related_data[field_name]:
                    if is_single:
                        # Single related item (e.g., nutrition)
                        related_item_data = related_data[field_name]
                        converted_related = dict_to_model_data(related_model, related_item_data)
                        converted_related[fk_field] = new_item.id
                        related_item = related_model(**converted_related)
                        db.add(related_item)
                    else:
                        # Multiple related items (e.g., ingredients, meals)
                        for related_item_data in related_data[field_name]:
                            converted_related = dict_to_model_data(related_model, related_item_data)
                            converted_related[fk_field] = new_item.id
                            related_item = related_model(**converted_related)
                            db.add(related_item)

        restored_count += 1

    await db.commit()

    return restored_count


async def delete_backup(
    db: AsyncSession,
    user_id: UUID,
    backup_id: UUID
) -> bool:
    """
    Soft delete a backup.
    """
    result = await db.execute(
        select(Backup).where(and_(
            Backup.id == backup_id,
            Backup.user_id == user_id,
            Backup.deleted_at.is_(None)
        ))
    )
    backup = result.scalar_one_or_none()

    if not backup:
        raise ValueError("Backup not found")

    # Soft delete
    backup.deleted_at = datetime.utcnow()
    await db.commit()

    return True
