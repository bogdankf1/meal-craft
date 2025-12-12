"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { format, addDays, isSameDay } from "date-fns";
import { Plus, UtensilsCrossed, Coffee, Moon, Cookie } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type Meal, type MealType, MEAL_TYPES } from "@/lib/api/meal-planner-api";

interface MealCalendarProps {
  startDate: Date;
  meals: Meal[];
  servings: number;
  onAddMeal?: (date: Date, mealType: MealType) => void;
  onEditMeal?: (meal: Meal) => void;
  onDeleteMeal?: (meal: Meal) => void;
}

const MEAL_TYPE_ICONS: Record<MealType, React.ReactNode> = {
  breakfast: <Coffee className="h-3 w-3" />,
  lunch: <UtensilsCrossed className="h-3 w-3" />,
  dinner: <Moon className="h-3 w-3" />,
  snack: <Cookie className="h-3 w-3" />,
};

const MEAL_TYPE_COLORS: Record<MealType, string> = {
  breakfast: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  lunch: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  dinner: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  snack: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export function MealCalendar({
  startDate,
  meals,
  servings,
  onAddMeal,
  onEditMeal,
  onDeleteMeal,
}: MealCalendarProps) {
  const t = useTranslations("mealPlanner");

  // Generate 7 days starting from the plan's actual startDate
  const days = useMemo(() => {
    return [...Array(7)].map((_, i) => addDays(startDate, i));
  }, [startDate]);

  // Group meals by date and type
  const mealsByDateAndType = useMemo(() => {
    const grouped: Record<string, Record<MealType, Meal | undefined>> = {};

    days.forEach((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      grouped[dateKey] = {
        breakfast: undefined,
        lunch: undefined,
        dinner: undefined,
        snack: undefined,
      };
    });

    meals.forEach((meal) => {
      const dateKey = meal.date;
      if (grouped[dateKey]) {
        grouped[dateKey][meal.meal_type] = meal;
      }
    });

    return grouped;
  }, [days, meals]);

  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Week header */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "text-center p-2 rounded-lg",
              isSameDay(day, today) && "bg-primary/10"
            )}
          >
            <div className="text-xs text-muted-foreground">
              {format(day, "EEE")}
            </div>
            <div
              className={cn(
                "text-lg font-semibold",
                isSameDay(day, today) && "text-primary"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Meal slots */}
      {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((mealType) => (
        <div key={mealType} className="space-y-2">
          {/* Separator before snacks */}
          {mealType === "snack" && (
            <div className="border-t border-dashed border-muted-foreground/20 pt-2 mt-2" />
          )}
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {MEAL_TYPE_ICONS[mealType]}
            {t(`mealTypes.${mealType}`)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const meal = mealsByDateAndType[dateKey]?.[mealType];

              return (
                <Card
                  key={`${dateKey}-${mealType}`}
                  className={cn(
                    "min-h-[80px] cursor-pointer transition-colors hover:bg-muted/50",
                    isSameDay(day, today) && "ring-1 ring-primary/20"
                  )}
                  onClick={() =>
                    meal
                      ? onEditMeal?.(meal)
                      : onAddMeal?.(day, mealType)
                  }
                >
                  <CardContent className={cn(
                    "p-2",
                    !meal && "h-[80px] flex items-center justify-center"
                  )}>
                    {meal ? (
                      <div className="space-y-1">
                        <div className="text-xs font-medium truncate">
                          {meal.recipe_name || meal.custom_name || t("noMeal")}
                        </div>
                        {meal.recipe_prep_time && (
                          <div className="text-[10px] text-muted-foreground">
                            {meal.recipe_prep_time + (meal.recipe_cook_time || 0)} min
                          </div>
                        )}
                        {meal.is_leftover && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0"
                          >
                            {t("leftover")}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
