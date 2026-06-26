"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Carrot,
  ShoppingCart,
  ChefHat,
  Leaf,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetRecipesQuery } from "@/lib/api/recipes-api";
import { useGetPantryItemsQuery } from "@/lib/api/pantry-api";
import { useGetGroceriesQuery } from "@/lib/api/groceries-api";
import type { SeasonalProduce } from "@/lib/api/seasonality-api";

interface SeasonalityInsightsProps {
  seasonalProduce: SeasonalProduce[];
  currentMonth: number;
  onNavigateToPantry?: () => void;
  onNavigateToGroceries?: () => void;
  onNavigateToRecipes?: () => void;
  onPantryClick?: (ingredientName: string) => void;
  onGroceryClick?: (itemName: string) => void;
  onRecipeClick?: (recipeName: string) => void;
  onAddToShoppingList?: (items: { name: string; category?: string }[]) => void;
}

// Normalize text for matching
function normalizeText(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

// Season names by month
const SEASONS: Record<number, string> = {
  1: "winter", 2: "winter", 3: "spring",
  4: "spring", 5: "spring", 6: "summer",
  7: "summer", 8: "summer", 9: "autumn",
  10: "autumn", 11: "autumn", 12: "winter",
};

export function SeasonalityInsights({
  seasonalProduce,
  currentMonth,
  onNavigateToPantry,
  onNavigateToGroceries,
  onNavigateToRecipes,
  onPantryClick,
  onGroceryClick,
  onRecipeClick,
  onAddToShoppingList,
}: SeasonalityInsightsProps) {
  const t = useTranslations("seasonality.insights");

  // Get pantry items to find seasonal matches
  const { data: pantryData } = useGetPantryItemsQuery({
    per_page: 100,
    is_archived: false,
  });

  // Get groceries to suggest seasonal items
  const { data: groceriesData } = useGetGroceriesQuery({
    per_page: 100,
    is_archived: false,
  });

  // Get recipes to find seasonal matches
  const { data: recipesData } = useGetRecipesQuery({
    per_page: 100,
    is_archived: false,
  });

  // Find pantry items that are in season (peak or regular)
  const pantrySeasonalMatches = useMemo(() => {
    if (!pantryData?.items || !seasonalProduce.length) return [];

    const matches: Array<{
      pantryItem: string;
      seasonalName: string;
      isPeak: boolean;
      recipeIdeas: string[];
    }> = [];

    // Include all in-season produce, prioritize peak
    const inSeasonProduce = seasonalProduce
      .filter((p) => p.is_in_season || p.is_peak_season)
      .sort((a, b) => {
        if (a.is_peak_season && !b.is_peak_season) return -1;
        if (!a.is_peak_season && b.is_peak_season) return 1;
        return 0;
      });

    for (const pantryItem of pantryData.items) {
      const pantryNormalized = normalizeText(pantryItem.item_name);

      for (const produce of inSeasonProduce) {
        const produceNormalized = normalizeText(produce.name);

        // More flexible matching - check if words overlap
        const pantryWords = pantryNormalized.split(" ");
        const produceWords = produceNormalized.split(" ");

        const hasMatch =
          pantryNormalized.includes(produceNormalized) ||
          produceNormalized.includes(pantryNormalized) ||
          pantryWords.some(pw => produceWords.some(prw => pw.length > 2 && prw.includes(pw))) ||
          produceWords.some(prw => pantryWords.some(pw => prw.length > 2 && pw.includes(prw)));

        if (hasMatch) {
          // Find recipes that use this ingredient
          const recipeIdeas: string[] = [];
          if (recipesData?.items) {
            for (const recipe of recipesData.items) {
              const recipeNameNormalized = normalizeText(recipe.name);
              const recipeDescNormalized = recipe.description ? normalizeText(recipe.description) : "";
              if (
                recipeNameNormalized.includes(produceNormalized) ||
                recipeDescNormalized.includes(produceNormalized)
              ) {
                recipeIdeas.push(recipe.name);
                if (recipeIdeas.length >= 2) break;
              }
            }
          }

          matches.push({
            pantryItem: pantryItem.item_name,
            seasonalName: produce.name,
            isPeak: produce.is_peak_season,
            recipeIdeas,
          });
          break;
        }
      }
    }

    return matches.slice(0, 5);
  }, [pantryData, seasonalProduce, recipesData]);

  // Find seasonal produce to recommend for groceries - always show what's in season
  const groceryRecommendations = useMemo(() => {
    if (!seasonalProduce.length) return [];

    const recommendations: Array<{
      name: string;
      category: string;
      isPeak: boolean;
      tip: string | null;
    }> = [];

    // Filter to in-season items and prioritize peak season
    const inSeasonProduce = seasonalProduce
      .filter((p) => p.is_in_season || p.is_peak_season)
      .sort((a, b) => {
        if (a.is_peak_season && !b.is_peak_season) return -1;
        if (!a.is_peak_season && b.is_peak_season) return 1;
        return 0;
      });

    for (const produce of inSeasonProduce) {
      recommendations.push({
        name: produce.name,
        category: produce.category,
        isPeak: produce.is_peak_season,
        tip: produce.storage_tips,
      });

      if (recommendations.length >= 6) break;
    }

    return recommendations;
  }, [seasonalProduce]);

  // Find recipes that use seasonal ingredients
  const seasonalRecipes = useMemo(() => {
    if (!recipesData?.items || !seasonalProduce.length) return [];

    const matches: Array<{
      recipeName: string;
      recipeId: string;
      difficulty: string | null;
      seasonalIngredients: string[];
      hasPeak: boolean;
    }> = [];

    // Use all in-season produce for matching
    const inSeasonProduceItems = seasonalProduce.filter(
      (p) => p.is_in_season || p.is_peak_season
    );

    for (const recipe of recipesData.items) {
      const recipeNameNormalized = normalizeText(recipe.name);
      const recipeDescNormalized = recipe.description ? normalizeText(recipe.description) : "";
      const matchedIngredients: Array<{ name: string; isPeak: boolean }> = [];

      for (const produce of inSeasonProduceItems) {
        const produceNormalized = normalizeText(produce.name);

        // Check recipe name and description for seasonal ingredient matches
        if (
          recipeNameNormalized.includes(produceNormalized) ||
          recipeDescNormalized.includes(produceNormalized)
        ) {
          if (!matchedIngredients.some((i) => i.name === produce.name)) {
            matchedIngredients.push({
              name: produce.name,
              isPeak: produce.is_peak_season,
            });
          }
        }
      }

      if (matchedIngredients.length > 0) {
        matches.push({
          recipeName: recipe.name,
          recipeId: recipe.id,
          difficulty: recipe.difficulty,
          seasonalIngredients: matchedIngredients.slice(0, 3).map((i) => i.name),
          hasPeak: matchedIngredients.some((i) => i.isPeak),
        });
      }

      if (matches.length >= 5) break;
    }

    // Sort to prioritize recipes with peak season ingredients
    return matches.sort((a, b) => {
      if (a.hasPeak && !b.hasPeak) return -1;
      if (!a.hasPeak && b.hasPeak) return 1;
      return 0;
    });
  }, [recipesData, seasonalProduce]);

  // Don't render if no insights to show
  if (
    pantrySeasonalMatches.length === 0 &&
    groceryRecommendations.length === 0 &&
    seasonalRecipes.length === 0
  ) {
    return null;
  }

  // Count how many cards we have
  const cardCount = [
    pantrySeasonalMatches.length > 0,
    groceryRecommendations.length > 0,
    seasonalRecipes.length > 0,
  ].filter(Boolean).length;

  // Determine grid columns based on card count
  const gridClass =
    cardCount === 1
      ? "grid gap-4"
      : cardCount === 2
      ? "grid gap-4 md:grid-cols-2"
      : "grid gap-4 md:grid-cols-2 lg:grid-cols-3";

  const currentSeason = SEASONS[currentMonth];

  return (
    <div className={gridClass}>
      {/* Pantry - Peak Season Ingredients You Have */}
      {pantrySeasonalMatches.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-4 flex flex-col">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/50">
                  <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                    {t("pantry.title")}
                  </h3>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    {t("pantry.subtitle")}
                  </p>
                </div>
              </div>
              {onNavigateToPantry && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-orange-700 hover:text-orange-800 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900/50"
                  onClick={onNavigateToPantry}
                >
                  <Carrot className="h-4 w-4 mr-1" />
                  {t("pantry.viewAll")}
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {pantrySeasonalMatches.map(({ pantryItem, seasonalName, recipeIdeas }) => (
                <li
                  key={pantryItem}
                  className="p-2 rounded-md bg-white/60 dark:bg-white/5"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 text-xs cursor-pointer"
                        onClick={() => onPantryClick?.(pantryItem)}
                      >
                        {pantryItem}
                      </Badge>
                      <span className="text-xs text-orange-600 dark:text-orange-400">
                        {t("pantry.peakNow")}
                      </span>
                    </div>
                    {recipeIdeas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {t("pantry.tryRecipe")}:
                        </span>
                        {recipeIdeas.map((recipe) => (
                          <Badge
                            key={recipe}
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30"
                            onClick={() => onRecipeClick?.(recipe)}
                          >
                            {recipe}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {t("pantry.tip")}
          </p>
        </div>
      )}

      {/* Groceries - What's In Season Now */}
      {groceryRecommendations.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 flex flex-col">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
                  <ShoppingCart className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    {t("groceries.title")}
                  </h3>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {t("groceries.subtitle", { season: currentSeason })}
                  </p>
                </div>
              </div>
              {onNavigateToGroceries && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-700 hover:text-green-800 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/50"
                  onClick={onNavigateToGroceries}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  {t("groceries.viewAll")}
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {groceryRecommendations.slice(0, 4).map(({ name, isPeak, category }) => (
                <li
                  key={name}
                  className="p-2 rounded-md bg-white/60 dark:bg-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs cursor-pointer ${
                        isPeak
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                      }`}
                      onClick={() => onGroceryClick?.(name)}
                    >
                      {name}
                      {isPeak && " ⭐"}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">
                      {category}
                    </span>
                  </div>
                  {onAddToShoppingList && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onAddToShoppingList([{ name, category: "produce" }])}
                    >
                      <ShoppingCart className="h-3 w-3" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <Leaf className="h-3 w-3" />
            {t("groceries.tip")}
          </p>
        </div>
      )}

      {/* Recipes - Seasonal Recipe Suggestions */}
      {seasonalRecipes.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4 flex flex-col">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                  <ChefHat className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">
                    {t("recipes.title")}
                  </h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {t("recipes.subtitle")}
                  </p>
                </div>
              </div>
              {onNavigateToRecipes && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                  onClick={onNavigateToRecipes}
                >
                  <ChefHat className="h-4 w-4 mr-1" />
                  {t("recipes.viewAll")}
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {seasonalRecipes.map(({ recipeName, difficulty, seasonalIngredients }) => (
                <li
                  key={recipeName}
                  className="p-2 rounded-md bg-white/60 dark:bg-white/5 cursor-pointer hover:bg-white/80 dark:hover:bg-white/10"
                  onClick={() => onRecipeClick?.(recipeName)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                        {recipeName}
                      </span>
                      {difficulty && (
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            difficulty === "easy"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                              : difficulty === "hard"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
                          }`}
                        >
                          {difficulty}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground">
                        {t("recipes.uses")}:
                      </span>
                      {seasonalIngredients.map((ingredient) => (
                        <Badge
                          key={ingredient}
                          variant="outline"
                          className="text-xs bg-orange-50 dark:bg-orange-900/20"
                        >
                          {ingredient} ⭐
                        </Badge>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {t("recipes.tip")}
          </p>
        </div>
      )}
    </div>
  );
}
