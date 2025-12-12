"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO, subDays } from "date-fns";
import {
  Calendar,
  Flame,
  Clock,
  UtensilsCrossed,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatsCard, AnalyticsCard, EmptyState } from "@/components/shared";
import { type NutritionAnalytics } from "@/lib/api/nutrition-api";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

interface NutritionHistoryProps {
  analytics: NutritionAnalytics | undefined;
  isLoading: boolean;
  onSelectDate?: (date: Date) => void;
}

export function NutritionHistory({
  analytics,
  isLoading,
  onSelectDate,
}: NutritionHistoryProps) {
  const t = useTranslations("nutrition");
  const [periodMonths, setPeriodMonths] = useState(3);
  const [currentPage, setCurrentPage] = useState(1);

  if (isLoading) {
    return <HistorySkeleton />;
  }

  if (!analytics || analytics.days_logged === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-12 w-12" />}
        title={t("history.empty.title")}
        description={t("history.empty.description")}
      />
    );
  }

  // Group daily data by week for trend visualization
  const weeklyData = analytics.daily_data.reduce((acc, day) => {
    const weekStart = getWeekStart(day.date);
    if (!acc[weekStart]) {
      acc[weekStart] = {
        totalCalories: 0,
        totalMeals: 0,
        days: 0,
      };
    }
    acc[weekStart].totalCalories += day.total_calories;
    acc[weekStart].totalMeals += day.meal_count;
    acc[weekStart].days += 1;
    return acc;
  }, {} as Record<string, { totalCalories: number; totalMeals: number; days: number }>);

  // Pagination for daily data
  const sortedDailyData = analytics.daily_data.slice().reverse();
  const totalPages = Math.ceil(sortedDailyData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDailyData = sortedDailyData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("history.period")}:</span>
        <Select
          value={periodMonths.toString()}
          onValueChange={(value) => {
            setPeriodMonths(parseInt(value));
            setCurrentPage(1); // Reset to first page when period changes
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">{t("history.months1")}</SelectItem>
            <SelectItem value="3">{t("history.months3")}</SelectItem>
            <SelectItem value="6">{t("history.months6")}</SelectItem>
            <SelectItem value="12">{t("history.months12")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title={t("history.daysLogged")}
          value={analytics.days_logged}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          trend={{ value: "", label: t("history.outOfDays", { days: analytics.period_days }) }}
        />
        <StatsCard
          title={t("history.totalMeals")}
          value={analytics.total_meals}
          icon={<UtensilsCrossed className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title={t("history.avgDailyCalories")}
          value={Math.round(analytics.avg_daily_calories)}
          icon={<Flame className="h-4 w-4 text-muted-foreground" />}
          trend={{ value: "", label: t("units.kcal") }}
        />
      </div>

      {/* Weekly Trend */}
      <AnalyticsCard title={t("history.weeklyTrend")}>
        <div className="space-y-2">
          {Object.entries(weeklyData)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 8)
            .map(([week, data]) => (
              <div
                key={week}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium text-sm">{formatWeekLabel(week)}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.days} {t("history.daysRecorded")}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="font-medium">
                      {Math.round(data.totalCalories / data.days)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("history.avgCal")}</p>
                  </div>
                  <div>
                    <p className="font-medium">{data.totalMeals}</p>
                    <p className="text-xs text-muted-foreground">{t("meals")}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </AnalyticsCard>

      {/* Daily Data List with Pagination */}
      <Card>
        <CardHeader>
          <CardTitle>{t("history.dailyBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {paginatedDailyData.map((day) => (
              <div
                key={day.date}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  "hover:bg-muted/50 cursor-pointer transition-colors"
                )}
                onClick={() => onSelectDate?.(parseISO(day.date))}
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <p className="font-medium">
                      {format(parseISO(day.date), "EEE, MMM d")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {day.meal_count} {day.meal_count === 1 ? t("meal") : t("meals")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">{day.total_calories}</p>
                    <p className="text-xs text-muted-foreground">{t("units.kcal")}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
                      P: {day.total_protein_g.toFixed(0)}g
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                      C: {day.total_carbs_g.toFixed(0)}g
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950">
                      F: {day.total_fat_g.toFixed(0)}g
                    </Badge>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {t("history.page")} {currentPage} {t("history.of")} {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t("history.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  {t("history.next")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getWeekStart(dateStr: string): string {
  const date = parseISO(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day;
  const weekStart = new Date(date);
  weekStart.setDate(diff);
  return format(weekStart, "yyyy-MM-dd");
}

function formatWeekLabel(weekStart: string): string {
  const start = parseISO(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
}

function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 mb-2" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
