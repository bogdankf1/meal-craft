"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ChefHat,
  BookOpen,
  Carrot,
  Wrench,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetRecipesQuery } from "@/lib/api/recipes-api";
import { useGetKitchenEquipmentQuery } from "@/lib/api/kitchen-equipment-api";
import { useGetPantryItemsQuery } from "@/lib/api/pantry-api";
import type { UserSkill } from "@/lib/api/learning-api";

interface LearningInsightsProps {
  userSkills: UserSkill[];
  onNavigateToEquipment?: () => void;
  onNavigateToRecipes?: () => void;
  onNavigateToPantry?: () => void;
  onEquipmentClick?: (equipmentName: string) => void;
  onRecipeClick?: (recipeName: string) => void;
  onPantryClick?: (ingredientName: string) => void;
}

// Normalize text for matching
function normalizeText(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

// Skill to equipment mapping
const SKILL_EQUIPMENT_MAP: Record<string, string[]> = {
  // Knife skills
  "knife": ["knife", "chef knife", "paring knife", "santoku", "cleaver"],
  "cutting": ["knife", "cutting board", "mandoline"],
  "chopping": ["knife", "cutting board"],
  "slicing": ["knife", "mandoline", "slicer"],
  "dicing": ["knife", "cutting board"],
  "julienne": ["knife", "mandoline"],
  "mincing": ["knife", "food processor"],
  // Cooking methods
  "sauteing": ["pan", "skillet", "wok"],
  "braising": ["dutch oven", "braiser", "pot"],
  "roasting": ["oven", "roasting pan", "sheet pan"],
  "grilling": ["grill", "grill pan"],
  "steaming": ["steamer", "pot", "bamboo steamer"],
  "stir frying": ["wok", "skillet"],
  "pan frying": ["skillet", "pan", "cast iron"],
  "deep frying": ["deep fryer", "pot", "thermometer"],
  "poaching": ["pot", "saucepan"],
  "searing": ["cast iron", "skillet", "pan"],
  // Baking
  "baking": ["oven", "baking sheet", "mixing bowl", "stand mixer"],
  "kneading": ["stand mixer", "dough hook", "work surface"],
  "whipping": ["stand mixer", "whisk", "hand mixer"],
  "folding": ["spatula", "mixing bowl"],
  // Sauces
  "emulsifying": ["whisk", "blender", "immersion blender"],
  "reducing": ["saucepan", "pot"],
  "thickening": ["whisk", "saucepan"],
  // Other
  "blending": ["blender", "immersion blender", "food processor"],
  "mixing": ["stand mixer", "mixing bowl", "whisk"],
  "tempering": ["thermometer", "double boiler"],
};

// Skill to ingredient categories mapping
const SKILL_INGREDIENT_MAP: Record<string, string[]> = {
  // Knife skills - practice with these ingredients
  "knife": ["carrot", "onion", "celery", "potato", "cucumber", "tomato"],
  "cutting": ["carrot", "onion", "celery", "bell pepper", "zucchini"],
  "chopping": ["onion", "garlic", "herbs", "parsley", "cilantro"],
  "slicing": ["tomato", "cucumber", "mushroom", "bread", "apple"],
  "dicing": ["onion", "carrot", "celery", "potato", "bell pepper"],
  "julienne": ["carrot", "zucchini", "bell pepper", "cucumber"],
  "mincing": ["garlic", "ginger", "shallot", "herbs"],
  // Cooking methods - good ingredients to practice
  "sauteing": ["mushroom", "onion", "garlic", "spinach", "zucchini"],
  "braising": ["beef", "pork", "chicken", "carrot", "onion"],
  "roasting": ["chicken", "potato", "carrot", "broccoli", "cauliflower"],
  "grilling": ["chicken", "beef", "fish", "vegetable", "corn"],
  "steaming": ["broccoli", "fish", "dumpling", "rice", "vegetable"],
  "stir frying": ["chicken", "beef", "shrimp", "vegetable", "tofu"],
  // Baking
  "baking": ["flour", "sugar", "butter", "egg", "milk"],
  "kneading": ["flour", "yeast", "water", "salt"],
  "whipping": ["cream", "egg white", "butter"],
};

export function LearningInsights({
  userSkills,
  onNavigateToEquipment,
  onNavigateToRecipes,
  onNavigateToPantry,
  onEquipmentClick,
  onRecipeClick,
  onPantryClick,
}: LearningInsightsProps) {
  const t = useTranslations("learning.insights");

  // Get kitchen equipment to find what's needed for skills
  const { data: equipmentData } = useGetKitchenEquipmentQuery({
    per_page: 100,
    is_archived: false,
  });

  // Get recipes to find ones that use skills being learned
  const { data: recipesData } = useGetRecipesQuery({
    per_page: 100,
    is_archived: false,
  });

  // Get pantry items to find practice ingredients
  const { data: pantryData } = useGetPantryItemsQuery({
    per_page: 100,
    is_archived: false,
  });

  // Find equipment needed for user's skills
  const equipmentForSkills = useMemo(() => {
    if (!userSkills.length) return [];

    const matches: Array<{
      skillName: string;
      skillId: string;
      neededEquipment: string[];
      ownedEquipment: string[];
      missingEquipment: string[];
    }> = [];

    const ownedEquipmentNames = new Set(
      (equipmentData?.items || []).map((e) => normalizeText(e.name))
    );

    for (const userSkill of userSkills) {
      const skillName = userSkill.skill?.name || "";
      const skillNormalized = normalizeText(skillName);

      // Find equipment needed for this skill
      const neededEquipment: string[] = [];
      for (const [skillKey, equipmentList] of Object.entries(SKILL_EQUIPMENT_MAP)) {
        if (skillNormalized.includes(skillKey)) {
          neededEquipment.push(...equipmentList);
          break;
        }
      }

      if (neededEquipment.length === 0) continue;

      // Check which equipment user owns
      const ownedEquipment: string[] = [];
      const missingEquipment: string[] = [];

      for (const equip of neededEquipment) {
        const equipNormalized = normalizeText(equip);
        const owned = Array.from(ownedEquipmentNames).some(
          (owned) => owned.includes(equipNormalized) || equipNormalized.includes(owned)
        );
        if (owned) {
          ownedEquipment.push(equip);
        } else {
          missingEquipment.push(equip);
        }
      }

      // Only include if there's something to show
      if (neededEquipment.length > 0) {
        matches.push({
          skillName,
          skillId: userSkill.id,
          neededEquipment: [...new Set(neededEquipment)],
          ownedEquipment: [...new Set(ownedEquipment)],
          missingEquipment: [...new Set(missingEquipment)],
        });
      }
    }

    return matches.slice(0, 5);
  }, [userSkills, equipmentData]);

  // Find recipes that help practice user's skills
  const recipesForSkills = useMemo(() => {
    if (!userSkills.length || !recipesData?.items) return [];

    const matches: Array<{
      skillName: string;
      skillId: string;
      recipes: Array<{ name: string; id: string; difficulty: string | null }>;
    }> = [];

    for (const userSkill of userSkills) {
      const skillName = userSkill.skill?.name || "";
      const skillNormalized = normalizeText(skillName);

      const matchingRecipes: Array<{ name: string; id: string; difficulty: string | null }> = [];

      for (const recipe of recipesData.items) {
        // Check recipe name for skill keywords
        const recipeNameNormalized = normalizeText(recipe.name);
        if (recipeNameNormalized.includes(skillNormalized)) {
          if (!matchingRecipes.some((r) => r.id === recipe.id)) {
            matchingRecipes.push({
              name: recipe.name,
              id: recipe.id,
              difficulty: recipe.difficulty,
            });
          }
        }

        // Check description for skill keywords
        if (recipe.description) {
          const descriptionNormalized = normalizeText(recipe.description);
          if (descriptionNormalized.includes(skillNormalized)) {
            if (!matchingRecipes.some((r) => r.id === recipe.id)) {
              matchingRecipes.push({
                name: recipe.name,
                id: recipe.id,
                difficulty: recipe.difficulty,
              });
            }
          }
        }

        // Check if recipe uses equipment related to the skill
        if (recipe.required_equipment) {
          for (const equipment of recipe.required_equipment) {
            const equipmentNormalized = normalizeText(equipment.equipment_name);
            // Match skill keywords with equipment (e.g., "knife skills" -> "chef knife")
            if (
              skillNormalized.includes(equipmentNormalized) ||
              equipmentNormalized.includes(skillNormalized.split(" ")[0])
            ) {
              if (!matchingRecipes.some((r) => r.id === recipe.id)) {
                matchingRecipes.push({
                  name: recipe.name,
                  id: recipe.id,
                  difficulty: recipe.difficulty,
                });
              }
              break;
            }
          }
        }
      }

      if (matchingRecipes.length > 0) {
        // Sort by difficulty: beginner -> intermediate -> advanced
        const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
        matchingRecipes.sort((a, b) => {
          const aOrder = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] ?? 1;
          const bOrder = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] ?? 1;
          return aOrder - bOrder;
        });

        matches.push({
          skillName,
          skillId: userSkill.id,
          recipes: matchingRecipes.slice(0, 3),
        });
      }
    }

    return matches.slice(0, 5);
  }, [userSkills, recipesData]);

  // Find pantry ingredients to practice skills
  const ingredientsForSkills = useMemo(() => {
    if (!userSkills.length || !pantryData?.items) return [];

    const matches: Array<{
      skillName: string;
      skillId: string;
      ingredients: string[];
    }> = [];

    const pantryItemNames = pantryData.items.map((item) => normalizeText(item.item_name));

    for (const userSkill of userSkills) {
      const skillName = userSkill.skill?.name || "";
      const skillNormalized = normalizeText(skillName);

      // Find practice ingredients for this skill
      const practiceIngredients: string[] = [];
      for (const [skillKey, ingredientList] of Object.entries(SKILL_INGREDIENT_MAP)) {
        if (skillNormalized.includes(skillKey)) {
          // Check which ingredients user has in pantry
          for (const ingredient of ingredientList) {
            const ingredientNormalized = normalizeText(ingredient);
            const hasIngredient = pantryItemNames.some(
              (pantryItem) =>
                pantryItem.includes(ingredientNormalized) ||
                ingredientNormalized.includes(pantryItem)
            );
            if (hasIngredient) {
              practiceIngredients.push(ingredient);
            }
          }
          break;
        }
      }

      if (practiceIngredients.length > 0) {
        matches.push({
          skillName,
          skillId: userSkill.id,
          ingredients: [...new Set(practiceIngredients)].slice(0, 4),
        });
      }
    }

    return matches.slice(0, 5);
  }, [userSkills, pantryData]);

  // Don't render if no insights to show
  if (
    equipmentForSkills.length === 0 &&
    recipesForSkills.length === 0 &&
    ingredientsForSkills.length === 0
  ) {
    return null;
  }

  // Count how many cards we have
  const cardCount = [
    equipmentForSkills.length > 0,
    recipesForSkills.length > 0,
    ingredientsForSkills.length > 0,
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
      {/* Equipment Needed for Skills */}
      {equipmentForSkills.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-4 flex flex-col">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/50">
                  <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                    {t("equipment.title")}
                  </h3>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    {t("equipment.subtitle")}
                  </p>
                </div>
              </div>
              {onNavigateToEquipment && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-orange-700 hover:text-orange-800 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900/50"
                  onClick={onNavigateToEquipment}
                >
                  <Wrench className="h-4 w-4 mr-1" />
                  {t("equipment.viewAll")}
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {equipmentForSkills.map(({ skillName, skillId, neededEquipment, ownedEquipment }) => (
                <li
                  key={skillId}
                  className="p-2 rounded-md bg-white/60 dark:bg-white/5"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      {skillName}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {neededEquipment.slice(0, 4).map((equip) => (
                        <Badge
                          key={equip}
                          variant="secondary"
                          className={`text-xs cursor-pointer ${
                            ownedEquipment.includes(equip)
                              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                              : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                          }`}
                          onClick={() => onEquipmentClick?.(equip)}
                        >
                          {equip}
                          {ownedEquipment.includes(equip) && " ✓"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            {t("equipment.tip")}
          </p>
        </div>
      )}

      {/* Recipes to Practice Skills */}
      {recipesForSkills.length > 0 && (
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
              {recipesForSkills.map(({ skillName, skillId, recipes }) => (
                <li
                  key={skillId}
                  className="p-2 rounded-md bg-white/60 dark:bg-white/5"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      {skillName}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {recipes.map((recipe) => (
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
            <GraduationCap className="h-3 w-3" />
            {t("recipes.tip")}
          </p>
        </div>
      )}

      {/* Pantry Ingredients for Practice */}
      {ingredientsForSkills.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/20 dark:to-green-950/20 p-4 flex flex-col">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-lime-100 dark:bg-lime-900/50">
                  <Carrot className="h-4 w-4 text-lime-600 dark:text-lime-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lime-800 dark:text-lime-200">
                    {t("pantry.title")}
                  </h3>
                  <p className="text-xs text-lime-600 dark:text-lime-400">
                    {t("pantry.subtitle")}
                  </p>
                </div>
              </div>
              {onNavigateToPantry && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-lime-700 hover:text-lime-800 hover:bg-lime-100 dark:text-lime-300 dark:hover:bg-lime-900/50"
                  onClick={onNavigateToPantry}
                >
                  <Carrot className="h-4 w-4 mr-1" />
                  {t("pantry.viewAll")}
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {ingredientsForSkills.map(({ skillName, skillId, ingredients }) => (
                <li
                  key={skillId}
                  className="p-2 rounded-md bg-white/60 dark:bg-white/5"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-lime-800 dark:text-lime-200">
                      {skillName}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {ingredients.map((ingredient) => (
                        <Badge
                          key={ingredient}
                          variant="secondary"
                          className="bg-lime-100 text-lime-700 dark:bg-lime-900/50 dark:text-lime-300 text-xs cursor-pointer hover:opacity-80"
                          onClick={() => onPantryClick?.(ingredient)}
                        >
                          {ingredient}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-lime-600 dark:text-lime-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {t("pantry.tip")}
          </p>
        </div>
      )}
    </div>
  );
}
