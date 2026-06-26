"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ChefHat,
  GraduationCap,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetRecipesQuery } from "@/lib/api/recipes-api";
import { useGetUserSkillsQuery } from "@/lib/api/learning-api";
import type { RestaurantMeal } from "@/lib/api/restaurants-api";

interface RestaurantsInsightsProps {
  meals: RestaurantMeal[];
  onNavigateToRecipes?: () => void;
  onNavigateToLearning?: () => void;
  onRecipeClick?: (recipeName: string) => void;
  onSkillClick?: (skillName: string) => void;
}

// Normalize text for matching
function normalizeText(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

// Common cooking techniques/skills that might be in dish names
const COOKING_TECHNIQUES = [
  { keywords: ["grilled", "grill", "bbq", "barbecue"], skill: "Grilling" },
  { keywords: ["fried", "fry", "deep-fried", "pan-fried", "stir-fried"], skill: "Frying" },
  { keywords: ["roasted", "roast"], skill: "Roasting" },
  { keywords: ["baked", "bake"], skill: "Baking" },
  { keywords: ["steamed", "steam"], skill: "Steaming" },
  { keywords: ["braised", "braise"], skill: "Braising" },
  { keywords: ["sauteed", "saute", "sautéed"], skill: "Sautéing" },
  { keywords: ["poached", "poach"], skill: "Poaching" },
  { keywords: ["smoked", "smoke"], skill: "Smoking" },
  { keywords: ["seared", "sear"], skill: "Searing" },
  { keywords: ["blanched", "blanch"], skill: "Blanching" },
  { keywords: ["julienne", "julienned"], skill: "Knife Skills" },
  { keywords: ["minced", "diced", "chopped", "sliced"], skill: "Knife Skills" },
  { keywords: ["tempura"], skill: "Tempura" },
  { keywords: ["teriyaki"], skill: "Teriyaki" },
  { keywords: ["curry", "curried"], skill: "Curry Making" },
  { keywords: ["pasta", "spaghetti", "fettuccine", "penne"], skill: "Pasta Making" },
  { keywords: ["soup", "broth", "stock"], skill: "Soup Making" },
  { keywords: ["sauce", "gravy"], skill: "Sauce Making" },
  { keywords: ["marinated", "marinade"], skill: "Marinating" },
  { keywords: ["stuffed"], skill: "Stuffing Techniques" },
  { keywords: ["breaded", "crusted"], skill: "Breading" },
  { keywords: ["fermented", "pickled"], skill: "Fermentation" },
  { keywords: ["tartare", "ceviche", "sashimi"], skill: "Raw Preparation" },
  { keywords: ["risotto"], skill: "Risotto" },
  { keywords: ["stew", "stewed"], skill: "Stewing" },
];

export function RestaurantsInsights({
  meals,
  onNavigateToRecipes,
  onNavigateToLearning,
  onRecipeClick,
  onSkillClick,
}: RestaurantsInsightsProps) {
  const t = useTranslations("restaurants.insights");

  // Get recipes to find similar ones
  const { data: recipesData } = useGetRecipesQuery({
    per_page: 100,
    is_archived: false,
  });

  // Get user skills to suggest learning
  const { data: skillsData } = useGetUserSkillsQuery({
    per_page: 100,
  });

  // Find recipes similar to restaurant meals
  const recipeMatches = useMemo(() => {
    if (!meals.length || !recipesData?.items) return [];

    const matches: Array<{
      mealName: string;
      restaurantName: string;
      similarRecipes: Array<{ name: string; id: string; difficulty: string | null }>;
    }> = [];

    // Get unique meal items
    const mealItems: Array<{ name: string; restaurant: string }> = [];
    for (const meal of meals) {
      if (meal.items_ordered) {
        for (const item of meal.items_ordered) {
          mealItems.push({ name: item, restaurant: meal.restaurant_name });
        }
      }
      // Also use the meal description as a potential dish name
      if (meal.description) {
        mealItems.push({ name: meal.description, restaurant: meal.restaurant_name });
      }
    }

    // Deduplicate and limit
    const uniqueMealItems = mealItems
      .filter((item, index, self) =>
        index === self.findIndex((t) => normalizeText(t.name) === normalizeText(item.name))
      )
      .slice(0, 10);

    for (const mealItem of uniqueMealItems) {
      const mealNormalized = normalizeText(mealItem.name);
      const mealWords = mealNormalized.split(" ").filter((w) => w.length > 2);

      const similarRecipes: Array<{ name: string; id: string; difficulty: string | null }> = [];

      for (const recipe of recipesData.items) {
        const recipeNormalized = normalizeText(recipe.name);
        const recipeWords = recipeNormalized.split(" ");

        // Check for word overlap (at least 2 words or main ingredient match)
        const matchingWords = mealWords.filter((mw) =>
          recipeWords.some((rw) => rw.includes(mw) || mw.includes(rw))
        );

        if (matchingWords.length >= 2 ||
            recipeNormalized.includes(mealNormalized) ||
            mealNormalized.includes(recipeNormalized)) {
          similarRecipes.push({
            name: recipe.name,
            id: recipe.id,
            difficulty: recipe.difficulty,
          });
        }

        if (similarRecipes.length >= 2) break;
      }

      if (similarRecipes.length > 0) {
        matches.push({
          mealName: mealItem.name,
          restaurantName: mealItem.restaurant,
          similarRecipes,
        });
      }

      if (matches.length >= 4) break;
    }

    return matches;
  }, [meals, recipesData]);

  // Find techniques used in restaurant dishes to learn
  const techniquesToLearn = useMemo(() => {
    if (!meals.length) return [];

    const techniqueMatches: Map<string, { dishes: string[]; restaurants: Set<string> }> = new Map();

    // Get all dish names and descriptions
    const allDishText: Array<{ text: string; restaurant: string }> = [];
    for (const meal of meals) {
      if (meal.items_ordered) {
        for (const item of meal.items_ordered) {
          allDishText.push({ text: item, restaurant: meal.restaurant_name });
        }
      }
      if (meal.description) {
        allDishText.push({ text: meal.description, restaurant: meal.restaurant_name });
      }
    }

    // Find matching techniques
    for (const { text, restaurant } of allDishText) {
      const textNormalized = normalizeText(text);

      for (const technique of COOKING_TECHNIQUES) {
        for (const keyword of technique.keywords) {
          if (textNormalized.includes(keyword)) {
            const existing = techniqueMatches.get(technique.skill);
            if (existing) {
              if (!existing.dishes.includes(text)) {
                existing.dishes.push(text);
              }
              existing.restaurants.add(restaurant);
            } else {
              techniqueMatches.set(technique.skill, {
                dishes: [text],
                restaurants: new Set([restaurant]),
              });
            }
            break;
          }
        }
      }
    }

    // Convert to array and check if user already has this skill
    const userSkillNames = new Set(
      (skillsData?.items || []).map((s) => normalizeText(s.skill?.name || ""))
    );

    return Array.from(techniqueMatches.entries())
      .map(([skillName, data]) => ({
        skillName,
        dishes: data.dishes.slice(0, 2),
        hasSkill: userSkillNames.has(normalizeText(skillName)),
      }))
      .sort((a, b) => {
        // Prioritize skills user doesn't have
        if (a.hasSkill && !b.hasSkill) return 1;
        if (!a.hasSkill && b.hasSkill) return -1;
        return 0;
      })
      .slice(0, 5);
  }, [meals, skillsData]);

  // Don't render if no insights to show
  if (recipeMatches.length === 0 && techniquesToLearn.length === 0) {
    return null;
  }

  // Count how many cards we have
  const cardCount = [
    recipeMatches.length > 0,
    techniquesToLearn.length > 0,
  ].filter(Boolean).length;

  // Determine grid columns based on card count
  const gridClass = cardCount === 1 ? "grid gap-4" : "grid gap-4 md:grid-cols-2";

  return (
    <div className={gridClass}>
      {/* Recipes - Recreate dishes at home */}
      {recipeMatches.length > 0 && (
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
                  <BookOpen className="h-4 w-4 mr-1" />
                  {t("recipes.viewAll")}
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {recipeMatches.map(({ mealName, restaurantName, similarRecipes }) => (
                <li
                  key={mealName}
                  className="p-2 rounded-md bg-white/60 dark:bg-white/5"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                        {mealName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        @ {restaurantName}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground">
                        {t("recipes.similar")}:
                      </span>
                      {similarRecipes.map((recipe) => (
                        <Badge
                          key={recipe.id}
                          variant="secondary"
                          className={`text-xs cursor-pointer hover:opacity-80 ${
                            recipe.difficulty === "easy"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                              : recipe.difficulty === "hard"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                          }`}
                          onClick={() => onRecipeClick?.(recipe.name)}
                        >
                          {recipe.name}
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

      {/* Learning - Techniques used in dishes */}
      {techniquesToLearn.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 p-4 flex flex-col">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
                  <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-800 dark:text-purple-200">
                    {t("learning.title")}
                  </h3>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {t("learning.subtitle")}
                  </p>
                </div>
              </div>
              {onNavigateToLearning && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-700 hover:text-purple-800 hover:bg-purple-100 dark:text-purple-300 dark:hover:bg-purple-900/50"
                  onClick={onNavigateToLearning}
                >
                  <GraduationCap className="h-4 w-4 mr-1" />
                  {t("learning.viewAll")}
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {techniquesToLearn.map(({ skillName, dishes, hasSkill }) => (
                <li
                  key={skillName}
                  className="p-2 rounded-md bg-white/60 dark:bg-white/5"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs cursor-pointer ${
                          hasSkill
                            ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                        }`}
                        onClick={() => onSkillClick?.(skillName)}
                      >
                        {skillName}
                        {hasSkill && " ✓"}
                      </Badge>
                      {!hasSkill && (
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          {t("learning.newSkill")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("learning.usedIn")}: {dishes.join(", ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {t("learning.tip")}
          </p>
        </div>
      )}
    </div>
  );
}
