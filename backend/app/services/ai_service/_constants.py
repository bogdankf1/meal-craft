"""Shared constants for the AI service package."""
from app.models.grocery import GroceryCategory


# Valid grocery categories (from GroceryCategory enum)
GROCERY_CATEGORIES = [cat.value for cat in GroceryCategory]
