"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Carrot,
  ShoppingCart,
  GraduationCap,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetPantryItemsQuery } from "@/lib/api/pantry-api";
import { useGetUserSkillsQuery, useGetSkillsQuery } from "@/lib/api/learning-api";
import type { RecipeListItem } from "@/lib/api/recipes-api";

interface RecipeInsightsProps {
  recipes: RecipeListItem[];
  onNavigateToPantry?: () => void;
  onNavigateToShoppingLists?: () => void;
  onNavigateToLearning?: () => void;
  onPantryClick?: (ingredientName: string) => void;
  onAddToShoppingList?: (items: { name: string; category?: string }[]) => void;
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

// Common cooking techniques that might be in recipe names/descriptions
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
  { keywords: ["tempura"], skill: "Tempura" },
  { keywords: ["teriyaki"], skill: "Teriyaki" },
  { keywords: ["risotto"], skill: "Risotto" },
  { keywords: ["stew", "stewed"], skill: "Stewing" },
  { keywords: ["julienne", "julienned", "minced", "diced", "chopped"], skill: "Knife Skills" },
];

export function RecipeInsights({
  recipes,
  onNavigateToPantry,
  onNavigateToShoppingLists,
  onNavigateToLearning,
  onPantryClick,
  onAddToShoppingList,
  onSkillClick,
}: RecipeInsightsProps) {
  const t = useTranslations("recipes.insights");

  // Get pantry items to check ingredient availability
  const { data: pantryData } = useGetPantryItemsQuery({
    per_page: 100,
    is_archived: false,
  });

  // Get user skills
  const { data: skillsData } = useGetUserSkillsQuery({
    per_page: 100,
  });

  // Get all available skills from library
  const { data: allSkillsData } = useGetSkillsQuery({
    per_page: 100,
  });

  // Find recipes you can make with pantry ingredients
  const recipesWithPantryIngredients = useMemo(() => {
    if (!recipes.length || !pantryData?.items) return [];

    const pantryNormalized = new Set(
      pantryData.items.map((p) => normalizeText(p.item_name))
    );

    const matches: Array<{
      recipeName: string;
      recipeId: string;
      matchedIngredients: string[];
      totalIngredients: number;
      canMake: boolean;
    }> = [];

    for (const recipe of recipes) {
      // Check recipe name and description for pantry ingredient matches
      const recipeText = normalizeText(
        `${recipe.name} ${recipe.description || ""}`
      );

      const matchedIngredients: string[] = [];

      for (const pantryItem of pantryData.items) {
        const itemNormalized = normalizeText(pantryItem.item_name);
        // Only match if it's a significant word (>3 chars) and appears in recipe
        if (itemNormalized.length > 3 && recipeText.includes(itemNormalized)) {
          matchedIngredients.push(pantryItem.item_name);
        }
      }

      if (matchedIngredients.length > 0) {
        matches.push({
          recipeName: recipe.name,
          recipeId: recipe.id,
          matchedIngredients: [...new Set(matchedIngredients)].slice(0, 4),
          totalIngredients: matchedIngredients.length,
          canMake: matchedIngredients.length >= 2, // Assume can make if 2+ ingredients match
        });
      }
    }

    // Sort by number of matched ingredients
    return matches
      .sort((a, b) => b.totalIngredients - a.totalIngredients)
      .slice(0, 4);
  }, [recipes, pantryData]);

  // Find common missing ingredients across recipes
  const missingIngredients = useMemo(() => {
    if (!recipes.length || !pantryData?.items) return [];

    const pantryNormalized = new Set(
      pantryData.items.map((p) => normalizeText(p.item_name))
    );

    // Common staple ingredients that appear in many recipes
    const commonIngredients = [
      "onion", "garlic", "olive oil", "butter", "salt", "pepper",
      "chicken", "beef", "tomato", "tomatoes", "cheese", "cream",
      "flour", "sugar", "eggs", "milk", "lemon", "rice", "pasta",
      "carrot", "celery", "potato", "mushroom", "bell pepper"
    ];

    const ingredientCounts: Map<string, number> = new Map();

    for (const recipe of recipes) {
      const recipeText = normalizeText(
        `${recipe.name} ${recipe.description || ""}`
      );

      for (const ingredient of commonIngredients) {
        if (recipeText.includes(ingredient)) {
          // Check if we have it
          const hasIt = Array.from(pantryNormalized).some(
            (p) => p.includes(ingredient) || ingredient.includes(p)
          );

          if (!hasIt) {
            ingredientCounts.set(
              ingredient,
              (ingredientCounts.get(ingredient) || 0) + 1
            );
          }
        }
      }
    }

    return Array.from(ingredientCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        recipeCount: count,
      }));
  }, [recipes, pantryData]);

  // Find techniques/skills used in recipes (only show skills that exist in library)
  const techniquesInRecipes = useMemo(() => {
    if (!recipes.length || !allSkillsData?.items) return [];

    // Build a map of library skills for matching
    const librarySkills = new Map(
      allSkillsData.items.map((skill) => [normalizeText(skill.name), skill.name])
    );

    const techniqueMatches: Map<string, { recipes: string[]; count: number; libraryName: string }> = new Map();

    for (const recipe of recipes) {
      const recipeText = normalizeText(
        `${recipe.name} ${recipe.description || ""}`
      );

      // First, try to match against COOKING_TECHNIQUES keywords
      for (const technique of COOKING_TECHNIQUES) {
        for (const keyword of technique.keywords) {
          if (recipeText.includes(keyword)) {
            // Check if this technique or related skill exists in library
            const normalizedSkill = normalizeText(technique.skill);
            let libraryName: string | undefined;

            // Direct match
            if (librarySkills.has(normalizedSkill)) {
              libraryName = librarySkills.get(normalizedSkill);
            } else {
              // Try to find a library skill that contains this technique
              for (const [normalizedLibName, originalName] of librarySkills) {
                if (normalizedLibName.includes(normalizedSkill) || normalizedSkill.includes(normalizedLibName)) {
                  libraryName = originalName;
                  break;
                }
              }
            }

            if (libraryName) {
              const existing = techniqueMatches.get(libraryName);
              if (existing) {
                if (!existing.recipes.includes(recipe.name)) {
                  existing.recipes.push(recipe.name);
                  existing.count++;
                }
              } else {
                techniqueMatches.set(libraryName, {
                  recipes: [recipe.name],
                  count: 1,
                  libraryName,
                });
              }
            }
            break;
          }
        }
      }

      // Also check for direct matches against library skill names in recipe text
      for (const [normalizedLibName, originalName] of librarySkills) {
        if (normalizedLibName.length > 4 && recipeText.includes(normalizedLibName)) {
          const existing = techniqueMatches.get(originalName);
          if (existing) {
            if (!existing.recipes.includes(recipe.name)) {
              existing.recipes.push(recipe.name);
              existing.count++;
            }
          } else {
            techniqueMatches.set(originalName, {
              recipes: [recipe.name],
              count: 1,
              libraryName: originalName,
            });
          }
        }
      }
    }

    // Check if user has these skills
    const userSkillNames = new Set(
      (skillsData?.items || []).map((s) => normalizeText(s.skill?.name || ""))
    );

    return Array.from(techniqueMatches.entries())
      .map(([skillName, data]) => ({
        skillName,
        recipeCount: data.count,
        sampleRecipes: data.recipes.slice(0, 2),
        hasSkill: userSkillNames.has(normalizeText(skillName)),
      }))
      .sort((a, b) => {
        // Prioritize skills user doesn't have
        if (a.hasSkill && !b.hasSkill) return 1;
        if (!a.hasSkill && b.hasSkill) return -1;
        return b.recipeCount - a.recipeCount;
      })
      .slice(0, 5);
  }, [recipes, skillsData, allSkillsData]);

  // Don't render if no insights to show
  if (
    recipesWithPantryIngredients.length === 0 &&
    missingIngredients.length === 0 &&
    techniquesInRecipes.length === 0
  ) {
    return null;
  }

  // Count how many cards we have
  const cardCount = [
    recipesWithPantryIngredients.length > 0,
    missingIngredients.length > 0,
    techniquesInRecipes.length > 0,
  ].filter(Boolean).length;

  // Determine grid columns based on card count
  const gridClass =
    cardCount === 1
      ? "grid gap-4"
      : cardCount === 2
      ? "grid gap-4 md:grid-cols-2"
      : "grid gap-4 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={gridClass}>
      {/* Recipes you can make with pantry ingredients */}
      {recipesWithPantryIngredients.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 flex flex-col">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    {t("pantry.title")}
                  </h3>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {t("pantry.subtitle")}
                  </p>
                </div>
              </div>
              {onNavigateToPantry && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-700 hover:text-green-800 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/50"
                  onClick={onNavigateToPantry}
                >
                  <Carrot className="h-4 w-4 mr-1" />
                  {t("pantry.viewAll")}
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {recipesWithPantryIngredients.map(({ recipeName, matchedIngredients, canMake }) => (
                <li
                  key={recipeName}
                  className="p-2 rounded-md bg-muted/50"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        {recipeName}
                      </span>
                      {canMake && (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs"
                        >
                          {t("pantry.canMake")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {matchedIngredients.map((ingredient) => (
                        <Badge
                          key={ingredient}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                          onClick={() => onPantryClick?.(ingredient)}
                        >
                          {ingredient} ✓
                        </Badge>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {t("pantry.tip")}
          </p>
        </div>
      )}

      {/* Missing ingredients to add to shopping list */}
      {missingIngredients.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-4 flex flex-col">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/50">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                    {t("shopping.title")}
                  </h3>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    {t("shopping.subtitle")}
                  </p>
                </div>
              </div>
              {onNavigateToShoppingLists && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-orange-700 hover:text-orange-800 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900/50"
                  onClick={onNavigateToShoppingLists}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  {t("shopping.viewAll")}
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {missingIngredients.map(({ name, recipeCount }) => (
                <li
                  key={name}
                  className="p-2 rounded-md bg-muted/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 text-xs"
                    >
                      {name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {t("shopping.usedIn", { count: recipeCount })}
                    </span>
                  </div>
                  {onAddToShoppingList && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onAddToShoppingList([{ name, category: "groceries" }])}
                    >
                      <ShoppingCart className="h-3 w-3" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {t("shopping.tip")}
          </p>
        </div>
      )}

      {/* Techniques/skills in recipes */}
      {techniquesInRecipes.length > 0 && (
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
              {techniquesInRecipes.map(({ skillName, recipeCount, hasSkill }) => (
                <li
                  key={skillName}
                  className="p-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center justify-between">
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
                      <span className="text-xs text-muted-foreground">
                        {t("learning.inRecipes", { count: recipeCount })}
                      </span>
                    </div>
                    {!hasSkill && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-purple-600 hover:text-purple-800 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/50"
                        onClick={() => onSkillClick?.(skillName)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
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
