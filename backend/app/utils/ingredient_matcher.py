"""Ingredient matching utilities for MealCraft.

This module provides functions for matching recipe ingredients to pantry items,
handling common variations in ingredient naming (e.g., "sugar" vs "white sugar"
vs "granulated sugar").
"""

import re
from typing import Optional, TYPE_CHECKING

from app.utils.unit_conversion import (
    normalize_unit,
    get_unit_category,
    convert_quantity,
    can_compare,
    UnitCategory,
)

if TYPE_CHECKING:
    from app.models.pantry import PantryItem


# Common prefixes that can be stripped for matching
REMOVABLE_PREFIXES = {
    "fresh", "frozen", "dried", "canned", "organic", "raw", "cooked",
    "chopped", "diced", "sliced", "minced", "grated", "shredded",
    "whole", "ground", "crushed", "powdered", "instant",
    "unsalted", "salted", "sweetened", "unsweetened",
    "low-fat", "nonfat", "fat-free", "reduced-fat",
    "large", "medium", "small", "extra-large",
    "boneless", "skinless", "bone-in", "skin-on",
    "ripe", "unripe", "overripe",
    "hot", "cold", "warm", "room temperature",
    "white", "brown", "black", "red", "green", "yellow",
}

# Common suffixes that can be stripped
REMOVABLE_SUFFIXES = {
    "optional", "to taste", "as needed", "for garnish",
    "divided", "separated", "at room temperature",
}

# Ingredient aliases - common alternative names
INGREDIENT_ALIASES: dict[str, list[str]] = {
    "butter": ["unsalted butter", "salted butter", "butter stick", "butter sticks"],
    "sugar": ["white sugar", "granulated sugar", "caster sugar", "regular sugar"],
    "brown sugar": ["light brown sugar", "dark brown sugar", "packed brown sugar"],
    "flour": ["all-purpose flour", "ap flour", "plain flour", "white flour"],
    "milk": ["whole milk", "2% milk", "skim milk", "low-fat milk"],
    "egg": ["eggs", "large egg", "large eggs", "whole egg", "whole eggs"],
    "oil": ["vegetable oil", "cooking oil", "neutral oil"],
    "olive oil": ["extra virgin olive oil", "evoo", "extra-virgin olive oil"],
    "salt": ["table salt", "fine salt", "sea salt", "kosher salt"],
    "pepper": ["black pepper", "ground pepper", "ground black pepper"],
    "garlic": ["garlic cloves", "cloves of garlic", "fresh garlic"],
    "onion": ["onions", "yellow onion", "white onion", "brown onion"],
    "chicken": ["chicken breast", "chicken breasts", "chicken thigh", "chicken thighs"],
    "beef": ["ground beef", "beef mince", "minced beef", "steak"],
    "tomato": ["tomatoes", "fresh tomato", "fresh tomatoes"],
    "potato": ["potatoes", "russet potato", "russet potatoes"],
    "lemon": ["lemons", "fresh lemon", "lemon juice"],
    "lime": ["limes", "fresh lime", "lime juice"],
    "cream": ["heavy cream", "whipping cream", "heavy whipping cream", "double cream"],
    "cheese": ["shredded cheese", "grated cheese"],
    "parmesan": ["parmesan cheese", "parmigiano", "parmigiano-reggiano", "grated parmesan"],
    "soy sauce": ["soya sauce", "shoyu"],
    "rice": ["white rice", "long grain rice", "jasmine rice", "basmati rice"],
    "pasta": ["spaghetti", "penne", "linguine", "fettuccine"],
    "stock": ["broth", "bouillon"],
    "chicken stock": ["chicken broth", "chicken bouillon"],
    "beef stock": ["beef broth", "beef bouillon"],
    "vegetable stock": ["vegetable broth", "veggie broth"],
}

# Build reverse lookup from aliases
_ALIAS_LOOKUP: dict[str, str] = {}
for canonical, aliases in INGREDIENT_ALIASES.items():
    for alias in aliases:
        _ALIAS_LOOKUP[alias.lower()] = canonical


def normalize_ingredient_name(name: str) -> str:
    """Normalize an ingredient name for matching.

    Handles:
    - Lowercase conversion
    - Removing common prefixes (fresh, organic, chopped, etc.)
    - Removing common suffixes (optional, to taste, etc.)
    - Handling plurals
    - Mapping common aliases

    Args:
        name: The ingredient name to normalize

    Returns:
        The normalized ingredient name

    Examples:
        >>> normalize_ingredient_name("Fresh Organic Tomatoes")
        'tomato'
        >>> normalize_ingredient_name("unsalted butter, softened")
        'butter'
        >>> normalize_ingredient_name("all-purpose flour")
        'flour'
    """
    if not name:
        return ""

    # Lowercase and strip whitespace
    normalized = name.lower().strip()

    # Remove content in parentheses (e.g., "butter (softened)")
    normalized = re.sub(r'\([^)]*\)', '', normalized).strip()

    # Remove content after comma (e.g., "butter, softened")
    if ',' in normalized:
        normalized = normalized.split(',')[0].strip()

    # Remove common suffixes
    for suffix in REMOVABLE_SUFFIXES:
        if normalized.endswith(suffix):
            normalized = normalized[:-len(suffix)].strip()

    # Remove common prefixes (word by word)
    words = normalized.split()
    filtered_words = []
    for word in words:
        # Clean up hyphens for prefix check
        clean_word = word.replace('-', ' ').strip()
        if clean_word not in REMOVABLE_PREFIXES:
            filtered_words.append(word)

    if filtered_words:
        normalized = ' '.join(filtered_words)

    # Check if it's an alias
    if normalized in _ALIAS_LOOKUP:
        normalized = _ALIAS_LOOKUP[normalized]

    # Handle simple plurals (ending in 's' or 'es')
    if normalized.endswith('es') and len(normalized) > 3:
        singular = normalized[:-2]
        if singular in INGREDIENT_ALIASES or singular in _ALIAS_LOOKUP:
            normalized = _ALIAS_LOOKUP.get(singular, singular)
    elif normalized.endswith('s') and len(normalized) > 2:
        singular = normalized[:-1]
        if singular in INGREDIENT_ALIASES or singular in _ALIAS_LOOKUP:
            normalized = _ALIAS_LOOKUP.get(singular, singular)

    return normalized.strip()


def _calculate_match_score(ingredient_name: str, pantry_name: str) -> float:
    """Calculate a match score between an ingredient and pantry item name.

    Args:
        ingredient_name: The normalized ingredient name
        pantry_name: The normalized pantry item name

    Returns:
        A score between 0 and 1, where 1 is a perfect match
    """
    if ingredient_name == pantry_name:
        return 1.0

    # Check if one contains the other
    if ingredient_name in pantry_name or pantry_name in ingredient_name:
        # Score based on length ratio
        longer = max(len(ingredient_name), len(pantry_name))
        shorter = min(len(ingredient_name), len(pantry_name))
        return shorter / longer * 0.9  # Cap at 0.9 for partial matches

    # Check word overlap
    ing_words = set(ingredient_name.split())
    pantry_words = set(pantry_name.split())

    if not ing_words or not pantry_words:
        return 0.0

    common_words = ing_words & pantry_words
    if common_words:
        # Score based on proportion of matching words
        total_words = len(ing_words | pantry_words)
        return len(common_words) / total_words * 0.8  # Cap at 0.8 for word matches

    return 0.0


def find_pantry_match(
    ingredient_name: str,
    pantry_items: list["PantryItem"],
    min_score: float = 0.5
) -> Optional["PantryItem"]:
    """Find the best matching pantry item for a recipe ingredient.

    Matching strategy (in order of preference):
    1. Exact match on normalized name
    2. Alias match (e.g., "unsalted butter" matches "butter")
    3. Partial match (one name contains the other)
    4. Word overlap match

    Args:
        ingredient_name: The ingredient name to match
        pantry_items: List of pantry items to search through
        min_score: Minimum match score required (0-1, default 0.5)

    Returns:
        The best matching PantryItem, or None if no good match found

    Examples:
        >>> pantry = [PantryItem(item_name="Unsalted Butter"), ...]
        >>> find_pantry_match("butter", pantry)
        PantryItem(item_name="Unsalted Butter")
    """
    if not ingredient_name or not pantry_items:
        return None

    normalized_ingredient = normalize_ingredient_name(ingredient_name)
    if not normalized_ingredient:
        return None

    best_match: Optional["PantryItem"] = None
    best_score = 0.0

    for item in pantry_items:
        if item.is_archived or item.is_wasted:
            continue

        normalized_pantry = normalize_ingredient_name(item.item_name)
        if not normalized_pantry:
            continue

        score = _calculate_match_score(normalized_ingredient, normalized_pantry)

        if score > best_score:
            best_score = score
            best_match = item

    # Only return if score meets minimum threshold
    if best_score >= min_score:
        return best_match

    return None


def find_all_pantry_matches(
    ingredient_name: str,
    pantry_items: list["PantryItem"],
    min_score: float = 0.5
) -> list[tuple["PantryItem", float]]:
    """Find all matching pantry items for an ingredient, with scores.

    Args:
        ingredient_name: The ingredient name to match
        pantry_items: List of pantry items to search through
        min_score: Minimum match score required (0-1)

    Returns:
        List of (PantryItem, score) tuples, sorted by score descending
    """
    if not ingredient_name or not pantry_items:
        return []

    normalized_ingredient = normalize_ingredient_name(ingredient_name)
    if not normalized_ingredient:
        return []

    matches = []

    for item in pantry_items:
        if item.is_archived or item.is_wasted:
            continue

        normalized_pantry = normalize_ingredient_name(item.item_name)
        if not normalized_pantry:
            continue

        score = _calculate_match_score(normalized_ingredient, normalized_pantry)

        if score >= min_score:
            matches.append((item, score))

    # Sort by score descending
    matches.sort(key=lambda x: x[1], reverse=True)
    return matches


def calculate_available_quantity(
    pantry_item: "PantryItem",
    needed_unit: Optional[str]
) -> Optional[float]:
    """Calculate how much of a pantry item is available in the requested unit.

    Handles unit conversion when units are compatible (e.g., kg to g).

    Args:
        pantry_item: The pantry item to check
        needed_unit: The unit the recipe needs the ingredient in

    Returns:
        The available quantity in the needed unit, or None if:
        - Pantry item has no quantity
        - Units are incompatible (e.g., weight vs volume)

    Examples:
        >>> item = PantryItem(quantity=500, unit="g")
        >>> calculate_available_quantity(item, "kg")
        0.5
    """
    if pantry_item.quantity is None:
        return None

    pantry_qty = float(pantry_item.quantity)
    pantry_unit = pantry_item.unit
    needed_unit_normalized = normalize_unit(needed_unit)
    pantry_unit_normalized = normalize_unit(pantry_unit)

    # If either has no unit, we can't compare reliably
    if not pantry_unit_normalized or not needed_unit_normalized:
        # If both have no unit, assume they're the same
        if not pantry_unit_normalized and not needed_unit_normalized:
            return pantry_qty
        return None

    # Same unit - no conversion needed
    if pantry_unit_normalized == needed_unit_normalized:
        return pantry_qty

    # Check if units are compatible
    if not can_compare(pantry_unit_normalized, needed_unit_normalized):
        return None

    # Convert
    converted = convert_quantity(pantry_qty, pantry_unit_normalized, needed_unit_normalized)
    return converted


def check_ingredient_availability(
    ingredient_name: str,
    needed_quantity: Optional[float],
    needed_unit: Optional[str],
    pantry_items: list["PantryItem"],
) -> dict:
    """Check if a recipe ingredient is available in the pantry.

    Args:
        ingredient_name: The ingredient name to check
        needed_quantity: How much is needed
        needed_unit: The unit for the needed quantity
        pantry_items: List of pantry items to search

    Returns:
        A dict with:
        - available: bool - whether ingredient is available (at least partially)
        - fully_available: bool - whether full quantity is available
        - pantry_item: Optional[PantryItem] - the matched pantry item
        - available_quantity: Optional[float] - how much is available in needed units
        - missing_quantity: Optional[float] - how much more is needed
        - match_score: float - how confident the match is (0-1)
    """
    result = {
        "available": False,
        "fully_available": False,
        "pantry_item": None,
        "available_quantity": None,
        "missing_quantity": needed_quantity,
        "match_score": 0.0,
    }

    matches = find_all_pantry_matches(ingredient_name, pantry_items)
    if not matches:
        return result

    best_item, best_score = matches[0]
    result["pantry_item"] = best_item
    result["match_score"] = best_score
    result["available"] = True

    # If no quantity needed, any match is sufficient
    if needed_quantity is None or needed_quantity <= 0:
        result["fully_available"] = True
        result["missing_quantity"] = None
        return result

    # Calculate available quantity
    available = calculate_available_quantity(best_item, needed_unit)
    if available is None:
        # Can't compare units, assume partially available
        result["available_quantity"] = None
        return result

    result["available_quantity"] = available

    if available >= needed_quantity:
        result["fully_available"] = True
        result["missing_quantity"] = 0
    else:
        result["missing_quantity"] = needed_quantity - available

    return result
