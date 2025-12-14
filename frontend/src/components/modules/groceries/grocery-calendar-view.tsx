"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Carrot,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { type Grocery } from "@/lib/api/groceries-api";
import { useCurrency } from "@/components/providers/currency-provider";

interface GroceryCalendarViewProps {
  items: Grocery[];
  isLoading?: boolean;
  onItemClick?: (grocery: Grocery) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  groceries: Grocery[];
}

export function GroceryCalendarView({
  items,
  isLoading,
  onItemClick,
}: GroceryCalendarViewProps) {
  const t = useTranslations("groceries");
  const { formatPriceFromUAH } = useCurrency();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Group groceries by purchase date
  const groceriesByDate = useMemo(() => {
    const map = new Map<string, Grocery[]>();
    items.forEach((grocery) => {
      if (grocery.purchase_date) {
        const dateKey = grocery.purchase_date; // Already in YYYY-MM-DD format
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(grocery);
      }
    });
    return map;
  }, [items]);

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Start from the previous Sunday (or Monday depending on locale)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // End on the next Saturday (6 weeks total for consistent grid)
    const endDate = new Date(lastDay);
    const daysToAdd = 6 - endDate.getDay() + (6 * 7 - (lastDay.getDate() + firstDay.getDay()));
    endDate.setDate(endDate.getDate() + Math.min(daysToAdd, 42 - (lastDay.getDate() + firstDay.getDay())));

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const current = new Date(startDate);
    while (days.length < 42) { // Always show 6 weeks
      const dateKey = current.toISOString().split("T")[0];
      const dayDate = new Date(current);

      days.push({
        date: dayDate,
        isCurrentMonth: current.getMonth() === month,
        isToday: current.getTime() === today.getTime(),
        groceries: groceriesByDate.get(dateKey) || [],
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, groceriesByDate]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };


  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{t("loading") || "Loading..."}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {formatMonthYear(currentDate)}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          {t("calendar.today")}
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-muted">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-sm font-medium text-muted-foreground border-b"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const hasGroceries = day.groceries.length > 0;
            const totalCost = day.groceries.reduce((sum, g) => sum + (g.cost || 0), 0);

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[100px] p-1 border-b border-r relative",
                  !day.isCurrentMonth && "bg-muted/30",
                  day.isToday && "bg-primary/5",
                  index % 7 === 6 && "border-r-0" // Last column
                )}
              >
                {/* Day number */}
                <div
                  className={cn(
                    "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                    day.isToday && "bg-primary text-primary-foreground",
                    !day.isCurrentMonth && "text-muted-foreground"
                  )}
                >
                  {day.date.getDate()}
                </div>

                {/* Groceries for this day */}
                {hasGroceries && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "w-full text-left p-1 rounded hover:bg-muted/50 transition-colors",
                          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                        )}
                      >
                        <div className="space-y-1">
                          {/* Summary badge */}
                          <Badge
                            variant="secondary"
                            className="text-xs w-full justify-center gap-1"
                          >
                            <Carrot className="h-3 w-3" />
                            {day.groceries.length}
                          </Badge>

                          {/* Cost if any */}
                          {totalCost > 0 && (
                            <div className="text-xs text-muted-foreground text-center truncate">
                              {formatPriceFromUAH(totalCost)}
                            </div>
                          )}

                          {/* Preview of items (max 2) */}
                          <div className="space-y-0.5">
                            {day.groceries.slice(0, 2).map((grocery) => (
                              <div
                                key={grocery.id}
                                className="text-xs truncate text-muted-foreground"
                              >
                                {grocery.item_name}
                              </div>
                            ))}
                            {day.groceries.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{day.groceries.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-80 p-0"
                      align="start"
                      side="right"
                    >
                      <div className="p-3 border-b">
                        <div className="font-semibold">
                          {day.date.toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Carrot className="h-3 w-3" />
                            {day.groceries.length} {t("calendar.items")}
                          </span>
                          {totalCost > 0 && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatPriceFromUAH(totalCost)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {day.groceries.map((grocery) => (
                          <button
                            key={grocery.id}
                            className="w-full text-left p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                            onClick={() => onItemClick?.(grocery)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {grocery.item_name}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                                  {grocery.quantity && (
                                    <span>
                                      {grocery.quantity} {grocery.unit || "pcs"}
                                    </span>
                                  )}
                                  {grocery.category && (
                                    <Badge variant="outline" className="text-xs">
                                      {t(`categories.${grocery.category}`)}
                                    </Badge>
                                  )}
                                </div>
                                {grocery.store && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {grocery.store}
                                  </div>
                                )}
                              </div>
                              {grocery.cost && (
                                <div className="text-sm font-medium shrink-0">
                                  {formatPriceFromUAH(grocery.cost)}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary" />
          <span>{t("calendar.today")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <Carrot className="h-3 w-3 mr-1" />
            N
          </Badge>
          <span>{t("calendar.itemsCount")}</span>
        </div>
      </div>
    </div>
  );
}
