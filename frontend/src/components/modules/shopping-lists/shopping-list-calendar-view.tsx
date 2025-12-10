"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle, Circle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type ShoppingListSummary } from "@/lib/api/shopping-lists-api";

interface ShoppingListCalendarViewProps {
  items: ShoppingListSummary[];
  isLoading: boolean;
  onItemClick: (list: ShoppingListSummary) => void;
}

export function ShoppingListCalendarView({
  items,
  isLoading,
  onItemClick,
}: ShoppingListCalendarViewProps) {
  const t = useTranslations("shoppingLists");
  const tCommon = useTranslations("common");

  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Group lists by creation date
  const listsByDate = useMemo(() => {
    const grouped: Record<string, ShoppingListSummary[]> = {};
    items.forEach((list) => {
      const dateKey = list.created_at.split("T")[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(list);
    });
    return grouped;
  }, [items]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(monthEnd);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{tCommon("loading")}</div>
      </div>
    );
  }

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card>
      <CardContent className="p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
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
            {t("calendar.today")}
          </Button>
        </div>

        {/* Week Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
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
            const dayLists = listsByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const hasLists = dayLists.length > 0;

            return (
              <div
                key={dateKey}
                className={`
                  min-h-[80px] p-1 border rounded-md
                  ${isCurrentMonth ? "bg-card" : "bg-muted/30"}
                  ${isToday ? "border-primary" : "border-border"}
                `}
              >
                <div className={`
                  text-xs font-medium mb-1 text-center
                  ${isToday ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"}
                `}>
                  {format(day, "d")}
                </div>

                {hasLists && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-auto p-1 justify-start"
                      >
                        <Badge
                          variant="secondary"
                          className="text-xs w-full justify-center"
                        >
                          {dayLists.length} {dayLists.length === 1 ? "list" : "lists"}
                        </Badge>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          {format(day, "EEEE, MMMM d, yyyy")}
                        </p>
                        {dayLists.map((list) => (
                          <div
                            key={list.id}
                            className="p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                            onClick={() => onItemClick(list)}
                          >
                            <div className="flex items-center gap-2">
                              {list.status === "completed" ? (
                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {list.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {list.purchased_items}/{list.total_items} {t("calendar.items")}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
