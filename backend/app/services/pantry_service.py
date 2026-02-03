"""Pantry Service for managing inventory operations.

This service handles all pantry inventory operations including:
- Adding items to pantry
- Deducting items when cooking
- Checking recipe/meal availability
- Managing transaction history
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.pantry import PantryItem, PantryTransaction, PantryTransactionType
from app.models.recipe import Recipe, RecipeIngredient
from app.models.meal_plan import Meal
from app.utils.unit_conversion import (
    normalize_unit,
    convert_quantity,
    can_compare,
    get_unit_category,
    UnitCategory,
)
from app.utils.ingredient_matcher import (
    normalize_ingredient_name,
    find_pantry_match,
    find_all_pantry_matches,
    calculate_available_quantity,
    check_ingredient_availability,
)
from app.schemas.pantry import (
    IngredientDeductionResult,
    RecipeDeductionResult,
    IngredientAvailability,
    RecipeAvailability,
    MealAvailability,
    PantryTransactionResponse,
)


class PantryService:
    """Service for managing pantry inventory operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_pantry_items(
        self,
        user_id: UUID,
        include_archived: bool = False,
        include_wasted: bool = False,
    ) -> list[PantryItem]:
        """Get all pantry items for a user.

        Args:
            user_id: The user's ID
            include_archived: Include archived items
            include_wasted: Include wasted items

        Returns:
            List of pantry items
        """
        query = select(PantryItem).where(PantryItem.user_id == user_id)

        if not include_archived:
            query = query.where(PantryItem.is_archived == False)

        if not include_wasted:
            query = query.where(PantryItem.is_wasted == False)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def add_to_pantry(
        self,
        user_id: UUID,
        pantry_item_id: UUID,
        quantity: float,
        unit: Optional[str] = None,
        source_type: str = "manual",
        source_id: Optional[UUID] = None,
        notes: Optional[str] = None,
    ) -> PantryTransaction:
        """Add quantity to an existing pantry item.

        Creates a transaction record for the addition.

        Args:
            user_id: The user's ID
            pantry_item_id: The pantry item to add to
            quantity: Amount to add (positive)
            unit: Unit of the quantity (converted if different from item's unit)
            source_type: Source of addition ('grocery', 'manual', etc.)
            source_id: ID of the source (grocery ID, etc.)
            notes: Optional notes

        Returns:
            The created transaction record

        Raises:
            ValueError: If pantry item not found or units incompatible
        """
        # Get pantry item
        item = await self.db.get(PantryItem, pantry_item_id)
        if not item or item.user_id != user_id:
            raise ValueError(f"Pantry item {pantry_item_id} not found")

        # Convert quantity if units differ
        add_quantity = quantity
        if unit and item.unit and normalize_unit(unit) != normalize_unit(item.unit):
            if can_compare(unit, item.unit):
                converted = convert_quantity(quantity, unit, item.unit)
                if converted is not None:
                    add_quantity = converted
                else:
                    raise ValueError(f"Cannot convert {unit} to {item.unit}")
            else:
                raise ValueError(f"Incompatible units: {unit} and {item.unit}")

        # Update item quantity
        quantity_before = float(item.quantity or 0)
        quantity_after = quantity_before + add_quantity
        item.quantity = Decimal(str(quantity_after))
        item.updated_at = datetime.utcnow()

        # Create transaction
        transaction = PantryTransaction(
            user_id=user_id,
            pantry_item_id=pantry_item_id,
            transaction_type=PantryTransactionType.ADD.value,
            quantity_change=Decimal(str(add_quantity)),
            quantity_before=Decimal(str(quantity_before)),
            quantity_after=Decimal(str(quantity_after)),
            unit=item.unit,
            source_type=source_type,
            source_id=source_id,
            notes=notes,
            transaction_date=datetime.utcnow(),
        )
        self.db.add(transaction)

        await self.db.flush()
        return transaction

    async def deduct_from_pantry(
        self,
        user_id: UUID,
        pantry_item_id: UUID,
        quantity: float,
        unit: Optional[str] = None,
        source_type: str = "manual",
        source_id: Optional[UUID] = None,
        notes: Optional[str] = None,
        allow_negative: bool = False,
    ) -> PantryTransaction:
        """Deduct quantity from a pantry item.

        Args:
            user_id: The user's ID
            pantry_item_id: The pantry item to deduct from
            quantity: Amount to deduct (positive number)
            unit: Unit of the quantity (converted if different)
            source_type: Source of deduction ('meal', 'manual', etc.)
            source_id: ID of the source (meal ID, etc.)
            notes: Optional notes
            allow_negative: Allow quantity to go negative

        Returns:
            The created transaction record

        Raises:
            ValueError: If item not found, units incompatible, or insufficient stock
        """
        # Get pantry item
        item = await self.db.get(PantryItem, pantry_item_id)
        if not item or item.user_id != user_id:
            raise ValueError(f"Pantry item {pantry_item_id} not found")

        # Convert quantity if units differ
        deduct_quantity = quantity
        if unit and item.unit and normalize_unit(unit) != normalize_unit(item.unit):
            if can_compare(unit, item.unit):
                converted = convert_quantity(quantity, unit, item.unit)
                if converted is not None:
                    deduct_quantity = converted
                else:
                    raise ValueError(f"Cannot convert {unit} to {item.unit}")
            else:
                raise ValueError(f"Incompatible units: {unit} and {item.unit}")

        # Check sufficient stock
        quantity_before = float(item.quantity or 0)
        quantity_after = quantity_before - deduct_quantity

        if quantity_after < 0 and not allow_negative:
            # Deduct what's available
            deduct_quantity = quantity_before
            quantity_after = 0

        # Update item quantity
        item.quantity = Decimal(str(max(0, quantity_after)))
        item.updated_at = datetime.utcnow()

        # Create transaction
        transaction = PantryTransaction(
            user_id=user_id,
            pantry_item_id=pantry_item_id,
            transaction_type=PantryTransactionType.DEDUCT.value,
            quantity_change=Decimal(str(-deduct_quantity)),  # Negative for deduction
            quantity_before=Decimal(str(quantity_before)),
            quantity_after=Decimal(str(max(0, quantity_after))),
            unit=item.unit,
            source_type=source_type,
            source_id=source_id,
            notes=notes,
            transaction_date=datetime.utcnow(),
        )
        self.db.add(transaction)

        await self.db.flush()
        return transaction

    async def deduct_ingredient(
        self,
        user_id: UUID,
        ingredient_name: str,
        quantity: Optional[float],
        unit: Optional[str],
        pantry_items: list[PantryItem],
        source_type: str = "meal",
        source_id: Optional[UUID] = None,
    ) -> IngredientDeductionResult:
        """Deduct a single ingredient from pantry.

        Finds the best matching pantry item and deducts the needed quantity.

        Args:
            user_id: The user's ID
            ingredient_name: Name of the ingredient
            quantity: Amount needed
            unit: Unit of the amount
            pantry_items: List of pantry items to search
            source_type: Source of deduction
            source_id: ID of the source

        Returns:
            IngredientDeductionResult with deduction details
        """
        result = IngredientDeductionResult(
            ingredient_name=ingredient_name,
            needed_quantity=quantity or 0,
            needed_unit=unit,
            deducted_quantity=0,
            deducted_unit=unit,
            pantry_item_id=None,
            pantry_item_name=None,
            fully_satisfied=False,
            missing_quantity=quantity or 0,
            match_score=0.0,
        )

        # If no quantity needed, consider it satisfied
        if not quantity or quantity <= 0:
            result.fully_satisfied = True
            result.missing_quantity = 0
            return result

        # Find matching pantry item
        matches = find_all_pantry_matches(ingredient_name, pantry_items)
        if not matches:
            result.notes = "No matching pantry item found"
            return result

        best_item, match_score = matches[0]
        result.pantry_item_id = best_item.id
        result.pantry_item_name = best_item.item_name
        result.match_score = match_score

        # Calculate available quantity in needed unit
        available = calculate_available_quantity(best_item, unit)
        if available is None:
            # Units incompatible or no quantity in pantry
            result.notes = f"Cannot convert {best_item.unit} to {unit}"
            return result

        # Determine how much to deduct
        deduct_qty = min(quantity, available)
        result.deducted_quantity = deduct_qty
        result.deducted_unit = unit

        if deduct_qty >= quantity:
            result.fully_satisfied = True
            result.missing_quantity = 0
        else:
            result.missing_quantity = quantity - deduct_qty

        # Perform the deduction
        if deduct_qty > 0:
            try:
                await self.deduct_from_pantry(
                    user_id=user_id,
                    pantry_item_id=best_item.id,
                    quantity=deduct_qty,
                    unit=unit,
                    source_type=source_type,
                    source_id=source_id,
                    notes=f"Deducted for {ingredient_name}",
                )
            except ValueError as e:
                result.notes = str(e)

        return result

    async def deduct_recipe_ingredients(
        self,
        user_id: UUID,
        recipe_id: UUID,
        servings: int,
        meal_id: Optional[UUID] = None,
    ) -> RecipeDeductionResult:
        """Deduct all recipe ingredients from pantry.

        Args:
            user_id: The user's ID
            recipe_id: The recipe to deduct ingredients for
            servings: Number of servings being made
            meal_id: Optional meal ID for source tracking

        Returns:
            RecipeDeductionResult with all deduction details
        """
        # Get recipe with ingredients
        query = (
            select(Recipe)
            .where(Recipe.id == recipe_id, Recipe.user_id == user_id)
            .options(selectinload(Recipe.ingredients))
        )
        result = await self.db.execute(query)
        recipe = result.scalar_one_or_none()

        if not recipe:
            return RecipeDeductionResult(
                recipe_id=recipe_id,
                recipe_name="Unknown",
                servings=servings,
                total_ingredients=0,
                fully_satisfied=0,
                partially_satisfied=0,
                not_found=0,
                deductions=[],
                success=False,
                message="Recipe not found",
            )

        # Get pantry items
        pantry_items = await self.get_user_pantry_items(user_id)

        # Calculate scaling factor
        scale_factor = servings / recipe.servings if recipe.servings else 1

        # Deduct each ingredient
        deductions = []
        fully_satisfied = 0
        partially_satisfied = 0
        not_found = 0

        for ingredient in recipe.ingredients:
            scaled_quantity = (
                float(ingredient.quantity) * scale_factor
                if ingredient.quantity
                else None
            )

            deduction_result = await self.deduct_ingredient(
                user_id=user_id,
                ingredient_name=ingredient.ingredient_name,
                quantity=scaled_quantity,
                unit=ingredient.unit,
                pantry_items=pantry_items,
                source_type="meal",
                source_id=meal_id,
            )

            deductions.append(deduction_result)

            if deduction_result.fully_satisfied:
                fully_satisfied += 1
            elif deduction_result.pantry_item_id:
                partially_satisfied += 1
            else:
                not_found += 1

        # Commit all changes
        await self.db.commit()

        return RecipeDeductionResult(
            recipe_id=recipe_id,
            recipe_name=recipe.name,
            servings=servings,
            total_ingredients=len(recipe.ingredients),
            fully_satisfied=fully_satisfied,
            partially_satisfied=partially_satisfied,
            not_found=not_found,
            deductions=deductions,
            success=True,
            message=f"Deducted {fully_satisfied + partially_satisfied} of {len(recipe.ingredients)} ingredients",
        )

    async def check_recipe_availability(
        self,
        user_id: UUID,
        recipe_id: UUID,
        servings: int,
    ) -> RecipeAvailability:
        """Check if pantry has enough ingredients for a recipe.

        Args:
            user_id: The user's ID
            recipe_id: The recipe to check
            servings: Number of servings to check for

        Returns:
            RecipeAvailability with ingredient availability details
        """
        # Get recipe with ingredients
        query = (
            select(Recipe)
            .where(Recipe.id == recipe_id, Recipe.user_id == user_id)
            .options(selectinload(Recipe.ingredients))
        )
        result = await self.db.execute(query)
        recipe = result.scalar_one_or_none()

        if not recipe:
            return RecipeAvailability(
                recipe_id=recipe_id,
                recipe_name="Unknown",
                servings_checked=servings,
                can_make=False,
                total_ingredients=0,
                available_count=0,
                fully_available_count=0,
                missing_count=0,
            )

        # Get pantry items
        pantry_items = await self.get_user_pantry_items(user_id)

        # Calculate scaling factor
        scale_factor = servings / recipe.servings if recipe.servings else 1

        # Check each ingredient
        ingredients_availability = []
        available_count = 0
        fully_available_count = 0
        missing_count = 0

        for ingredient in recipe.ingredients:
            scaled_quantity = (
                float(ingredient.quantity) * scale_factor
                if ingredient.quantity
                else None
            )

            availability = check_ingredient_availability(
                ingredient_name=ingredient.ingredient_name,
                needed_quantity=scaled_quantity,
                needed_unit=ingredient.unit,
                pantry_items=pantry_items,
            )

            ing_avail = IngredientAvailability(
                ingredient_name=ingredient.ingredient_name,
                needed_quantity=scaled_quantity,
                needed_unit=ingredient.unit,
                available_quantity=availability.get("available_quantity"),
                available_unit=ingredient.unit,
                pantry_item_id=availability.get("pantry_item").id if availability.get("pantry_item") else None,
                pantry_item_name=availability.get("pantry_item").item_name if availability.get("pantry_item") else None,
                is_available=availability.get("available", False),
                is_fully_available=availability.get("fully_available", False),
                missing_quantity=availability.get("missing_quantity"),
                match_score=availability.get("match_score", 0.0),
            )

            ingredients_availability.append(ing_avail)

            if availability.get("fully_available"):
                fully_available_count += 1
                available_count += 1
            elif availability.get("available"):
                available_count += 1
            else:
                missing_count += 1

        # Calculate max servings that can be made
        available_servings = self._calculate_max_servings(
            recipe, pantry_items, servings
        )

        return RecipeAvailability(
            recipe_id=recipe_id,
            recipe_name=recipe.name,
            servings_checked=servings,
            can_make=fully_available_count == len(recipe.ingredients),
            available_servings=available_servings,
            total_ingredients=len(recipe.ingredients),
            available_count=available_count,
            fully_available_count=fully_available_count,
            missing_count=missing_count,
            ingredients=ingredients_availability,
        )

    def _calculate_max_servings(
        self,
        recipe: Recipe,
        pantry_items: list[PantryItem],
        check_up_to: int = 10,
    ) -> int:
        """Calculate maximum servings possible with current pantry.

        Args:
            recipe: The recipe to check
            pantry_items: Available pantry items
            check_up_to: Maximum servings to check

        Returns:
            Maximum number of servings that can be made
        """
        if not recipe.ingredients:
            return check_up_to

        max_servings = 0

        for test_servings in range(1, check_up_to + 1):
            scale_factor = test_servings / recipe.servings if recipe.servings else 1
            all_available = True

            for ingredient in recipe.ingredients:
                if not ingredient.quantity:
                    continue

                scaled_quantity = float(ingredient.quantity) * scale_factor
                availability = check_ingredient_availability(
                    ingredient_name=ingredient.ingredient_name,
                    needed_quantity=scaled_quantity,
                    needed_unit=ingredient.unit,
                    pantry_items=pantry_items,
                )

                if not availability.get("fully_available"):
                    all_available = False
                    break

            if all_available:
                max_servings = test_servings
            else:
                break

        return max_servings

    async def check_meal_availability(
        self,
        user_id: UUID,
        meal_id: UUID,
    ) -> MealAvailability:
        """Check if pantry has enough ingredients for a meal.

        Args:
            user_id: The user's ID
            meal_id: The meal to check

        Returns:
            MealAvailability with ingredient availability details
        """
        # Get meal with recipe
        query = (
            select(Meal)
            .where(Meal.id == meal_id)
            .options(selectinload(Meal.recipe).selectinload(Recipe.ingredients))
        )
        result = await self.db.execute(query)
        meal = result.scalar_one_or_none()

        if not meal:
            return MealAvailability(
                meal_id=meal_id,
                meal_plan_id=UUID("00000000-0000-0000-0000-000000000000"),
                can_make=False,
            )

        # If no recipe, consider it "available" (custom meal, eating out, etc.)
        if not meal.recipe_id or not meal.recipe:
            return MealAvailability(
                meal_id=meal_id,
                meal_plan_id=meal.meal_plan_id,
                custom_name=meal.custom_name,
                servings=meal.servings or 1,
                can_make=True,
                available_servings=meal.servings or 1,
            )

        # Check recipe availability
        recipe_availability = await self.check_recipe_availability(
            user_id=user_id,
            recipe_id=meal.recipe_id,
            servings=meal.servings or meal.recipe.servings or 2,
        )

        return MealAvailability(
            meal_id=meal_id,
            meal_plan_id=meal.meal_plan_id,
            recipe_id=meal.recipe_id,
            recipe_name=meal.recipe.name,
            servings=meal.servings or meal.recipe.servings or 2,
            can_make=recipe_availability.can_make,
            available_servings=recipe_availability.available_servings,
            missing_ingredients=recipe_availability.missing_count,
            ingredients=recipe_availability.ingredients,
        )

    async def get_pantry_transactions(
        self,
        user_id: UUID,
        pantry_item_id: Optional[UUID] = None,
        transaction_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[PantryTransaction], int]:
        """Get pantry transactions with optional filtering.

        Args:
            user_id: The user's ID
            pantry_item_id: Filter by pantry item
            transaction_type: Filter by transaction type
            limit: Max results to return
            offset: Offset for pagination

        Returns:
            Tuple of (transactions, total_count)
        """
        query = (
            select(PantryTransaction)
            .where(PantryTransaction.user_id == user_id)
            .options(selectinload(PantryTransaction.pantry_item))
        )

        if pantry_item_id:
            query = query.where(PantryTransaction.pantry_item_id == pantry_item_id)

        if transaction_type:
            query = query.where(PantryTransaction.transaction_type == transaction_type)

        # Get total count
        from sqlalchemy import func
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Apply ordering and pagination
        query = (
            query
            .order_by(PantryTransaction.transaction_date.desc())
            .offset(offset)
            .limit(limit)
        )

        result = await self.db.execute(query)
        transactions = list(result.scalars().all())

        return transactions, total

    async def adjust_pantry_quantity(
        self,
        user_id: UUID,
        pantry_item_id: UUID,
        new_quantity: float,
        notes: Optional[str] = None,
    ) -> PantryTransaction:
        """Manually adjust pantry item quantity.

        Creates an 'adjust' transaction recording the change.

        Args:
            user_id: The user's ID
            pantry_item_id: The pantry item to adjust
            new_quantity: The new quantity to set
            notes: Optional notes for the adjustment

        Returns:
            The created transaction record
        """
        item = await self.db.get(PantryItem, pantry_item_id)
        if not item or item.user_id != user_id:
            raise ValueError(f"Pantry item {pantry_item_id} not found")

        quantity_before = float(item.quantity or 0)
        quantity_change = new_quantity - quantity_before

        item.quantity = Decimal(str(new_quantity))
        item.updated_at = datetime.utcnow()

        transaction = PantryTransaction(
            user_id=user_id,
            pantry_item_id=pantry_item_id,
            transaction_type=PantryTransactionType.ADJUST.value,
            quantity_change=Decimal(str(quantity_change)),
            quantity_before=Decimal(str(quantity_before)),
            quantity_after=Decimal(str(new_quantity)),
            unit=item.unit,
            source_type="manual",
            notes=notes or "Manual quantity adjustment",
            transaction_date=datetime.utcnow(),
        )
        self.db.add(transaction)

        await self.db.commit()
        return transaction


# Factory function for dependency injection
async def get_pantry_service(db: AsyncSession) -> PantryService:
    """Get a PantryService instance."""
    return PantryService(db)
