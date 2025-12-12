"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Star, Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type RestaurantMeal } from "@/lib/api/restaurants-api";

interface RestaurantMealCalendarViewProps {
  items: RestaurantMeal[];
  isLoading: boolean;
  onItemClick: (meal: RestaurantMeal) => void;
}

export function RestaurantMealCalendarView({
  items,
  isLoading,
  onItemClick,
}: RestaurantMealCalendarViewProps) {
  const t = useTranslations("restaurants");
  const tCommon = useTranslations("common");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const mealsByDate = useMemo(() => {
    const map = new Map<string, RestaurantMeal[]>();
    items.forEach((meal) => {
      const dateKey = meal.meal_date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(meal);
    });
    return map;
  }, [items]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{tCommon("loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <Button variant="outline" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before the month starts */}
        {Array.from({ length: days[0].getDay() }).map((_, i) => (
          <div key={`empty-start-${i}`} className="min-h-[100px]" />
        ))}

        {/* Days of the month */}
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayMeals = mealsByDate.get(dateKey) || [];
          const hasMeals = dayMeals.length > 0;

          return (
            <Card
              key={dateKey}
              className={cn(
                "min-h-[100px] p-1",
                isToday(day) && "border-primary",
                !hasMeals && "bg-muted/30"
              )}
            >
              <CardContent className="p-1">
                <div
                  className={cn(
                    "text-sm font-medium mb-1",
                    isToday(day) && "text-primary"
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayMeals.slice(0, 3).map((meal) => (
                    <div
                      key={meal.id}
                      className="text-xs p-1 rounded bg-primary/10 cursor-pointer hover:bg-primary/20 transition-colors truncate"
                      onClick={() => onItemClick(meal)}
                      title={`${meal.restaurant_name} - ${t(`mealTypes.${meal.meal_type}`)}`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="truncate font-medium">
                          {meal.restaurant_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {t(`mealTypes.${meal.meal_type}`)}
                        </Badge>
                        {meal.rating && (
                          <div className="flex items-center">
                            <Star className="h-2 w-2 text-yellow-500 fill-yellow-500" />
                            <span className="text-[10px]">{meal.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {dayMeals.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayMeals.length - 3} {t("calendar.more")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Empty cells for days after the month ends */}
        {Array.from({ length: 6 - days[days.length - 1].getDay() }).map((_, i) => (
          <div key={`empty-end-${i}`} className="min-h-[100px]" />
        ))}
      </div>
    </div>
  );
}
