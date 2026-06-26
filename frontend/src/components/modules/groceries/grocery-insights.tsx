"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Leaf,
  Calendar,
  ShoppingCart,
  AlertTriangle,
  ChefHat,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetSeasonalProduceQuery,
  useGetUserSeasonalPreferencesQuery,
} from "@/lib/api/seasonality-api";
import { useGetCurrentWeekPlanQuery } from "@/lib/api/meal-planner-api";
import type { Grocery } from "@/lib/api/groceries-api";

interface GroceryInsightsProps {
  groceryItems: Grocery[];
  onNavigateToSeasonality?: () => void;
  onNavigateToMealPlanner?: () => void;
}

// Normalize text for matching
function normalizeText(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

// Get significant words (skip common words)
const STOP_WORDS = new Set([
  "fresh", "dried", "ground", "chopped", "minced", "sliced", "diced",
  "whole", "large", "small", "medium", "extra", "virgin", "organic",
  "raw", "cooked", "frozen", "canned", "ripe", "unripe",
]);

function getSignificantWords(name: string): string[] {
  const normalized = normalizeText(name);
  return normalized
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

// Check if names match
function namesMatch(name1: string, name2: string): boolean {
  const normalized1 = normalizeText(name1);
  const normalized2 = normalizeText(name2);

  // Exact match
  if (normalized1 === normalized2) return true;

  const words1 = getSignificantWords(name1);
  const words2 = getSignificantWords(name2);

  if (words1.length === 0 || words2.length === 0) return false;

  // Check if all significant words from one appear in the other
  const allWords1InWords2 = words1.every((w1) =>
    words2.some(
      (w2) =>
        w2 === w1 ||
        w2 === w1 + "s" ||
        w2 === w1 + "es" ||
        w1 === w2 + "s" ||
        w1 === w2 + "es"
    )
  );

  const allWords2InWords1 = words2.every((w2) =>
    words1.some(
      (w1) =>
        w1 === w2 ||
        w1 === w2 + "s" ||
        w1 === w2 + "es" ||
        w2 === w1 + "s" ||
        w2 === w1 + "es"
    )
  );

  return allWords1InWords2 || allWords2InWords1;
}

export function GroceryInsights({
  groceryItems,
  onNavigateToSeasonality,
  onNavigateToMealPlanner,
}: GroceryInsightsProps) {
  const t = useTranslations("groceries.insights");

  // Get user's seasonal preferences for country code
  const { data: preferences } = useGetUserSeasonalPreferencesQuery();
  const countryCode = preferences?.country_code || "US";

  // Get seasonal produce for current month
  const currentMonth = new Date().getMonth() + 1;
  const { data: seasonalData } = useGetSeasonalProduceQuery({
    country_code: countryCode,
    month: currentMonth,
    per_page: 100,
  });

  // Get current week meal plan
  const { data: currentWeekPlan } = useGetCurrentWeekPlanQuery();

  // Find grocery items that are out of season (available but not peak)
  const outOfSeasonItems = useMemo(() => {
    if (!seasonalData?.items || !groceryItems.length) return [];

    const matches: Array<{
      groceryItem: Grocery;
      produceName: string;
      availableMonths: number[];
    }> = [];

    // Categories to check for seasonality
    const seasonalCategories = ["produce", "dairy", "seafood", "meat"];

    for (const groceryItem of groceryItems) {
      // Only check relevant categories
      if (!groceryItem.category || !seasonalCategories.includes(groceryItem.category)) continue;

      for (const produce of seasonalData.items) {
        // Match against both name and name_local
        const matchesName = namesMatch(groceryItem.item_name, produce.name);
        const matchesLocalName = produce.name_local && namesMatch(groceryItem.item_name, produce.name_local);

        if (matchesName || matchesLocalName) {
          // Check if current month is NOT in peak months but IS in available months
          const isAvailable = produce.available_months?.includes(currentMonth);
          const isPeak = produce.peak_months?.includes(currentMonth);

          if (isAvailable && !isPeak) {
            matches.push({
              groceryItem,
              produceName: produce.name_local || produce.name,
              availableMonths: produce.peak_months || [],
            });
          }
          break;
        }
      }
    }

    return matches.slice(0, 5); // Show max 5
  }, [groceryItems, seasonalData, currentMonth]);

  // Get upcoming meals info from current week plan
  const upcomingMealsInfo = useMemo(() => {
    if (!currentWeekPlan?.meals) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter meals from today onwards
    const upcomingMeals = currentWeekPlan.meals.filter((meal) => {
      const mealDate = new Date(meal.date);
      mealDate.setHours(0, 0, 0, 0);
      return mealDate >= today;
    });

    if (upcomingMeals.length === 0) return null;

    // Get unique recipes
    const uniqueRecipes = new Set(
      upcomingMeals
        .filter((m) => m.recipe_name)
        .map((m) => m.recipe_name)
    );

    return {
      mealCount: upcomingMeals.length,
      recipeCount: uniqueRecipes.size,
      planName: currentWeekPlan.name,
      planId: currentWeekPlan.id,
    };
  }, [currentWeekPlan]);

  // Don't render if no insights to show
  if (outOfSeasonItems.length === 0 && !upcomingMealsInfo) {
    return null;
  }

  // Use full width if only one card, otherwise 50/50
  const hasBothCards = outOfSeasonItems.length > 0 && upcomingMealsInfo !== null;

  return (
    <div className={hasBothCards ? "grid gap-4 md:grid-cols-2" : "grid gap-4"}>
      {/* Out of Season Warning */}
      {outOfSeasonItems.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
                <Leaf className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                  {t("outOfSeason.title")}
                </h3>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t("outOfSeason.subtitle")}
                </p>
              </div>
            </div>
            {onNavigateToSeasonality && (
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50"
                onClick={onNavigateToSeasonality}
              >
                <Leaf className="h-4 w-4 mr-1" />
                {t("outOfSeason.viewSeasonality")}
              </Button>
            )}
          </div>
          <ul className="space-y-2">
            {outOfSeasonItems.map(({ groceryItem, produceName }) => (
              <li
                key={groceryItem.id}
                className="flex items-center justify-between p-2 rounded-md bg-white/60 dark:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {groceryItem.item_name}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-xs"
                >
                  {t("outOfSeason.mayCostMore")}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Leaf className="h-3 w-3" />
            {t("outOfSeason.tip")}
          </p>
        </div>
      )}

      {/* Meal Planner - Upcoming Meals */}
      {upcomingMealsInfo && (
        <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                  {t("mealPlanner.title")}
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {t("mealPlanner.subtitle")}
                </p>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-md bg-white/60 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {upcomingMealsInfo.planName}
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  {t("mealPlanner.mealsPlanned", { count: upcomingMealsInfo.mealCount })}
                  {upcomingMealsInfo.recipeCount > 0 && (
                    <> · {t("mealPlanner.recipesCount", { count: upcomingMealsInfo.recipeCount })}</>
                  )}
                </span>
              </div>
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs"
              >
                {t("mealPlanner.thisWeek")}
              </Badge>
            </div>
          </div>
          {onNavigateToMealPlanner && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 text-blue-700 border-blue-200 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/30"
              onClick={onNavigateToMealPlanner}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {t("mealPlanner.generateShoppingList")}
            </Button>
          )}
          <p className="mt-3 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <ChefHat className="h-3 w-3" />
            {t("mealPlanner.tip")}
          </p>
        </div>
      )}
    </div>
  );
}
