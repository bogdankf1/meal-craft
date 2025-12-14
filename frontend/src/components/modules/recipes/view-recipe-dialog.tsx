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

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-6">
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
                <div className="text-sm whitespace-pre-wrap">
                  {fullRecipe.instructions}
                </div>
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
