"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  Refrigerator,
  ThermometerSnowflake,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { type PantryItem, type StorageLocation } from "@/lib/api/pantry-api";
import { differenceInDays, parseISO } from "date-fns";

interface PantryCalendarViewProps {
  items: PantryItem[];
  isLoading?: boolean;
  onItemClick?: (item: PantryItem) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  items: PantryItem[];
}

function getStorageIcon(location: StorageLocation) {
  const icons: Record<StorageLocation, typeof Refrigerator> = {
    pantry: Home,
    fridge: Refrigerator,
    freezer: ThermometerSnowflake,
    spice_rack: Package,
  };
  const Icon = icons[location] || Package;
  return <Icon className="h-3 w-3" />;
}

function getExpiryStatus(expiryDate: string | null): "expired" | "expiring" | "ok" | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = parseISO(expiryDate);
  const daysUntil = differenceInDays(expiry, today);
  if (daysUntil < 0) return "expired";
  if (daysUntil <= 7) return "expiring";
  return "ok";
}

export function PantryCalendarView({
  items,
  isLoading,
  onItemClick,
}: PantryCalendarViewProps) {
  const t = useTranslations("pantry");
  const tCommon = useTranslations("common");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Group pantry items by expiry date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, PantryItem[]>();
    items.forEach((item) => {
      if (item.expiry_date) {
        const dateKey = item.expiry_date;
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(item);
      }
    });
    return map;
  }, [items]);

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const endDate = new Date(lastDay);
    const daysToAdd = 6 - endDate.getDay() + (6 * 7 - (lastDay.getDate() + firstDay.getDay()));
    endDate.setDate(endDate.getDate() + Math.min(daysToAdd, 42 - (lastDay.getDate() + firstDay.getDay())));

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const current = new Date(startDate);
    while (days.length < 42) {
      const dateKey = current.toISOString().split("T")[0];
      const dayDate = new Date(current);

      days.push({
        date: dayDate,
        isCurrentMonth: current.getMonth() === month,
        isToday: current.getTime() === today.getTime(),
        items: itemsByDate.get(dateKey) || [],
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, itemsByDate]);

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
        <div className="text-muted-foreground">{tCommon("loading")}</div>
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
      <div className="border rounded-lg overflow-x-auto">
        <div className="min-w-[600px]">
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
            const hasItems = day.items.length > 0;
            const expiredCount = day.items.filter(i => getExpiryStatus(i.expiry_date) === "expired").length;
            const expiringCount = day.items.filter(i => getExpiryStatus(i.expiry_date) === "expiring").length;

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[100px] p-1 border-b border-r relative",
                  !day.isCurrentMonth && "bg-muted/30",
                  day.isToday && "bg-primary/5",
                  index % 7 === 6 && "border-r-0"
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

                {/* Items for this day */}
                {hasItems && (
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
                            className={cn(
                              "text-xs w-full justify-center gap-1",
                              expiredCount > 0 && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
                              expiredCount === 0 && expiringCount > 0 && "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                            )}
                          >
                            {(expiredCount > 0 || expiringCount > 0) && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            <Package className="h-3 w-3" />
                            {day.items.length}
                          </Badge>

                          {/* Preview of items (max 2) */}
                          <div className="space-y-0.5">
                            {day.items.slice(0, 2).map((item) => (
                              <div
                                key={item.id}
                                className="text-xs truncate text-muted-foreground"
                              >
                                {item.item_name}
                              </div>
                            ))}
                            {day.items.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{day.items.length - 2} {t("calendar.more")}
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
                            <Package className="h-3 w-3" />
                            {day.items.length} {t("calendar.items")}
                          </span>
                          {expiredCount > 0 && (
                            <span className="flex items-center gap-1 text-red-500">
                              <AlertTriangle className="h-3 w-3" />
                              {expiredCount} {t("calendar.expired")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {day.items.map((item) => {
                          const status = getExpiryStatus(item.expiry_date);
                          return (
                            <button
                              key={item.id}
                              className="w-full text-left p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                              onClick={() => onItemClick?.(item)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className={cn(
                                    "font-medium truncate",
                                    status === "expired" && "text-red-500",
                                    status === "expiring" && "text-orange-500"
                                  )}>
                                    {item.item_name}
                                  </div>
                                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                                    {item.quantity && (
                                      <span>
                                        {item.quantity} {item.unit || t("units.pcs")}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      {getStorageIcon(item.storage_location)}
                                      {t(`storageLocations.${item.storage_location}`)}
                                    </span>
                                  </div>
                                  {item.category && (
                                    <Badge variant="outline" className="text-xs mt-1">
                                      {t(`categories.${item.category}`)}
                                    </Badge>
                                  )}
                                </div>
                                {status && status !== "ok" && (
                                  <AlertTriangle className={cn(
                                    "h-4 w-4 shrink-0",
                                    status === "expired" ? "text-red-500" : "text-orange-500"
                                  )} />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary" />
          <span>{t("calendar.today")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <Package className="h-3 w-3 mr-1" />
            N
          </Badge>
          <span>{t("calendar.itemsExpiring")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
          </Badge>
          <span>{t("calendar.expiringSoon")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
          </Badge>
          <span>{t("calendar.expired")}</span>
        </div>
      </div>
    </div>
  );
}
