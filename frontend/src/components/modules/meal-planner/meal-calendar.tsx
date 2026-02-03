"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { format, addDays, isSameDay } from "date-fns";
import { Plus, UtensilsCrossed, Coffee, Moon, Cookie, ChefHat } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type Meal, type MealType, type MealWithProfile, MEAL_TYPES } from "@/lib/api/meal-planner-api";

interface MealCalendarProps {
  startDate: Date;
  meals: Meal[] | MealWithProfile[];
  servings: number;
  onAddMeal?: (date: Date, mealType: MealType) => void;
  onEditMeal?: (meal: Meal | MealWithProfile) => void;
  onDeleteMeal?: (meal: Meal | MealWithProfile) => void;
  onMarkCooked?: (meal: Meal | MealWithProfile) => void;
  /** When true, shows all meals per slot (combined view for all members) */
  showAllMembers?: boolean;
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

// Type guard to check if meal has profile info
function isMealWithProfile(meal: Meal | MealWithProfile): meal is MealWithProfile {
  return 'profile_color' in meal;
}

export function MealCalendar({
  startDate,
  meals,
  servings,
  onAddMeal,
  onEditMeal,
  onDeleteMeal,
  onMarkCooked,
  showAllMembers = false,
}: MealCalendarProps) {
  const t = useTranslations("mealPlanner");

  // Generate 7 days starting from the plan's actual startDate
  const days = useMemo(() => {
    return [...Array(7)].map((_, i) => addDays(startDate, i));
  }, [startDate]);

  // Group meals by date and type - supports multiple meals per slot in combined view
  const mealsByDateAndType = useMemo(() => {
    const grouped: Record<string, Record<MealType, (Meal | MealWithProfile)[]>> = {};

    days.forEach((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      grouped[dateKey] = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
      };
    });

    meals.forEach((meal) => {
      const dateKey = meal.date;
      if (grouped[dateKey]) {
        grouped[dateKey][meal.meal_type].push(meal);
      }
    });

    return grouped;
  }, [days, meals]);

  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Week header */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="min-w-[500px] md:min-w-0">
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
        </div>
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
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="min-w-[500px] md:min-w-0">
              <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const mealsForSlot = mealsByDateAndType[dateKey]?.[mealType] || [];
              const hasMeals = mealsForSlot.length > 0;

              // In combined view, show all meals. In single view, show first meal only.
              const displayMeals = showAllMembers ? mealsForSlot : mealsForSlot.slice(0, 1);

              // Determine if the card is clickable
              const isClickable = (!hasMeals && onAddMeal) || (hasMeals && !showAllMembers && onEditMeal);

              return (
                <Card
                  key={`${dateKey}-${mealType}`}
                  className={cn(
                    "min-h-[80px] transition-colors",
                    isClickable && "cursor-pointer hover:bg-muted/50",
                    isSameDay(day, today) && "ring-1 ring-primary/20"
                  )}
                  onClick={() => {
                    if (!hasMeals && onAddMeal) {
                      onAddMeal(day, mealType);
                    } else if (!showAllMembers && mealsForSlot[0] && onEditMeal) {
                      // In single profile view, clicking edits the meal
                      onEditMeal(mealsForSlot[0]);
                    }
                    // In combined view with meals, clicking does nothing - user clicks individual meals
                  }}
                >
                  <CardContent className={cn(
                    "p-2",
                    !hasMeals && "h-[80px] flex items-center justify-center"
                  )}>
                    {hasMeals ? (
                      <div className="space-y-1.5">
                        {displayMeals.map((meal) => {
                          const hasProfile = isMealWithProfile(meal);
                          const profileColor = hasProfile ? meal.profile_color : null;
                          const profileName = hasProfile ? meal.profile_name : null;

                          return (
                            <div
                              key={meal.id}
                              className={cn(
                                "space-y-0.5 group/meal relative",
                                showAllMembers && "p-1.5 rounded-md hover:bg-muted/80 cursor-pointer"
                              )}
                              onClick={(e) => {
                                if (showAllMembers) {
                                  e.stopPropagation();
                                  onEditMeal?.(meal);
                                }
                              }}
                              style={showAllMembers && profileColor ? {
                                borderLeft: `3px solid ${profileColor}`,
                                paddingLeft: '6px',
                              } : undefined}
                            >
                              <div className="flex items-center gap-1">
                                <div className="text-xs font-medium truncate flex-1">
                                  {meal.recipe_name || meal.custom_name || t("noMeal")}
                                </div>
                                {/* Mark as Cooked button */}
                                {onMarkCooked && !showAllMembers && (
                                  <button
                                    type="button"
                                    className="opacity-0 group-hover/meal:opacity-100 transition-opacity p-0.5 rounded hover:bg-primary/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onMarkCooked(meal);
                                    }}
                                    title={t("markCooked.title")}
                                  >
                                    <ChefHat className="h-3 w-3 text-primary" />
                                  </button>
                                )}
                              </div>
                              {showAllMembers && profileName && (
                                <div
                                  className="text-[10px] font-medium truncate"
                                  style={{ color: profileColor || undefined }}
                                >
                                  {profileName}
                                </div>
                              )}
                              {!showAllMembers && meal.recipe_prep_time && (
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
                          );
                        })}
                      </div>
                    ) : onAddMeal ? (
                      <Plus className="h-4 w-4 text-muted-foreground/50" />
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
