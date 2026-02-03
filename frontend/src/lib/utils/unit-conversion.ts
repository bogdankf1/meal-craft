/**
 * Unit conversion utilities for MealCraft frontend.
 *
 * Provides functions for displaying and converting between different units
 * of measurement commonly used in cooking and pantry management.
 */

export type UnitCategory = "volume" | "weight" | "count" | "unknown";

// Unit category definitions
export const VOLUME_UNITS = new Set([
  "ml",
  "l",
  "liter",
  "liters",
  "tsp",
  "tbsp",
  "cup",
  "cups",
  "fl_oz",
  "fluid_oz",
  "fl oz",
]);

export const WEIGHT_UNITS = new Set([
  "g",
  "gram",
  "grams",
  "kg",
  "kilogram",
  "kilograms",
  "oz",
  "ounce",
  "ounces",
  "lb",
  "lbs",
  "pound",
  "pounds",
]);

export const COUNT_UNITS = new Set([
  "pcs",
  "pc",
  "piece",
  "pieces",
  "each",
  "pack",
  "packs",
  "box",
  "boxes",
  "bag",
  "bags",
  "bottle",
  "bottles",
  "can",
  "cans",
  "item",
  "items",
  "unit",
  "units",
  "whole",
  "clove",
  "cloves",
  "slice",
  "slices",
  "head",
  "heads",
  "bunch",
  "bunches",
  "sprig",
  "sprigs",
  "stalk",
  "stalks",
]);

// Unit aliases - map various spellings to canonical form
export const UNIT_ALIASES: Record<string, string> = {
  // Volume
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cup: "cup",
  cups: "cup",
  fl_oz: "fl_oz",
  "fl oz": "fl_oz",
  "fluid ounce": "fl_oz",
  "fluid ounces": "fl_oz",
  // Weight
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  // Count
  pcs: "pcs",
  pc: "pcs",
  piece: "pcs",
  pieces: "pcs",
  each: "each",
  pack: "pack",
  packs: "pack",
  box: "box",
  boxes: "box",
  bag: "bag",
  bags: "bag",
  bottle: "bottle",
  bottles: "bottle",
  can: "can",
  cans: "can",
};

// Conversion factors to base units (ml for volume, g for weight)
export const CONVERSIONS: Record<string, number> = {
  // Volume → ml
  ml: 1,
  l: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  cup: 236.588,
  fl_oz: 29.5735,
  // Weight → g
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
  // Count (no conversion)
  pcs: 1,
  each: 1,
  pack: 1,
  box: 1,
  bag: 1,
  bottle: 1,
  can: 1,
};

/**
 * Normalize a unit string to its canonical form.
 */
export function normalizeUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const cleaned = unit.toLowerCase().trim();
  if (!cleaned) return null;
  return UNIT_ALIASES[cleaned] || cleaned;
}

/**
 * Get the category of a unit.
 */
export function getUnitCategory(unit: string | null | undefined): UnitCategory {
  const normalized = normalizeUnit(unit);
  if (!normalized) return "unknown";

  if (["ml", "l", "tsp", "tbsp", "cup", "fl_oz"].includes(normalized)) {
    return "volume";
  }
  if (["g", "kg", "oz", "lb"].includes(normalized)) {
    return "weight";
  }
  if (normalized in CONVERSIONS || COUNT_UNITS.has(normalized)) {
    return "count";
  }

  return "unknown";
}

/**
 * Check if two units can be compared/converted.
 */
export function canCompare(
  unit1: string | null | undefined,
  unit2: string | null | undefined
): boolean {
  const cat1 = getUnitCategory(unit1);
  const cat2 = getUnitCategory(unit2);

  if (cat1 === "unknown" || cat2 === "unknown") {
    return false;
  }

  return cat1 === cat2;
}

/**
 * Convert a quantity from one unit to another.
 * Returns null if conversion is not possible.
 */
export function convertQuantity(
  quantity: number,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined
): number | null {
  if (!canCompare(fromUnit, toUnit)) {
    return null;
  }

  const fromNormalized = normalizeUnit(fromUnit);
  const toNormalized = normalizeUnit(toUnit);

  if (!fromNormalized || !toNormalized) {
    return null;
  }

  // Same unit
  if (fromNormalized === toNormalized) {
    return quantity;
  }

  // For count units with different types, we can't convert
  const category = getUnitCategory(fromNormalized);
  if (category === "count") {
    return fromNormalized === toNormalized ? quantity : null;
  }

  const fromFactor = CONVERSIONS[fromNormalized];
  const toFactor = CONVERSIONS[toNormalized];

  if (fromFactor === undefined || toFactor === undefined) {
    return null;
  }

  // Convert: from_unit -> base_unit -> to_unit
  const baseQuantity = quantity * fromFactor;
  return baseQuantity / toFactor;
}

/**
 * Format a quantity with its unit for display.
 */
export function formatQuantity(
  quantity: number | null | undefined,
  unit: string | null | undefined,
  precision: number = 2
): string {
  if (quantity === null || quantity === undefined) {
    return unit || "";
  }

  let formattedQty: string;
  if (Number.isInteger(quantity)) {
    formattedQty = quantity.toString();
  } else {
    formattedQty = quantity
      .toFixed(precision)
      .replace(/\.?0+$/, "");
  }

  if (unit) {
    return `${formattedQty} ${unit}`;
  }
  return formattedQty;
}

/**
 * Get a human-readable display name for a unit.
 */
export function getDisplayUnit(unit: string | null | undefined): string {
  if (!unit) return "";

  const normalized = normalizeUnit(unit);
  if (!normalized) return unit;

  // Map to display names
  const displayNames: Record<string, string> = {
    g: "g",
    kg: "kg",
    ml: "ml",
    l: "L",
    tsp: "tsp",
    tbsp: "tbsp",
    cup: "cups",
    fl_oz: "fl oz",
    oz: "oz",
    lb: "lb",
    pcs: "pcs",
    each: "each",
    pack: "pack",
    box: "box",
    bag: "bag",
    bottle: "bottle",
    can: "can",
  };

  return displayNames[normalized] || normalized;
}

/**
 * Suggest a more appropriate unit for display based on quantity.
 */
export function smartUnitSuggestion(
  quantity: number,
  unit: string | null | undefined
): { quantity: number; unit: string } {
  const normalized = normalizeUnit(unit);
  if (!normalized) {
    return { quantity, unit: unit || "" };
  }

  // Volume conversions
  if (normalized === "ml" && quantity >= 1000) {
    return { quantity: quantity / 1000, unit: "l" };
  }
  if (normalized === "l" && quantity < 1) {
    return { quantity: quantity * 1000, unit: "ml" };
  }

  // Weight conversions
  if (normalized === "g" && quantity >= 1000) {
    return { quantity: quantity / 1000, unit: "kg" };
  }
  if (normalized === "kg" && quantity < 1) {
    return { quantity: quantity * 1000, unit: "g" };
  }

  if (normalized === "oz" && quantity >= 16) {
    return { quantity: quantity / 16, unit: "lb" };
  }
  if (normalized === "lb" && quantity < 1) {
    return { quantity: quantity * 16, unit: "oz" };
  }

  return { quantity, unit: normalized };
}

/**
 * Format a quantity with smart unit conversion for display.
 */
export function formatSmartQuantity(
  quantity: number | null | undefined,
  unit: string | null | undefined,
  precision: number = 2
): string {
  if (quantity === null || quantity === undefined) {
    return unit ? getDisplayUnit(unit) : "";
  }

  const { quantity: smartQty, unit: smartUnit } = smartUnitSuggestion(
    quantity,
    unit
  );
  return formatQuantity(smartQty, getDisplayUnit(smartUnit), precision);
}

/**
 * Get available units for a category.
 */
export function getUnitsForCategory(
  category: UnitCategory
): Array<{ value: string; label: string }> {
  switch (category) {
    case "volume":
      return [
        { value: "ml", label: "ml" },
        { value: "l", label: "L" },
        { value: "tsp", label: "tsp" },
        { value: "tbsp", label: "tbsp" },
        { value: "cup", label: "cup" },
        { value: "fl_oz", label: "fl oz" },
      ];
    case "weight":
      return [
        { value: "g", label: "g" },
        { value: "kg", label: "kg" },
        { value: "oz", label: "oz" },
        { value: "lb", label: "lb" },
      ];
    case "count":
      return [
        { value: "pcs", label: "pcs" },
        { value: "each", label: "each" },
        { value: "pack", label: "pack" },
        { value: "box", label: "box" },
        { value: "bag", label: "bag" },
        { value: "bottle", label: "bottle" },
        { value: "can", label: "can" },
      ];
    default:
      return [];
  }
}

/**
 * Common unit options for forms.
 */
export const COMMON_UNITS = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "L" },
  { value: "pcs", label: "pcs" },
  { value: "tsp", label: "tsp" },
  { value: "tbsp", label: "tbsp" },
  { value: "cup", label: "cup" },
  { value: "oz", label: "oz" },
  { value: "lb", label: "lb" },
  { value: "pack", label: "pack" },
  { value: "box", label: "box" },
  { value: "can", label: "can" },
  { value: "bottle", label: "bottle" },
];
