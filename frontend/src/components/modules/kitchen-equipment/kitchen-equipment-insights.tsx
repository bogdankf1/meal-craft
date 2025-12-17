"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ChefHat,
  BookOpen,
  ShoppingCart,
  ExternalLink,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetRecipesQuery } from "@/lib/api/recipes-api";
import { useGetUserSkillsQuery } from "@/lib/api/learning-api";
import type { KitchenEquipment } from "@/lib/api/kitchen-equipment-api";

interface KitchenEquipmentInsightsProps {
  equipmentItems: KitchenEquipment[];
  onNavigateToRecipes?: () => void;
  onNavigateToLearning?: () => void;
  onAddToWishlist?: (equipment: { name: string; category?: string | null }) => void;
  onRecipeClick?: (recipeName: string, equipmentUsed: string[]) => void;
  onSkillClick?: (skillName: string, equipmentName: string) => void;
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
  "electric", "manual", "professional", "home", "kitchen", "digital",
  "stainless", "steel", "large", "small", "medium", "set", "piece",
]);

function getSignificantWords(name: string): string[] {
  const normalized = normalizeText(name);
  return normalized
    .split(" ")
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

// Check if names match
function namesMatch(name1: string, name2: string): boolean {
  const normalized1 = normalizeText(name1);
  const normalized2 = normalizeText(name2);

  if (normalized1 === normalized2) return true;

  const words1 = getSignificantWords(name1);
  const words2 = getSignificantWords(name2);

  if (words1.length === 0 || words2.length === 0) return false;

  // Check if any significant word matches
  return words1.some((w1) =>
    words2.some(
      (w2) =>
        w2 === w1 ||
        w2.includes(w1) ||
        w1.includes(w2) ||
        w2 === w1 + "s" ||
        w1 === w2 + "s"
    )
  );
}

export function KitchenEquipmentInsights({
  equipmentItems,
  onNavigateToRecipes,
  onNavigateToLearning,
  onAddToWishlist,
  onRecipeClick,
  onSkillClick,
}: KitchenEquipmentInsightsProps) {
  const t = useTranslations("kitchenEquipment.insights");

  // Get recipes to find ones that can be made with current equipment
  const { data: recipesData } = useGetRecipesQuery({
    per_page: 100,
    is_archived: false,
  });

  // Get user skills to suggest equipment-specific tutorials
  const { data: skillsData } = useGetUserSkillsQuery({
    per_page: 100,
  });

  // Equipment names set for quick lookup
  const equipmentNames = useMemo(() => {
    return new Set(equipmentItems.map((e) => normalizeText(e.name)));
  }, [equipmentItems]);

  // Find missing equipment from recipes (equipment wishlist)
  const missingEquipment = useMemo(() => {
    if (!recipesData?.items) return [];

    const missing = new Map<string, { name: string; recipes: string[]; category?: string }>();

    for (const recipe of recipesData.items) {
      if (!recipe.required_equipment?.length) continue;

      for (const reqEquip of recipe.required_equipment) {
        if (!reqEquip.is_required) continue;

        const hasEquipment = equipmentItems.some((userEquip) =>
          namesMatch(userEquip.name, reqEquip.equipment_name)
        );

        if (!hasEquipment) {
          const key = normalizeText(reqEquip.equipment_name);
          const existing = missing.get(key);
          if (existing) {
            if (!existing.recipes.includes(recipe.name)) {
              existing.recipes.push(recipe.name);
            }
          } else {
            missing.set(key, {
              name: reqEquip.equipment_name,
              recipes: [recipe.name],
              category: undefined, // Could be mapped if needed
            });
          }
        }
      }
    }

    // Sort by number of recipes that need this equipment
    return Array.from(missing.values())
      .sort((a, b) => b.recipes.length - a.recipes.length)
      .slice(0, 5);
  }, [recipesData, equipmentItems]);

  // Find recipes that can be made with user's equipment
  const recipesWithEquipment = useMemo(() => {
    if (!recipesData?.items || !equipmentItems.length) return [];

    const matches: Array<{
      recipeName: string;
      recipeId: string;
      matchedEquipment: string[];
    }> = [];

    for (const recipe of recipesData.items) {
      if (!recipe.required_equipment?.length) continue;

      const matchedEquipment: string[] = [];
      let allEquipmentAvailable = true;

      for (const reqEquip of recipe.required_equipment) {
        const hasEquipment = equipmentItems.some((userEquip) =>
          namesMatch(userEquip.name, reqEquip.equipment_name)
        );

        if (hasEquipment) {
          matchedEquipment.push(reqEquip.equipment_name);
        } else if (reqEquip.is_required) {
          allEquipmentAvailable = false;
          break;
        }
      }

      if (allEquipmentAvailable && matchedEquipment.length > 0) {
        matches.push({
          recipeName: recipe.name,
          recipeId: recipe.id,
          matchedEquipment,
        });
      }
    }

    return matches.slice(0, 5);
  }, [recipesData, equipmentItems]);

  // Find skills/techniques related to user's equipment
  const equipmentSkills = useMemo(() => {
    if (!skillsData?.items || !equipmentItems.length) return [];

    const matches: Array<{
      skillName: string;
      skillId: string;
      equipmentName: string;
      proficiencyLevel: string;
    }> = [];

    // Common equipment-to-skill mappings
    const equipmentSkillMap: Record<string, string[]> = {
      "stand mixer": ["whipping", "kneading", "mixing", "baking"],
      "mixer": ["whipping", "mixing", "baking"],
      "blender": ["blending", "pureeing", "smoothies"],
      "food processor": ["chopping", "slicing", "shredding"],
      "knife": ["cutting", "chopping", "slicing", "dicing", "julienne"],
      "wok": ["stir frying", "wok cooking", "asian cooking"],
      "cast iron": ["searing", "pan frying", "baking"],
      "dutch oven": ["braising", "stewing", "baking"],
      "pressure cooker": ["pressure cooking"],
      "instant pot": ["pressure cooking", "slow cooking"],
      "slow cooker": ["slow cooking", "braising"],
      "grill": ["grilling", "barbecue"],
      "smoker": ["smoking", "barbecue"],
      "sous vide": ["sous vide cooking"],
      "pasta maker": ["pasta making"],
      "bread machine": ["bread making", "baking"],
      "espresso": ["coffee", "espresso"],
    };

    for (const equipment of equipmentItems) {
      const equipNormalized = normalizeText(equipment.name);

      for (const [equipKey, skillKeywords] of Object.entries(equipmentSkillMap)) {
        if (equipNormalized.includes(equipKey)) {
          // Find matching skills from user's skills
          for (const skill of skillsData.items) {
            const skillNormalized = normalizeText(skill.skill?.name || "");

            if (skillKeywords.some((kw) => skillNormalized.includes(kw))) {
              // Avoid duplicates
              if (!matches.some((m) => m.skillId === skill.id)) {
                matches.push({
                  skillName: skill.skill?.name || "",
                  skillId: skill.id,
                  equipmentName: equipment.name,
                  proficiencyLevel: skill.proficiency_level || "beginner",
                });
              }
            }
          }
          break;
        }
      }
    }

    return matches.slice(0, 5);
  }, [skillsData, equipmentItems]);

  // Don't render if no insights to show
  if (recipesWithEquipment.length === 0 && equipmentSkills.length === 0 && missingEquipment.length === 0) {
    return null;
  }

  // Count how many cards we have
  const cardCount = [
    recipesWithEquipment.length > 0,
    equipmentSkills.length > 0,
    missingEquipment.length > 0,
  ].filter(Boolean).length;

  // Determine grid columns based on card count
  const gridClass = cardCount === 1
    ? "grid gap-4"
    : cardCount === 2
    ? "grid gap-4 md:grid-cols-2"
    : "grid gap-4 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={gridClass}>
      {/* Recipes You Can Make */}
      {recipesWithEquipment.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4">
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
            {recipesWithEquipment.map(({ recipeName, recipeId, matchedEquipment }) => (
              <li
                key={recipeId}
                className={`flex items-center justify-between p-2 rounded-md bg-white/60 dark:bg-white/5 ${onRecipeClick ? "cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-colors" : ""}`}
                onClick={() => onRecipeClick?.(recipeName, matchedEquipment)}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    {recipeName}
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    {t("recipes.uses", { equipment: matchedEquipment.slice(0, 2).join(", ") })}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {t("recipes.canMake")}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ChefHat className="h-3 w-3" />
            {t("recipes.tip")}
          </p>
        </div>
      )}

      {/* Equipment-Specific Skills */}
      {equipmentSkills.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 p-4">
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
                <BookOpen className="h-4 w-4 mr-1" />
                {t("learning.viewAll")}
              </Button>
            )}
          </div>
          <ul className="space-y-2">
            {equipmentSkills.map(({ skillName, skillId, equipmentName, proficiencyLevel }) => (
              <li
                key={skillId}
                className={`flex items-center justify-between p-2 rounded-md bg-white/60 dark:bg-white/5 ${onSkillClick ? "cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-colors" : ""}`}
                onClick={() => onSkillClick?.(skillName, equipmentName)}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    {skillName}
                  </span>
                  <span className="text-xs text-purple-600 dark:text-purple-400">
                    {t("learning.forEquipment", { equipment: equipmentName })}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    proficiencyLevel === "beginner"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-xs"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-xs"
                  }
                >
                  {t(`learning.levels.${proficiencyLevel}`)}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <GraduationCap className="h-3 w-3" />
            {t("learning.tip")}
          </p>
        </div>
      )}

      {/* Missing Equipment Wishlist */}
      {missingEquipment.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/50">
                <ShoppingCart className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-semibold text-rose-800 dark:text-rose-200">
                  {t("wishlist.title")}
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {t("wishlist.subtitle")}
                </p>
              </div>
            </div>
          </div>
          <ul className="space-y-2">
            {missingEquipment.map(({ name, recipes }) => (
              <li
                key={name}
                className="flex items-center justify-between p-2 rounded-md bg-white/60 dark:bg-white/5"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-rose-800 dark:text-rose-200">
                    {name}
                  </span>
                  <span className="text-xs text-rose-600 dark:text-rose-400">
                    {t("wishlist.unlocksRecipes", { count: recipes.length })}
                  </span>
                </div>
                {onAddToWishlist && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-700 hover:text-rose-800 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900/50"
                    onClick={() => onAddToWishlist({ name })}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    {t("wishlist.addToList")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <ShoppingCart className="h-3 w-3" />
            {t("wishlist.tip")}
          </p>
        </div>
      )}
    </div>
  );
}
