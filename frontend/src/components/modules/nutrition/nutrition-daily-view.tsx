"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  UtensilsCrossed,
  Store,
  Cookie,
  Coffee,
  Moon,
  Flame,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NutritionProgress, MacroProgressBar } from "./nutrition-progress";
import {
  type DailyNutritionWithGoals,
  type NutritionEntry,
} from "@/lib/api/nutrition-api";
import { cn } from "@/lib/utils";

interface NutritionDailyViewProps {
  data: DailyNutritionWithGoals | undefined;
  isLoading: boolean;
  onEntryClick?: (entry: NutritionEntry) => void;
}

const MEAL_TYPE_ICONS: Record<string, React.ReactNode> = {
  breakfast: <Coffee className="h-4 w-4" />,
  lunch: <UtensilsCrossed className="h-4 w-4" />,
  dinner: <Moon className="h-4 w-4" />,
  snack: <Cookie className="h-4 w-4" />,
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  meal_plan: <UtensilsCrossed className="h-3 w-3" />,
  restaurant: <Store className="h-3 w-3" />,
  custom: <Cookie className="h-3 w-3" />,
};

const SOURCE_COLORS: Record<string, string> = {
  meal_plan: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  restaurant: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  custom: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export function NutritionDailyView({
  data,
  isLoading,
  onEntryClick,
}: NutritionDailyViewProps) {
  const t = useTranslations("nutrition");
  const entries = data?.entries;

  // Group entries by meal type
  const entriesByMealType = useMemo(() => {
    if (!entries) return {};

    const grouped: Record<string, NutritionEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };

    entries.forEach((entry) => {
      const mealType = entry.meal_type || "snack";
      if (grouped[mealType]) {
        grouped[mealType].push(entry);
      }
    });

    return grouped;
  }, [entries]);

  if (isLoading) {
    return <DailyViewSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t("noDataForDate")}
      </div>
    );
  }

  const goal = data.goal;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>{t("dailySummary")}</span>
            <Badge variant="outline">{data.meal_count} {t("meals")}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Calories */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 min-w-[120px]">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{data.total_calories}</span>
              <span className="text-muted-foreground">{t("units.kcal")}</span>
            </div>
            {goal?.daily_calories && (
              <div className="flex-1">
                <NutritionProgress
                  label=""
                  current={data.total_calories}
                  goal={goal.daily_calories}
                  unit={t("units.kcal")}
                />
              </div>
            )}
          </div>

          {/* Macro Distribution */}
          <MacroProgressBar
            calories={data.total_calories}
            protein={data.total_protein_g}
            carbs={data.total_carbs_g}
            fat={data.total_fat_g}
            goals={goal ? {
              calories: goal.daily_calories,
              protein: goal.daily_protein_g,
              carbs: goal.daily_carbs_g,
              fat: goal.daily_fat_g,
            } : undefined}
          />

          {/* Individual Macros */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <NutritionProgress
              label={t("macros.protein")}
              current={data.total_protein_g}
              goal={goal?.daily_protein_g ?? null}
              unit="g"
            />
            <NutritionProgress
              label={t("macros.carbs")}
              current={data.total_carbs_g}
              goal={goal?.daily_carbs_g ?? null}
              unit="g"
            />
            <NutritionProgress
              label={t("macros.fat")}
              current={data.total_fat_g}
              goal={goal?.daily_fat_g ?? null}
              unit="g"
            />
            <NutritionProgress
              label={t("macros.fiber")}
              current={data.total_fiber_g}
              goal={goal?.daily_fiber_g ?? null}
              unit="g"
            />
          </div>

          {/* Additional nutrients */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <NutritionProgress
              label={t("macros.sugar")}
              current={data.total_sugar_g}
              goal={goal?.daily_sugar_g ?? null}
              unit="g"
              color={goal?.daily_sugar_g && data.total_sugar_g > goal.daily_sugar_g ? "danger" : "default"}
            />
            <NutritionProgress
              label={t("macros.sodium")}
              current={data.total_sodium_mg}
              goal={goal?.daily_sodium_mg ?? null}
              unit="mg"
              color={goal?.daily_sodium_mg && data.total_sodium_mg > goal.daily_sodium_mg ? "danger" : "default"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Meals by Type */}
      <div className="space-y-4">
        {(["breakfast", "lunch", "dinner", "snack"] as const).map((mealType) => {
          const entries = entriesByMealType[mealType] || [];

          return (
            <Card key={mealType} className={cn(entries.length === 0 && "opacity-50")}>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {MEAL_TYPE_ICONS[mealType]}
                  {t(`mealTypes.${mealType}`)}
                  {entries.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {entries.reduce((sum, e) => sum + (e.calories || 0), 0)} {t("units.kcal")}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                {entries.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2">
                    {t("noMealsForType")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg bg-muted/50",
                          onEntryClick && "cursor-pointer hover:bg-muted"
                        )}
                        onClick={() => onEntryClick?.(entry)}
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", SOURCE_COLORS[entry.source])}
                          >
                            {SOURCE_ICONS[entry.source]}
                            <span className="ml-1">{t(`sources.${entry.source}`)}</span>
                          </Badge>
                          <span className="font-medium">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {entry.calories && (
                            <span>{entry.calories} {t("units.kcal")}</span>
                          )}
                          {entry.protein_g && (
                            <span className="text-blue-600 dark:text-blue-400">
                              {entry.protein_g}g P
                            </span>
                          )}
                          {entry.carbs_g && (
                            <span className="text-green-600 dark:text-green-400">
                              {entry.carbs_g}g C
                            </span>
                          )}
                          {entry.fat_g && (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              {entry.fat_g}g F
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function DailyViewSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-3 w-full" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="py-3">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
