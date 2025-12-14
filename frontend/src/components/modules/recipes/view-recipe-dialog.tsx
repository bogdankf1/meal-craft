"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Clock,
  Flame,
  Users,
  Star,
  Heart,
  ChefHat,
  UtensilsCrossed,
  Calendar,
  ExternalLink,
  Check,
  ShoppingCart,
  Package,
  Wrench,
  AlertCircle,
  GraduationCap,
  Leaf,
  Sun,
  Lightbulb,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  useGetRecipeQuery,
  type RecipeListItem,
} from "@/lib/api/recipes-api";
import { useGetPantryItemsQuery } from "@/lib/api/pantry-api";
import { useGetGroceriesQuery } from "@/lib/api/groceries-api";
import { useGetKitchenEquipmentQuery, type KitchenEquipment } from "@/lib/api/kitchen-equipment-api";
import { useGetUserSkillsQuery, type UserSkill } from "@/lib/api/learning-api";
import type { RecipeEquipment, RecipeTechnique, RecipeSeasonalIngredient } from "@/lib/api/recipes-api";

interface ViewRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: RecipeListItem | null;
}

// Common words to ignore when matching ingredients
const STOP_WORDS = new Set([
  "fresh", "dried", "ground", "chopped", "minced", "sliced", "diced",
  "whole", "large", "small", "medium", "extra", "virgin", "organic",
  "raw", "cooked", "frozen", "canned", "packed", "light", "dark",
  "unsalted", "salted", "sweet", "sour", "hot", "cold", "warm",
  "boneless", "skinless", "lean", "fat", "free", "low", "high",
  "fine", "coarse", "thick", "thin", "ripe", "unripe", "peeled",
  "pitted", "seeded", "seedless", "plain", "pure", "natural",
  "for", "of", "the", "a", "an", "to", "and", "or", "with",
]);

// Normalize text for comparison
function normalizeText(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

// Extract significant words from a name (excluding stop words)
function getSignificantWords(name: string): string[] {
  const normalized = normalizeText(name);
  return normalized
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

// Check if two ingredient names match
// Matching rules:
// 1. Exact match after normalization
// 2. All significant words from inventory item appear in ingredient name
// 3. The core ingredient word matches (e.g., "salt" matches "sea salt", "salt" matches "table salt")
function ingredientsMatch(
  ingredientName: string,
  inventoryItemName: string
): boolean {
  const normalizedIngredient = normalizeText(ingredientName);
  const normalizedItem = normalizeText(inventoryItemName);

  // Exact match
  if (normalizedIngredient === normalizedItem) {
    return true;
  }

  const ingredientWords = getSignificantWords(ingredientName);
  const itemWords = getSignificantWords(inventoryItemName);

  // If item has no significant words, skip it
  if (itemWords.length === 0) {
    return false;
  }

  // All words from the inventory item must appear in the ingredient name
  // This ensures "salt" matches "salt" in recipe, and "olive oil" matches "olive oil"
  // But "pork" won't match "pork chops" unless you have "pork chops" in inventory
  const allItemWordsInIngredient = itemWords.every((itemWord) =>
    ingredientWords.some(
      (ingWord) =>
        ingWord === itemWord ||
        // Handle plurals: "potato" matches "potatoes"
        ingWord === itemWord + "s" ||
        ingWord === itemWord + "es" ||
        itemWord === ingWord + "s" ||
        itemWord === ingWord + "es"
    )
  );

  if (allItemWordsInIngredient) {
    return true;
  }

  // Also check if ingredient words are subset of item words
  // (e.g., ingredient "salt" matches item "sea salt")
  if (ingredientWords.length === 1 && itemWords.length > 0) {
    const singleWord = ingredientWords[0];
    const lastItemWord = itemWords[itemWords.length - 1];
    // Match if the single ingredient word matches the last (usually most significant) word
    if (
      lastItemWord === singleWord ||
      lastItemWord === singleWord + "s" ||
      lastItemWord === singleWord + "es" ||
      singleWord === lastItemWord + "s" ||
      singleWord === lastItemWord + "es"
    ) {
      return true;
    }
  }

  return false;
}

// Check if ingredient matches any item in the list
function findMatchingItem(
  ingredientName: string,
  items: Array<{ item_name: string }>
): boolean {
  return items.some((item) => ingredientsMatch(ingredientName, item.item_name));
}

// Check if equipment name matches any item in the user's kitchen equipment
function findMatchingEquipment(
  equipmentName: string,
  userEquipment: KitchenEquipment[]
): KitchenEquipment | null {
  const normalizedEquipmentName = normalizeText(equipmentName);
  const equipmentWords = getSignificantWords(equipmentName);

  for (const item of userEquipment) {
    const normalizedItemName = normalizeText(item.name);
    const itemWords = getSignificantWords(item.name);

    // Exact match
    if (normalizedEquipmentName === normalizedItemName) {
      return item;
    }

    // All words from recipe equipment appear in user's equipment
    if (equipmentWords.length > 0 && itemWords.length > 0) {
      const allEquipmentWordsInItem = equipmentWords.every((eqWord) =>
        itemWords.some(
          (itemWord) =>
            itemWord === eqWord ||
            itemWord === eqWord + "s" ||
            itemWord === eqWord + "es" ||
            eqWord === itemWord + "s" ||
            eqWord === itemWord + "es"
        )
      );

      if (allEquipmentWordsInItem) {
        return item;
      }

      // Also check reverse: all words from user's equipment appear in recipe equipment
      const allItemWordsInEquipment = itemWords.every((itemWord) =>
        equipmentWords.some(
          (eqWord) =>
            eqWord === itemWord ||
            eqWord === itemWord + "s" ||
            eqWord === itemWord + "es" ||
            itemWord === eqWord + "s" ||
            itemWord === eqWord + "es"
        )
      );

      if (allItemWordsInEquipment) {
        return item;
      }
    }
  }

  return null;
}

// Check if technique/skill name matches any user skill
function findMatchingSkill(
  techniqueName: string,
  userSkills: UserSkill[]
): UserSkill | null {
  const normalizedTechniqueName = normalizeText(techniqueName);
  const techniqueWords = getSignificantWords(techniqueName);

  for (const userSkill of userSkills) {
    if (!userSkill.skill) continue;

    const normalizedSkillName = normalizeText(userSkill.skill.name);
    const skillWords = getSignificantWords(userSkill.skill.name);

    // Exact match
    if (normalizedTechniqueName === normalizedSkillName) {
      return userSkill;
    }

    // All words from technique appear in user's skill
    if (techniqueWords.length > 0 && skillWords.length > 0) {
      const allTechniqueWordsInSkill = techniqueWords.every((techWord) =>
        skillWords.some(
          (skillWord) =>
            skillWord === techWord ||
            skillWord === techWord + "s" ||
            skillWord === techWord + "ing" ||
            techWord === skillWord + "s" ||
            techWord === skillWord + "ing"
        )
      );

      if (allTechniqueWordsInSkill) {
        return userSkill;
      }

      // Also check reverse
      const allSkillWordsInTechnique = skillWords.every((skillWord) =>
        techniqueWords.some(
          (techWord) =>
            techWord === skillWord ||
            techWord === skillWord + "s" ||
            techWord === skillWord + "ing" ||
            skillWord === techWord + "s" ||
            skillWord === techWord + "ing"
        )
      );

      if (allSkillWordsInTechnique) {
        return userSkill;
      }
    }
  }

  return null;
}

// Month names for seasonality display
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Get month name from 1-indexed month number
function getMonthName(month: number): string {
  if (month >= 1 && month <= 12) {
    return MONTH_NAMES[month - 1];
  }
  return "";
}

// Get short month name
function getShortMonthName(month: number): string {
  return getMonthName(month).slice(0, 3);
}

// Check if current month is in peak season
function isInPeakSeason(peakMonths: number[] | null | undefined): boolean {
  if (!peakMonths || peakMonths.length === 0) return false;
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  return peakMonths.includes(currentMonth);
}

// Format month range (e.g., "June - August")
function formatMonthRange(months: number[] | null | undefined): string {
  if (!months || months.length === 0) return "";
  if (months.length === 1) return getMonthName(months[0]);

  // Sort months
  const sorted = [...months].sort((a, b) => a - b);

  // Check if consecutive
  let isConsecutive = true;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      isConsecutive = false;
      break;
    }
  }

  if (isConsecutive) {
    return `${getMonthName(sorted[0])} - ${getMonthName(sorted[sorted.length - 1])}`;
  }

  // Non-consecutive, list all
  return sorted.map(getShortMonthName).join(", ");
}

// Parse plain text instructions into steps
// Handles formats like "Step 1: ...", "1. ...", "1) ...", or newline-separated
function parseInstructionsToSteps(instructions: string): string[] {
  if (!instructions) return [];

  // Try to split by "Step X:" pattern
  const stepPattern = /Step\s*\d+\s*[:.]\s*/gi;
  if (stepPattern.test(instructions)) {
    return instructions
      .split(/Step\s*\d+\s*[:.]\s*/gi)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // Try to split by numbered patterns like "1. " or "1) "
  const numberedPattern = /^\d+[.)]\s*/;
  const lines = instructions.split(/\n+/);
  if (lines.some((line) => numberedPattern.test(line.trim()))) {
    return lines
      .map((line) => line.trim().replace(numberedPattern, ""))
      .filter((s) => s.length > 0);
  }

  // Try to split by sentences ending with periods (for run-on instructions)
  // Look for patterns like ". Step" or ". Then" or just split by ". " followed by capital
  const sentenceSteps = instructions.split(/\.\s+(?=[A-Z])/).map((s) => s.trim());
  if (sentenceSteps.length > 1) {
    return sentenceSteps
      .map((s) => (s.endsWith(".") ? s : s + "."))
      .filter((s) => s.length > 1);
  }

  // Fallback: return as single step
  return [instructions];
}

export function ViewRecipeDialog({
  open,
  onOpenChange,
  recipe,
}: ViewRecipeDialogProps) {
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");

  // Fetch full recipe details
  const { data: fullRecipe, isLoading: isLoadingRecipe } = useGetRecipeQuery(
    recipe?.id ?? "",
    { skip: !recipe?.id || !open }
  );

  // Fetch pantry items for ingredient matching (max 100 per API limit)
  const { data: pantryData } = useGetPantryItemsQuery(
    { page: 1, per_page: 100 },
    { skip: !open }
  );

  // Fetch grocery items for ingredient matching (max 100 per API limit)
  const { data: groceriesData } = useGetGroceriesQuery(
    { page: 1, per_page: 100 },
    { skip: !open }
  );

  // Fetch kitchen equipment for equipment matching
  const { data: equipmentData } = useGetKitchenEquipmentQuery(
    { page: 1, per_page: 100 },
    { skip: !open }
  );

  // Fetch user skills for technique matching
  const { data: userSkillsData } = useGetUserSkillsQuery(
    { page: 1, per_page: 100 },
    { skip: !open }
  );

  // Compute which ingredients are available
  const ingredients = fullRecipe?.ingredients;
  const pantryItems = pantryData?.items;
  const groceryItems = groceriesData?.items;

  const ingredientAvailability = useMemo(() => {
    if (!ingredients) return new Map<string, "pantry" | "grocery">();

    const availability = new Map<string, "pantry" | "grocery">();
    const pantry = pantryItems || [];
    const grocery = groceryItems || [];

    for (const ingredient of ingredients) {
      if (findMatchingItem(ingredient.ingredient_name, pantry)) {
        availability.set(ingredient.id, "pantry");
      } else if (findMatchingItem(ingredient.ingredient_name, grocery)) {
        availability.set(ingredient.id, "grocery");
      }
    }

    return availability;
  }, [ingredients, pantryItems, groceryItems]);

  const availableCount = ingredientAvailability.size;
  const totalIngredients = fullRecipe?.ingredients?.length || 0;

  // Compute which equipment is available
  const requiredEquipment = fullRecipe?.required_equipment;
  const userEquipment = equipmentData?.items || [];

  const equipmentAvailability = useMemo(() => {
    if (!requiredEquipment || requiredEquipment.length === 0) {
      return new Map<string, { available: boolean; userItem: KitchenEquipment | null }>();
    }

    const availability = new Map<string, { available: boolean; userItem: KitchenEquipment | null }>();

    for (const eq of requiredEquipment) {
      const matchedItem = findMatchingEquipment(eq.equipment_name, userEquipment);
      availability.set(eq.equipment_name, {
        available: matchedItem !== null,
        userItem: matchedItem,
      });
    }

    return availability;
  }, [requiredEquipment, userEquipment]);

  const availableEquipmentCount = Array.from(equipmentAvailability.values()).filter(v => v.available).length;
  const totalEquipment = requiredEquipment?.length || 0;

  // Compute which techniques/skills user knows
  const recipeTechniques = fullRecipe?.techniques;
  const userSkills = userSkillsData?.items || [];

  const techniqueAvailability = useMemo(() => {
    if (!recipeTechniques || recipeTechniques.length === 0) {
      return new Map<string, { known: boolean; userSkill: UserSkill | null; proficiency: string | null }>();
    }

    const availability = new Map<string, { known: boolean; userSkill: UserSkill | null; proficiency: string | null }>();

    for (const tech of recipeTechniques) {
      const matchedSkill = findMatchingSkill(tech.skill_name, userSkills);
      availability.set(tech.skill_name, {
        known: matchedSkill !== null,
        userSkill: matchedSkill,
        proficiency: matchedSkill?.proficiency_level || null,
      });
    }

    return availability;
  }, [recipeTechniques, userSkills]);

  const knownTechniquesCount = Array.from(techniqueAvailability.values()).filter(v => v.known).length;
  const totalTechniques = recipeTechniques?.length || 0;

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "";
    }
  };

  if (!recipe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                {recipe.name}
                {recipe.is_favorite && (
                  <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                )}
              </DialogTitle>
              {fullRecipe?.description && (
                <p className="text-muted-foreground mt-1 text-sm">
                  {fullRecipe.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {(recipe.prep_time || recipe.cook_time) && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {recipe.prep_time && <span>{recipe.prep_time}m prep</span>}
                {recipe.prep_time && recipe.cook_time && <span>·</span>}
                {recipe.cook_time && (
                  <>
                    <Flame className="h-4 w-4" />
                    <span>{recipe.cook_time}m cook</span>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {recipe.servings} {t("servings")}
              </span>
            </div>
            {recipe.difficulty && (
              <Badge className={cn("text-xs", getDifficultyColor(recipe.difficulty))}>
                {t(`difficulties.${recipe.difficulty}`)}
              </Badge>
            )}
            {recipe.category && (
              <Badge variant="outline" className="text-xs">
                {t(`categories.${recipe.category}`)}
              </Badge>
            )}
            {recipe.cuisine_type && (
              <Badge variant="outline" className="text-xs">
                {t(`cuisines.${recipe.cuisine_type.toLowerCase()}`)}
              </Badge>
            )}
            {recipe.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{recipe.rating}</span>
              </div>
            )}
            {recipe.times_cooked > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {t("cookedTimes", { count: recipe.times_cooked })}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 overflow-auto">
          <div className="py-4 px-6 space-y-6">
            {/* Ingredients Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5" />
                  {t("ingredients")}
                  {totalIngredients > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      ({totalIngredients})
                    </span>
                  )}
                </h3>
                {availableCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    {availableCount}/{totalIngredients} {t("viewRecipe.available")}
                  </Badge>
                )}
              </div>

              {isLoadingRecipe ? (
                <div className="text-sm text-muted-foreground">
                  {tCommon("loading")}...
                </div>
              ) : fullRecipe?.ingredients && fullRecipe.ingredients.length > 0 ? (
                <ul className="space-y-2">
                  {fullRecipe.ingredients.map((ingredient) => {
                    const availability = ingredientAvailability.get(ingredient.id);
                    return (
                      <li
                        key={ingredient.id}
                        className={cn(
                          "flex items-center justify-between py-1.5 px-3 rounded-md text-sm",
                          availability
                            ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                            : "bg-muted/50"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {availability && (
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          )}
                          <span className={cn(availability && "text-green-700 dark:text-green-300")}>
                            {ingredient.quantity && (
                              <span className="font-medium">{ingredient.quantity}</span>
                            )}{" "}
                            {ingredient.unit && <span>{ingredient.unit}</span>}{" "}
                            {ingredient.ingredient_name}
                          </span>
                        </span>
                        {availability && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs ml-2",
                              availability === "pantry"
                                ? "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                                : "border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300"
                            )}
                          >
                            {availability === "pantry" ? (
                              <>
                                <Package className="h-3 w-3 mr-1" />
                                {t("viewRecipe.inPantry")}
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                {t("viewRecipe.inGroceries")}
                              </>
                            )}
                          </Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("viewRecipe.noIngredients")}
                </p>
              )}
            </div>

            <Separator />

            {/* Instructions Section */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <ChefHat className="h-5 w-5" />
                {t("instructions")}
              </h3>

              {isLoadingRecipe ? (
                <div className="text-sm text-muted-foreground">
                  {tCommon("loading")}...
                </div>
              ) : fullRecipe?.instructions_json &&
                fullRecipe.instructions_json.length > 0 ? (
                <ol className="space-y-4">
                  {fullRecipe.instructions_json.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">
                        {step.step || index + 1}
                      </span>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm">{step.text}</p>
                        {step.duration_minutes && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {step.duration_minutes} {tCommon("minutes")}
                          </p>
                        )}
                        {step.tip && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                            💡 {step.tip}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : fullRecipe?.instructions ? (
                (() => {
                  const steps = parseInstructionsToSteps(fullRecipe.instructions);
                  if (steps.length > 1) {
                    return (
                      <ol className="space-y-3">
                        {steps.map((step, index) => (
                          <li key={index} className="flex gap-3">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">
                              {index + 1}
                            </span>
                            <p className="flex-1 pt-0.5 text-sm">{step}</p>
                          </li>
                        ))}
                      </ol>
                    );
                  }
                  return (
                    <div className="text-sm whitespace-pre-wrap">
                      {fullRecipe.instructions}
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("viewRecipe.noInstructions")}
                </p>
              )}
            </div>

            {/* Nutrition Section */}
            {fullRecipe?.nutrition && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    {t("viewRecipe.nutrition")}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {fullRecipe.nutrition.calories && (
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">
                          {fullRecipe.nutrition.calories}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("viewRecipe.calories")}
                        </p>
                      </div>
                    )}
                    {fullRecipe.nutrition.protein_g && (
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">
                          {fullRecipe.nutrition.protein_g}g
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("viewRecipe.protein")}
                        </p>
                      </div>
                    )}
                    {fullRecipe.nutrition.carbs_g && (
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">
                          {fullRecipe.nutrition.carbs_g}g
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("viewRecipe.carbs")}
                        </p>
                      </div>
                    )}
                    {fullRecipe.nutrition.fat_g && (
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">
                          {fullRecipe.nutrition.fat_g}g
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("viewRecipe.fat")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Kitchen Equipment Section */}
            {fullRecipe?.required_equipment && fullRecipe.required_equipment.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      {t("viewRecipe.requiredEquipment")}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({totalEquipment})
                      </span>
                    </h3>
                    {totalEquipment > 0 && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          availableEquipmentCount === totalEquipment
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : availableEquipmentCount > 0
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            : ""
                        )}
                      >
                        {availableEquipmentCount === totalEquipment ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : availableEquipmentCount < totalEquipment ? (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        ) : null}
                        {availableEquipmentCount}/{totalEquipment} {t("viewRecipe.available")}
                      </Badge>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {fullRecipe.required_equipment.map((eq, index) => {
                      const availability = equipmentAvailability.get(eq.equipment_name);
                      const isAvailable = availability?.available ?? false;
                      return (
                        <li
                          key={index}
                          className={cn(
                            "flex items-center justify-between py-1.5 px-3 rounded-md text-sm",
                            isAvailable
                              ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                              : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {isAvailable ? (
                              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                            <span className={cn(
                              isAvailable
                                ? "text-green-700 dark:text-green-300"
                                : "text-red-700 dark:text-red-300"
                            )}>
                              {eq.equipment_name}
                              {!eq.is_required && (
                                <span className="text-muted-foreground ml-1">
                                  ({t("viewRecipe.optional")})
                                </span>
                              )}
                            </span>
                          </span>
                          <div className="flex items-center gap-2">
                            {eq.category && (
                              <Badge variant="outline" className="text-xs">
                                {eq.category}
                              </Badge>
                            )}
                            {!isAvailable && eq.substitute_note && (
                              <span className="text-xs text-muted-foreground italic">
                                {eq.substitute_note}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}

            {/* Techniques Section */}
            {fullRecipe?.techniques && fullRecipe.techniques.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      {t("viewRecipe.techniques")}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({totalTechniques})
                      </span>
                    </h3>
                    {totalTechniques > 0 && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          knownTechniquesCount === totalTechniques
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : knownTechniquesCount > 0
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            : ""
                        )}
                      >
                        {knownTechniquesCount === totalTechniques ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : knownTechniquesCount < totalTechniques ? (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        ) : null}
                        {knownTechniquesCount}/{totalTechniques} {t("viewRecipe.known")}
                      </Badge>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {fullRecipe.techniques.map((tech, index) => {
                      const availability = techniqueAvailability.get(tech.skill_name);
                      const isKnown = availability?.known ?? false;
                      const proficiency = availability?.proficiency;
                      return (
                        <li
                          key={index}
                          className={cn(
                            "flex items-start justify-between py-2 px-3 rounded-md text-sm",
                            isKnown
                              ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                              : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {isKnown ? (
                              <Check className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-400" />
                            ) : (
                              <Lightbulb className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400" />
                            )}
                            <div>
                              <span
                                className={cn(
                                  "font-medium",
                                  isKnown
                                    ? "text-green-700 dark:text-green-300"
                                    : "text-amber-700 dark:text-amber-300"
                                )}
                              >
                                {tech.skill_name}
                              </span>
                              {tech.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {tech.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isKnown && proficiency && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs border-green-300 text-green-700 dark:border-green-700 dark:text-green-300"
                                )}
                              >
                                {proficiency}
                              </Badge>
                            )}
                            {!isKnown && (
                              <Badge
                                variant="outline"
                                className="text-xs border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"
                              >
                                {t("viewRecipe.toLearn")}
                              </Badge>
                            )}
                            {tech.difficulty && (
                              <Badge
                                className={cn(
                                  "text-xs",
                                  tech.difficulty === "beginner"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                    : tech.difficulty === "intermediate"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                )}
                              >
                                {tech.difficulty}
                              </Badge>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}

            {/* Seasonality Section */}
            {((fullRecipe?.seasonal_info && fullRecipe.seasonal_info.length > 0) ||
              (fullRecipe?.best_season_months && fullRecipe.best_season_months.length > 0)) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <Leaf className="h-5 w-5" />
                    {t("viewRecipe.seasonality")}
                  </h3>

                  {/* Best Season Banner */}
                  {fullRecipe.best_season_months && fullRecipe.best_season_months.length > 0 && (
                    <div
                      className={cn(
                        "mb-4 p-3 rounded-lg flex items-center gap-3",
                        isInPeakSeason(fullRecipe.best_season_months)
                          ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                          : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                      )}
                    >
                      <Sun
                        className={cn(
                          "h-5 w-5",
                          isInPeakSeason(fullRecipe.best_season_months)
                            ? "text-green-600 dark:text-green-400"
                            : "text-amber-600 dark:text-amber-400"
                        )}
                      />
                      <div>
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isInPeakSeason(fullRecipe.best_season_months)
                              ? "text-green-700 dark:text-green-300"
                              : "text-amber-700 dark:text-amber-300"
                          )}
                        >
                          {isInPeakSeason(fullRecipe.best_season_months)
                            ? t("viewRecipe.inSeason")
                            : t("viewRecipe.bestMadeIn")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatMonthRange(fullRecipe.best_season_months)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Seasonal Ingredients */}
                  {fullRecipe.seasonal_info && fullRecipe.seasonal_info.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">
                        {t("viewRecipe.seasonalIngredients")}
                      </p>
                      {fullRecipe.seasonal_info.map((item, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-start justify-between py-2 px-3 rounded-md text-sm",
                            isInPeakSeason(item.peak_months)
                              ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                              : "bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {isInPeakSeason(item.peak_months) && (
                              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                            )}
                            <span
                              className={cn(
                                isInPeakSeason(item.peak_months) &&
                                  "text-green-700 dark:text-green-300"
                              )}
                            >
                              {item.ingredient_name}
                            </span>
                          </div>
                          <div className="text-right">
                            {item.peak_months && item.peak_months.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {t("viewRecipe.peakSeason")}: {formatMonthRange(item.peak_months)}
                              </p>
                            )}
                            {item.substitute_out_of_season && !isInPeakSeason(item.peak_months) && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                {t("viewRecipe.substitute")}: {item.substitute_out_of_season}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Tags */}
            {fullRecipe?.tags && fullRecipe.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t("tags")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {fullRecipe.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {fullRecipe?.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t("notes")}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {fullRecipe.notes}
                  </p>
                </div>
              </>
            )}

            {/* Source */}
            {(fullRecipe?.source || fullRecipe?.source_url) && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{t("viewRecipe.source")}:</span>
                  {fullRecipe.source_url ? (
                    <a
                      href={fullRecipe.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {fullRecipe.source || fullRecipe.source_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span>{fullRecipe.source}</span>
                  )}
                </div>
              </>
            )}

            {/* Created/Updated */}
            <div className="text-xs text-muted-foreground pt-2">
              {t("viewRecipe.added")}: {format(new Date(recipe.created_at), "PPP")}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
