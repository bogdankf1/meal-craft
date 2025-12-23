"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  ChefHat,
  Clock,
  Users,
  Flame,
  Check,
  Plus,
  Loader2,
  RefreshCw,
  UtensilsCrossed,
  Wrench,
  GraduationCap,
  Leaf,
  Sun,
  AlertTriangle,
  ThumbsDown,
  Settings,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  useSuggestRecipesMutation,
  useCreateRecipesMutation,
  CUISINE_TYPES,
  MEAL_TYPES,
  RECIPE_CATEGORIES,
  RECIPE_DIFFICULTIES,
  type CuisineType,
  type MealType,
  type RecipeCategory,
  type RecipeDifficulty,
  type RecipeSuggestionItem,
} from "@/lib/api/recipes-api";
import { toast } from "sonner";
import { useGetAllRestrictionsQuery } from "@/lib/api/dietary-restrictions-api";
import Link from "next/link";
import { useLocale } from "next-intl";

interface AiRecipeSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AiRecipeSuggestionsDialog({
  open,
  onOpenChange,
  onSuccess,
}: AiRecipeSuggestionsDialogProps) {
  const t = useTranslations("recipes.aiSuggestions");
  const tRecipes = useTranslations("recipes");
  const tCommon = useTranslations("common");
  const tDietary = useTranslations("dietaryRestrictions");
  const locale = useLocale();

  // Filter state
  const [cuisineType, setCuisineType] = useState<CuisineType | "">("");
  const [mealType, setMealType] = useState<MealType | "">("");
  const [category, setCategory] = useState<RecipeCategory | "">("");
  const [difficulty, setDifficulty] = useState<RecipeDifficulty | "">("");
  const [servings, setServings] = useState(4);
  const [count, setCount] = useState(6);

  // Results state
  const [suggestions, setSuggestions] = useState<RecipeSuggestionItem[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<number>>(new Set());
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);

  // API hooks
  const [suggestRecipes, { isLoading: isGenerating }] = useSuggestRecipesMutation();
  const [createRecipes, { isLoading: isSaving }] = useCreateRecipesMutation();
  const { data: restrictionsData } = useGetAllRestrictionsQuery();

  // Dietary restrictions summary
  const hasRestrictions = restrictionsData && restrictionsData.all_excluded.length > 0;

  const handleGenerate = async () => {
    try {
      const result = await suggestRecipes({
        cuisine_type: cuisineType || undefined,
        meal_type: mealType || undefined,
        category: category || undefined,
        difficulty: difficulty || undefined,
        servings,
        count,
      }).unwrap();

      setSuggestions(result.suggestions);
      setSelectedRecipes(new Set());
      setExpandedRecipe(null);
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
      toast.error(t("errorGenerating"));
    }
  };

  const handleToggleSelect = (index: number) => {
    const newSelected = new Set(selectedRecipes);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRecipes(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRecipes.size === suggestions.length) {
      setSelectedRecipes(new Set());
    } else {
      setSelectedRecipes(new Set(suggestions.map((_, i) => i)));
    }
  };

  const handleSaveSelected = async () => {
    if (selectedRecipes.size === 0) return;

    const recipesToSave = Array.from(selectedRecipes).map((index) => {
      const suggestion = suggestions[index];
      return {
        name: suggestion.name,
        description: suggestion.description,
        category: (suggestion.category as RecipeCategory) || undefined,
        cuisine_type: suggestion.cuisine_type,
        prep_time: suggestion.prep_time,
        cook_time: suggestion.cook_time,
        servings: suggestion.servings,
        difficulty: (suggestion.difficulty as RecipeDifficulty) || undefined,
        instructions: suggestion.instructions,
        ingredients: suggestion.ingredients,
        tags: suggestion.tags,
        is_favorite: false,
        // Include integration fields from AI suggestions
        required_equipment: suggestion.required_equipment,
        techniques: suggestion.techniques,
        seasonal_info: suggestion.seasonal_info,
        best_season_months: suggestion.best_season_months,
      };
    });

    try {
      await createRecipes(recipesToSave).unwrap();
      toast.success(t("recipesSaved", { count: recipesToSave.length }));
      onOpenChange(false);
      onSuccess?.();
      // Reset state
      setSuggestions([]);
      setSelectedRecipes(new Set());
    } catch (error) {
      console.error("Failed to save recipes:", error);
      toast.error(t("errorSaving"));
    }
  };

  const handleClose = () => {
    if (!isGenerating && !isSaving) {
      onOpenChange(false);
    }
  };

  const getDifficultyColor = (diff: string | null) => {
    switch (diff) {
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

  // Month names for seasonality
  const MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const formatMonthRange = (months: number[] | null): string => {
    if (!months || months.length === 0) return "";
    const sorted = [...months].sort((a, b) => a - b);
    if (sorted.length === 1) return MONTH_NAMES[sorted[0] - 1];
    return sorted.map(m => MONTH_NAMES[m - 1]).join(", ");
  };

  const isInSeason = (months: number[] | null): boolean => {
    if (!months || months.length === 0) return false;
    const currentMonth = new Date().getMonth() + 1;
    return months.includes(currentMonth);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col sm:max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Filters Section */}
          <div className="space-y-4">
            {/* Selects Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Cuisine Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t("filters.cuisine")}</Label>
                <Select
                  value={cuisineType || "all"}
                  onValueChange={(v) => setCuisineType(v === "all" ? "" : v as CuisineType)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder={t("filters.anyCuisine")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.anyCuisine")}</SelectItem>
                    {CUISINE_TYPES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {tRecipes(`cuisines.${c.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Meal Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t("filters.mealType")}</Label>
                <Select
                  value={mealType || "all"}
                  onValueChange={(v) => setMealType(v === "all" ? "" : v as MealType)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder={t("filters.anyMealType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.anyMealType")}</SelectItem>
                    {MEAL_TYPES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {tRecipes(`mealTypes.${m.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t("filters.category")}</Label>
                <Select
                  value={category || "all"}
                  onValueChange={(v) => setCategory(v === "all" ? "" : v as RecipeCategory)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder={t("filters.anyCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.anyCategory")}</SelectItem>
                    {RECIPE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {tRecipes(`categories.${c.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t("filters.difficulty")}</Label>
                <Select
                  value={difficulty || "all"}
                  onValueChange={(v) => setDifficulty(v === "all" ? "" : v as RecipeDifficulty)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder={t("filters.anyDifficulty")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.anyDifficulty")}</SelectItem>
                    {RECIPE_DIFFICULTIES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {tRecipes(`difficulties.${d.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sliders Row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Servings */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  {t("filters.servings")}: <span className="text-primary">{servings}</span>
                </Label>
                <Slider
                  value={[servings]}
                  onValueChange={([v]) => setServings(v)}
                  min={1}
                  max={12}
                  step={1}
                />
              </div>

              {/* Count */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  {t("filters.count")}: <span className="text-primary">{count}</span>
                </Label>
                <Slider
                  value={[count]}
                  onValueChange={([v]) => setCount(v)}
                  min={3}
                  max={12}
                  step={1}
                />
              </div>
            </div>

            {/* Dietary Restrictions Summary */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">{tDietary("aiSummary.title")}</span>
                </div>
                <Link
                  href={`/${locale}/settings?tab=household`}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  onClick={() => onOpenChange(false)}
                >
                  <Settings className="h-3 w-3" />
                  {tDietary("aiSummary.editInSettings")}
                </Link>
              </div>
              {hasRestrictions ? (
                <div className="mt-2 space-y-2">
                  {restrictionsData.combined_allergies.length > 0 && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-destructive mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground">{tDietary("aiSummary.allergies")}:</span>
                        {restrictionsData.combined_allergies.map((allergy) => (
                          <Badge key={allergy} variant="destructive" className="text-xs py-0">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {restrictionsData.combined_dislikes.length > 0 && (
                    <div className="flex items-start gap-2">
                      <ThumbsDown className="h-3 w-3 text-muted-foreground mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground">{tDietary("aiSummary.dislikes")}:</span>
                        {restrictionsData.combined_dislikes.map((dislike) => (
                          <Badge key={dislike} variant="secondary" className="text-xs py-0">
                            {dislike}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">{tDietary("aiSummary.none")}</p>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-between">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("generating")}
                </>
              ) : suggestions.length > 0 ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {t("regenerate")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t("generate")}
                </>
              )}
            </Button>

            {suggestions.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="gap-1"
                >
                  <Check className="h-3 w-3" />
                  {selectedRecipes.size === suggestions.length
                    ? t("deselectAll")
                    : t("selectAll")}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("selected", { count: selectedRecipes.size })}
                </span>
              </div>
            )}
          </div>

          {/* Results */}
          {suggestions.length > 0 ? (
            <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4 pr-2">
                {suggestions.map((recipe, index) => (
                  <Card
                    key={index}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedRecipes.has(index)
                        ? "border-2 border-primary bg-primary/5"
                        : "border border-border"
                    )}
                    onClick={() => handleToggleSelect(index)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Checkbox
                            checked={selectedRecipes.has(index)}
                            onCheckedChange={() => handleToggleSelect(index)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base leading-tight line-clamp-2">
                              {recipe.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {recipe.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {recipe.prep_time && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {recipe.prep_time}m prep
                          </div>
                        )}
                        {recipe.cook_time && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Flame className="h-3 w-3" />
                            {recipe.cook_time}m cook
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {recipe.servings}
                        </div>
                        {recipe.difficulty && (
                          <Badge
                            variant="secondary"
                            className={cn("text-xs", getDifficultyColor(recipe.difficulty))}
                          >
                            {tRecipes(`difficulties.${recipe.difficulty}`)}
                          </Badge>
                        )}
                        {recipe.estimated_calories && (
                          <Badge variant="outline" className="text-xs">
                            {recipe.estimated_calories} kcal
                          </Badge>
                        )}
                      </div>

                      {/* Tags */}
                      {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {recipe.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {recipe.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{recipe.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Expandable details */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRecipe(expandedRecipe === index ? null : index);
                        }}
                      >
                        {expandedRecipe === index ? t("hideDetails") : t("showDetails")}
                      </Button>

                      {expandedRecipe === index && (
                        <div className="mt-3 pt-3 border-t space-y-3 text-sm">
                          {/* Ingredients */}
                          <div>
                            <h4 className="font-medium mb-1 flex items-center gap-1">
                              <UtensilsCrossed className="h-3 w-3" />
                              {t("ingredients")} ({recipe.ingredients.length})
                            </h4>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {recipe.ingredients.slice(0, 6).map((ing, i) => (
                                <li key={i}>
                                  {ing.quantity} {ing.unit} {ing.ingredient_name}
                                </li>
                              ))}
                              {recipe.ingredients.length > 6 && (
                                <li className="italic">
                                  +{recipe.ingredients.length - 6} more...
                                </li>
                              )}
                            </ul>
                          </div>

                          {/* Instructions preview */}
                          <div>
                            <h4 className="font-medium mb-1 flex items-center gap-1">
                              <ChefHat className="h-3 w-3" />
                              {t("instructions")}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-4">
                              {recipe.instructions}
                            </p>
                          </div>

                          {/* Required Equipment */}
                          {recipe.required_equipment && recipe.required_equipment.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-1 flex items-center gap-1">
                                <Wrench className="h-3 w-3" />
                                {t("equipment")} ({recipe.required_equipment.length})
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {recipe.required_equipment.map((eq, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {eq.equipment_name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Techniques */}
                          {recipe.techniques && recipe.techniques.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-1 flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" />
                                {t("techniques")} ({recipe.techniques.length})
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {recipe.techniques.map((tech, i) => (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className={cn(
                                      "text-xs",
                                      tech.difficulty === "beginner"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                        : tech.difficulty === "intermediate"
                                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                        : tech.difficulty === "advanced"
                                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                        : ""
                                    )}
                                  >
                                    {tech.skill_name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Seasonality */}
                          {recipe.best_season_months && recipe.best_season_months.length > 0 && (
                            <div
                              className={cn(
                                "rounded p-2 flex items-center gap-2",
                                isInSeason(recipe.best_season_months)
                                  ? "bg-green-50 dark:bg-green-950/30"
                                  : "bg-amber-50 dark:bg-amber-950/30"
                              )}
                            >
                              {isInSeason(recipe.best_season_months) ? (
                                <Sun className="h-3 w-3 text-green-600" />
                              ) : (
                                <Leaf className="h-3 w-3 text-amber-600" />
                              )}
                              <p className="text-xs">
                                <strong>
                                  {isInSeason(recipe.best_season_months)
                                    ? t("inSeason")
                                    : t("bestSeason")}
                                </strong>{" "}
                                {formatMonthRange(recipe.best_season_months)}
                              </p>
                            </div>
                          )}

                          {/* Tips */}
                          {recipe.tips && (
                            <div className="bg-muted/50 rounded p-2">
                              <p className="text-xs">
                                <strong>{t("tip")}:</strong> {recipe.tips}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : !isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <ChefHat className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium text-lg">{t("emptyState.title")}</h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-1">
                {t("emptyState.description")}
              </p>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        {suggestions.length > 0 && (
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleSaveSelected}
              disabled={selectedRecipes.size === 0 || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {t("addSelected", { count: selectedRecipes.size })}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
