"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isToday,
  isSameMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type DailyNutritionSummary } from "@/lib/api/nutrition-api";

interface NutritionCalendarProps {
  dailyData: DailyNutritionSummary[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  calorieGoal?: number | null;
  isLoading?: boolean;
}

export function NutritionCalendar({
  dailyData,
  selectedDate,
  onDateSelect,
  calorieGoal,
  isLoading,
}: NutritionCalendarProps) {
  const t = useTranslations("nutrition");
  const tCommon = useTranslations("common");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get calendar days including padding from adjacent months
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Map daily data by date string for quick lookup
  const dataByDate = useMemo(() => {
    const map = new Map<string, DailyNutritionSummary>();
    dailyData.forEach((day) => {
      map.set(day.date, day);
    });
    return map;
  }, [dailyData]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
    onDateSelect(new Date());
  };

  const getCalorieColor = (calories: number) => {
    if (!calorieGoal) return "bg-primary/20";

    const percentage = (calories / calorieGoal) * 100;
    if (percentage >= 90 && percentage <= 110) {
      return "bg-green-500/30 dark:bg-green-500/40";
    }
    if (percentage < 50) {
      return "bg-yellow-500/30 dark:bg-yellow-500/40";
    }
    if (percentage > 120) {
      return "bg-red-500/30 dark:bg-red-500/40";
    }
    return "bg-blue-500/20 dark:bg-blue-500/30";
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleToday}>
          {t("today")}
        </Button>
      </div>

      {/* Calendar Grid - Scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="min-w-[600px] md:min-w-0">
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
        {calendarDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayData = dataByDate.get(dateKey);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
          const hasMeals = dayData && dayData.meal_count > 0;

          return (
            <Card
              key={dateKey}
              className={cn(
                "min-h-[80px] cursor-pointer transition-all hover:shadow-md",
                !isCurrentMonth && "opacity-40",
                isToday(day) && "border-primary",
                isSelected && "ring-2 ring-primary"
              )}
              onClick={() => onDateSelect(day)}
            >
              <CardContent className="p-2">
                <div
                  className={cn(
                    "text-sm font-medium mb-1",
                    isToday(day) && "text-primary"
                  )}
                >
                  {format(day, "d")}
                </div>
                {hasMeals && (
                  <div className="space-y-1">
                    <div
                      className={cn(
                        "rounded px-1 py-0.5 text-xs flex items-center gap-1",
                        getCalorieColor(dayData.total_calories)
                      )}
                    >
                      <Flame className="h-3 w-3" />
                      {dayData.total_calories}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {dayData.meal_count} {dayData.meal_count === 1 ? t("meal") : t("meals")}
                    </div>
                  </div>
                )}
                {!hasMeals && isCurrentMonth && (
                  <div className="text-[10px] text-muted-foreground/50">
                    {t("noData")}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
          </div>
        </div>
      </div>

      {/* Legend */}
      {calorieGoal && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/30 dark:bg-green-500/40" />
            <span>{t("legend.onTarget")} (90-110%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500/30 dark:bg-yellow-500/40" />
            <span>{t("legend.under")} (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500/30 dark:bg-red-500/40" />
            <span>{t("legend.over")} (&gt;120%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500/20 dark:bg-blue-500/30" />
            <span>{t("legend.partial")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
