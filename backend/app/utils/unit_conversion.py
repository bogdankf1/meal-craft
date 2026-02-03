"""Unit conversion utilities for MealCraft.

This module provides functions for converting between different units of measurement
commonly used in cooking and pantry management. It supports volume, weight, and count units.

Categories:
- Volume: ml, l, tsp, tbsp, cup, fl_oz
- Weight: g, kg, oz, lb
- Count: pcs, piece, pieces, each, pack, box, bag, bottle, can

Note: Cross-category conversion (e.g., weight to volume) is not supported as it requires
ingredient-specific density information.
"""

from enum import Enum
from typing import Optional


class UnitCategory(str, Enum):
    """Unit category enumeration."""
    VOLUME = "volume"
    WEIGHT = "weight"
    COUNT = "count"
    UNKNOWN = "unknown"


# Unit category definitions
VOLUME_UNITS = {"ml", "l", "liter", "liters", "tsp", "tbsp", "cup", "cups", "fl_oz", "fluid_oz", "fl oz"}
WEIGHT_UNITS = {"g", "gram", "grams", "kg", "kilogram", "kilograms", "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds"}
COUNT_UNITS = {"pcs", "pc", "piece", "pieces", "each", "pack", "packs", "box", "boxes", "bag", "bags", "bottle", "bottles", "can", "cans", "item", "items", "unit", "units", "whole", "clove", "cloves", "slice", "slices", "head", "heads", "bunch", "bunches", "sprig", "sprigs", "stalk", "stalks"}

# Unit aliases - map various spellings to canonical form
UNIT_ALIASES: dict[str, str] = {
    # Volume
    "ml": "ml",
    "milliliter": "ml",
    "milliliters": "ml",
    "millilitre": "ml",
    "millilitres": "ml",
    "l": "l",
    "liter": "l",
    "liters": "l",
    "litre": "l",
    "litres": "l",
    "tsp": "tsp",
    "teaspoon": "tsp",
    "teaspoons": "tsp",
    "tbsp": "tbsp",
    "tablespoon": "tbsp",
    "tablespoons": "tbsp",
    "cup": "cup",
    "cups": "cup",
    "c": "cup",
    "fl_oz": "fl_oz",
    "fl oz": "fl_oz",
    "fluid_oz": "fl_oz",
    "fluid oz": "fl_oz",
    "fluid ounce": "fl_oz",
    "fluid ounces": "fl_oz",
    # Weight
    "g": "g",
    "gram": "g",
    "grams": "g",
    "gr": "g",
    "kg": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "kilo": "kg",
    "kilos": "kg",
    "oz": "oz",
    "ounce": "oz",
    "ounces": "oz",
    "lb": "lb",
    "lbs": "lb",
    "pound": "lb",
    "pounds": "lb",
    # Count
    "pcs": "pcs",
    "pc": "pcs",
    "piece": "pcs",
    "pieces": "pcs",
    "each": "each",
    "ea": "each",
    "pack": "pack",
    "packs": "pack",
    "box": "box",
    "boxes": "box",
    "bag": "bag",
    "bags": "bag",
    "bottle": "bottle",
    "bottles": "bottle",
    "can": "can",
    "cans": "can",
    "item": "pcs",
    "items": "pcs",
    "unit": "pcs",
    "units": "pcs",
    "whole": "whole",
    "clove": "clove",
    "cloves": "clove",
    "slice": "slice",
    "slices": "slice",
    "head": "head",
    "heads": "head",
    "bunch": "bunch",
    "bunches": "bunch",
    "sprig": "sprig",
    "sprigs": "sprig",
    "stalk": "stalk",
    "stalks": "stalk",
}

# Conversion factors to base units (ml for volume, g for weight)
# All volume units convert to ml, all weight units convert to g
CONVERSIONS: dict[str, float] = {
    # Volume → ml (base unit)
    "ml": 1.0,
    "l": 1000.0,
    "tsp": 4.92892,  # US teaspoon
    "tbsp": 14.7868,  # US tablespoon
    "cup": 236.588,  # US cup
    "fl_oz": 29.5735,  # US fluid ounce
    # Weight → g (base unit)
    "g": 1.0,
    "kg": 1000.0,
    "oz": 28.3495,
    "lb": 453.592,
    # Count units (no conversion, treated as 1:1)
    "pcs": 1.0,
    "each": 1.0,
    "pack": 1.0,
    "box": 1.0,
    "bag": 1.0,
    "bottle": 1.0,
    "can": 1.0,
    "whole": 1.0,
    "clove": 1.0,
    "slice": 1.0,
    "head": 1.0,
    "bunch": 1.0,
    "sprig": 1.0,
    "stalk": 1.0,
}


def normalize_unit(unit: Optional[str]) -> Optional[str]:
    """Normalize a unit string to its canonical form.

    Handles:
    - Lowercase conversion
    - Whitespace stripping
    - Common aliases (e.g., 'tablespoons' -> 'tbsp')

    Args:
        unit: The unit string to normalize

    Returns:
        The canonical unit string, or None if input is None/empty

    Examples:
        >>> normalize_unit("Tablespoons")
        'tbsp'
        >>> normalize_unit("GRAMS")
        'g'
        >>> normalize_unit("pieces")
        'pcs'
    """
    if not unit:
        return None

    cleaned = unit.lower().strip()
    if not cleaned:
        return None

    return UNIT_ALIASES.get(cleaned, cleaned)


def get_unit_category(unit: Optional[str]) -> UnitCategory:
    """Get the category of a unit.

    Args:
        unit: The unit to categorize (will be normalized)

    Returns:
        UnitCategory enum value (VOLUME, WEIGHT, COUNT, or UNKNOWN)

    Examples:
        >>> get_unit_category("ml")
        <UnitCategory.VOLUME: 'volume'>
        >>> get_unit_category("kg")
        <UnitCategory.WEIGHT: 'weight'>
        >>> get_unit_category("pieces")
        <UnitCategory.COUNT: 'count'>
    """
    normalized = normalize_unit(unit)
    if not normalized:
        return UnitCategory.UNKNOWN

    if normalized in CONVERSIONS:
        # Check which category it belongs to based on the normalized unit
        if normalized in {"ml", "l", "tsp", "tbsp", "cup", "fl_oz"}:
            return UnitCategory.VOLUME
        elif normalized in {"g", "kg", "oz", "lb"}:
            return UnitCategory.WEIGHT
        else:
            return UnitCategory.COUNT

    # Check against the original unit sets (for any units not in CONVERSIONS)
    if normalized in VOLUME_UNITS or unit and unit.lower() in VOLUME_UNITS:
        return UnitCategory.VOLUME
    elif normalized in WEIGHT_UNITS or unit and unit.lower() in WEIGHT_UNITS:
        return UnitCategory.WEIGHT
    elif normalized in COUNT_UNITS or unit and unit.lower() in COUNT_UNITS:
        return UnitCategory.COUNT

    return UnitCategory.UNKNOWN


def can_compare(unit1: Optional[str], unit2: Optional[str]) -> bool:
    """Check if two units can be compared/converted.

    Units can only be compared if they belong to the same category
    (volume-to-volume, weight-to-weight, or count-to-count).

    Args:
        unit1: First unit
        unit2: Second unit

    Returns:
        True if the units can be converted between each other

    Examples:
        >>> can_compare("g", "kg")
        True
        >>> can_compare("ml", "cup")
        True
        >>> can_compare("g", "ml")
        False
    """
    cat1 = get_unit_category(unit1)
    cat2 = get_unit_category(unit2)

    # Unknown units can't be compared
    if cat1 == UnitCategory.UNKNOWN or cat2 == UnitCategory.UNKNOWN:
        return False

    return cat1 == cat2


def to_base_unit(quantity: float, unit: Optional[str]) -> tuple[float, str]:
    """Convert a quantity to its base unit.

    Base units are:
    - Volume: ml (milliliters)
    - Weight: g (grams)
    - Count: same unit (no conversion)

    Args:
        quantity: The quantity to convert
        unit: The unit of the quantity

    Returns:
        A tuple of (converted_quantity, base_unit_string)

    Raises:
        ValueError: If the unit is unknown or has no conversion factor

    Examples:
        >>> to_base_unit(2, "kg")
        (2000.0, 'g')
        >>> to_base_unit(1, "cup")
        (236.588, 'ml')
    """
    normalized = normalize_unit(unit)
    if not normalized:
        raise ValueError(f"Unknown unit: {unit}")

    if normalized not in CONVERSIONS:
        raise ValueError(f"No conversion factor for unit: {unit}")

    category = get_unit_category(normalized)
    conversion_factor = CONVERSIONS[normalized]
    converted_quantity = quantity * conversion_factor

    if category == UnitCategory.VOLUME:
        return (converted_quantity, "ml")
    elif category == UnitCategory.WEIGHT:
        return (converted_quantity, "g")
    else:
        # Count units - return as-is
        return (quantity, normalized)


def convert_quantity(
    quantity: float,
    from_unit: Optional[str],
    to_unit: Optional[str]
) -> Optional[float]:
    """Convert a quantity from one unit to another.

    Only conversions within the same category are supported:
    - Volume: ml ↔ l ↔ tsp ↔ tbsp ↔ cup ↔ fl_oz
    - Weight: g ↔ kg ↔ oz ↔ lb
    - Count: Only same-unit comparisons

    Args:
        quantity: The quantity to convert
        from_unit: The source unit
        to_unit: The target unit

    Returns:
        The converted quantity, or None if conversion is not possible

    Examples:
        >>> convert_quantity(1000, "g", "kg")
        1.0
        >>> convert_quantity(2, "cup", "ml")
        473.176
        >>> convert_quantity(500, "g", "ml")
        None  # Cannot convert weight to volume
    """
    if not can_compare(from_unit, to_unit):
        return None

    from_normalized = normalize_unit(from_unit)
    to_normalized = normalize_unit(to_unit)

    if not from_normalized or not to_normalized:
        return None

    # Same unit, no conversion needed
    if from_normalized == to_normalized:
        return quantity

    # For count units with different types, we can't convert
    category = get_unit_category(from_normalized)
    if category == UnitCategory.COUNT:
        # Different count units can't be converted (e.g., can vs bottle)
        return None if from_normalized != to_normalized else quantity

    # Get conversion factors
    from_factor = CONVERSIONS.get(from_normalized)
    to_factor = CONVERSIONS.get(to_normalized)

    if from_factor is None or to_factor is None:
        return None

    # Convert: from_unit -> base_unit -> to_unit
    base_quantity = quantity * from_factor
    converted_quantity = base_quantity / to_factor

    return converted_quantity


def format_quantity(quantity: float, unit: Optional[str], precision: int = 2) -> str:
    """Format a quantity with its unit for display.

    Args:
        quantity: The quantity value
        unit: The unit string
        precision: Number of decimal places (default 2)

    Returns:
        Formatted string like "500 g" or "2.5 cups"

    Examples:
        >>> format_quantity(500, "g")
        '500 g'
        >>> format_quantity(2.5, "cup")
        '2.5 cup'
    """
    if quantity == int(quantity):
        formatted_qty = str(int(quantity))
    else:
        formatted_qty = f"{quantity:.{precision}f}".rstrip('0').rstrip('.')

    if unit:
        return f"{formatted_qty} {unit}"
    return formatted_qty


def get_display_unit(unit: Optional[str]) -> str:
    """Get the human-readable display name for a unit.

    Args:
        unit: The canonical unit code

    Returns:
        Human-readable unit name

    Examples:
        >>> get_display_unit("g")
        'g'
        >>> get_display_unit("tbsp")
        'tbsp'
    """
    if not unit:
        return ""

    normalized = normalize_unit(unit)
    return normalized or unit


def smart_unit_suggestion(quantity: float, unit: Optional[str]) -> tuple[float, str]:
    """Suggest a more appropriate unit for display based on quantity.

    Converts to larger or smaller units when it makes the number more readable.

    Args:
        quantity: The quantity value
        unit: The current unit

    Returns:
        Tuple of (adjusted_quantity, suggested_unit)

    Examples:
        >>> smart_unit_suggestion(1500, "ml")
        (1.5, 'l')
        >>> smart_unit_suggestion(0.5, "kg")
        (500.0, 'g')
    """
    normalized = normalize_unit(unit)
    if not normalized:
        return (quantity, unit or "")

    # Volume conversions
    if normalized == "ml" and quantity >= 1000:
        return (quantity / 1000, "l")
    if normalized == "l" and quantity < 1:
        return (quantity * 1000, "ml")

    # Weight conversions
    if normalized == "g" and quantity >= 1000:
        return (quantity / 1000, "kg")
    if normalized == "kg" and quantity < 1:
        return (quantity * 1000, "g")

    if normalized == "oz" and quantity >= 16:
        return (quantity / 16, "lb")
    if normalized == "lb" and quantity < 1:
        return (quantity * 16, "oz")

    return (quantity, normalized)
