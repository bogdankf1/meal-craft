"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RECIPE_CATEGORIES, RECIPE_DIFFICULTIES } from "@/lib/api/recipes-api";

interface RecipeFiltersProps {
  category: string;
  onCategoryChange: (value: string) => void;
  difficulty: string;
  onDifficultyChange: (value: string) => void;
  cuisineType: string;
  onCuisineTypeChange: (value: string) => void;
  isFavorite: string;
  onIsFavoriteChange: (value: string) => void;
}

export function RecipeFilters({
  category,
  onCategoryChange,
  difficulty,
  onDifficultyChange,
  cuisineType,
  onCuisineTypeChange,
  isFavorite,
  onIsFavoriteChange,
}: RecipeFiltersProps) {
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Category Filter */}
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t("filters.category")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tCommon("all")}</SelectItem>
          {RECIPE_CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {t(`categories.${cat.value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Difficulty Filter */}
      <Select value={difficulty} onValueChange={onDifficultyChange}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder={t("filters.difficulty")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tCommon("all")}</SelectItem>
          {RECIPE_DIFFICULTIES.map((diff) => (
            <SelectItem key={diff.value} value={diff.value}>
              {t(`difficulties.${diff.value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Cuisine Type Filter */}
      <Select value={cuisineType} onValueChange={onCuisineTypeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t("filters.cuisine")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tCommon("all")}</SelectItem>
          <SelectItem value="Italian">{t("cuisines.italian")}</SelectItem>
          <SelectItem value="Mexican">{t("cuisines.mexican")}</SelectItem>
          <SelectItem value="Asian">{t("cuisines.asian")}</SelectItem>
          <SelectItem value="American">{t("cuisines.american")}</SelectItem>
          <SelectItem value="French">{t("cuisines.french")}</SelectItem>
          <SelectItem value="Mediterranean">{t("cuisines.mediterranean")}</SelectItem>
          <SelectItem value="Indian">{t("cuisines.indian")}</SelectItem>
          <SelectItem value="Ukrainian">{t("cuisines.ukrainian")}</SelectItem>
          <SelectItem value="Japanese">{t("cuisines.japanese")}</SelectItem>
          <SelectItem value="Chinese">{t("cuisines.chinese")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Favorites Filter */}
      <Select value={isFavorite} onValueChange={onIsFavoriteChange}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder={t("filters.favorites")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tCommon("all")}</SelectItem>
          <SelectItem value="true">{t("filters.favoritesOnly")}</SelectItem>
          <SelectItem value="false">{t("filters.nonFavorites")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
