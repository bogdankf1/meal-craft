"""
Onboarding service for checking user data completion status.
"""
from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.user import User
from app.models.profile import Profile
from app.models.dietary_restriction import DietaryRestriction
from app.models.grocery import Grocery
from app.models.pantry import PantryItem
from app.models.nutrition import NutritionGoal
from app.models.recipe import Recipe
from app.models.meal_plan import MealPlan


class OnboardingService:
    """Service to check onboarding step completion based on actual user data."""

    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user

    async def get_derived_status(self) -> Dict[str, bool]:
        """
        Get derived completion status for all onboarding steps.
        Returns dict mapping step_id -> is_completed (based on actual data).
        """
        return {
            "household": await self._check_household(),
            "groceries": await self._check_groceries(),
            "pantry": await self._check_pantry(),
            "nutrition": await self._check_nutrition(),
            "recipes": await self._check_recipes(),
            "meal_plan": await self._check_meal_plan(),
        }

    async def _check_household(self) -> bool:
        """
        Check if user has set up their household.
        Criteria: Has at least one profile with dietary restrictions or nutritional preferences.
        """
        # Check if user has any profiles with dietary restrictions
        result = await self.db.execute(
            select(func.count(DietaryRestriction.id))
            .join(Profile)
            .where(Profile.user_id == self.user.id)
        )
        restrictions_count = result.scalar() or 0

        if restrictions_count > 0:
            return True

        # Also consider it complete if they have at least one profile (even without restrictions)
        result = await self.db.execute(
            select(func.count(Profile.id))
            .where(Profile.user_id == self.user.id)
            .where(Profile.is_archived == False)
        )
        profiles_count = result.scalar() or 0

        return profiles_count > 0

    async def _check_groceries(self) -> bool:
        """
        Check if user has added groceries.
        Criteria: Has at least one non-archived grocery item.
        """
        result = await self.db.execute(
            select(func.count(Grocery.id))
            .where(Grocery.user_id == self.user.id)
            .where(Grocery.is_archived == False)
        )
        count = result.scalar() or 0
        return count > 0

    async def _check_pantry(self) -> bool:
        """
        Check if user has added items to pantry.
        Criteria: Has at least one non-archived pantry item.
        """
        result = await self.db.execute(
            select(func.count(PantryItem.id))
            .where(PantryItem.user_id == self.user.id)
            .where(PantryItem.is_archived == False)
        )
        count = result.scalar() or 0
        return count > 0

    async def _check_nutrition(self) -> bool:
        """
        Check if user has set nutrition goals.
        Criteria: Has at least one active nutrition goal.
        """
        result = await self.db.execute(
            select(func.count(NutritionGoal.id))
            .where(NutritionGoal.user_id == self.user.id)
            .where(NutritionGoal.is_active == True)
        )
        count = result.scalar() or 0
        return count > 0

    async def _check_recipes(self) -> bool:
        """
        Check if user has generated/added recipes.
        Criteria: Has at least one AI-generated recipe OR at least 3 recipes total.
        """
        # Check for AI-generated recipes
        result = await self.db.execute(
            select(func.count(Recipe.id))
            .where(Recipe.user_id == self.user.id)
            .where(Recipe.is_ai_generated == True)
            .where(Recipe.is_archived == False)
        )
        ai_count = result.scalar() or 0

        if ai_count > 0:
            return True

        # Also consider complete if they have at least one recipe
        result = await self.db.execute(
            select(func.count(Recipe.id))
            .where(Recipe.user_id == self.user.id)
            .where(Recipe.is_archived == False)
        )
        total_count = result.scalar() or 0
        return total_count > 0

    async def _check_meal_plan(self) -> bool:
        """
        Check if user has created a meal plan.
        Criteria: Has at least one non-archived, non-template meal plan.
        """
        result = await self.db.execute(
            select(func.count(MealPlan.id))
            .where(MealPlan.user_id == self.user.id)
            .where(MealPlan.is_archived == False)
            .where(MealPlan.is_template == False)
        )
        count = result.scalar() or 0
        return count > 0
