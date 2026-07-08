"""
AI Service for MealCraft
Handles text parsing for groceries, categorization, and insights
"""
from openai import OpenAI

from app.core.config import settings
from ._constants import GROCERY_CATEGORIES
from ._transcription import TranscriptionMixin
from ._grocery import GroceryMixin
from ._pantry import PantryMixin
from ._equipment import EquipmentMixin
from ._recipe import RecipeMixin
from ._restaurant import RestaurantMixin
from ._nutrition import NutritionMixin
from ._suggestions import SuggestionsMixin


class AIService(
    TranscriptionMixin,
    GroceryMixin,
    PantryMixin,
    EquipmentMixin,
    RecipeMixin,
    RestaurantMixin,
    NutritionMixin,
    SuggestionsMixin,
):
    """AI-powered service for text parsing and categorization"""

    def __init__(self):
        self._client = None

    @property
    def client(self):
        """Lazy-load OpenAI client"""
        if self._client is None:
            api_key = settings.OPENAI_API_KEY
            if not api_key or len(api_key.strip()) == 0:
                raise ValueError("OPENAI_API_KEY environment variable not set or empty")
            self._client = OpenAI(api_key=api_key.strip())
        return self._client


# Singleton instance
ai_service = AIService()
