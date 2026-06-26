"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { History, Star, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useGetRestaurantMealHistoryQuery } from "@/lib/api/restaurants-api";

const PERIOD_OPTIONS = [
  { value: "3", label: "months3" },
  { value: "6", label: "months6" },
  { value: "9", label: "months9" },
  { value: "12", label: "months12" },
];

export function RestaurantMealHistory() {
  const t = useTranslations("restaurants");
  const tCommon = useTranslations("common");

  const [period, setPeriod] = useState("6");
  const { data: history, isLoading } = useGetRestaurantMealHistoryQuery(Number(period));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{tCommon("loading")}</div>
      </div>
    );
  }

  if (!history || history.total_meals === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("history.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("history.description")}</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(`history.${opt.label}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <History className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t("history.empty.title")}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("history.empty.description")}
          </p>
        </div>
      </div>
    );
  }

  // Count unique restaurants from top restaurants list
  const uniqueRestaurantCount = history.all_time_top_restaurants?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("history.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("history.description")}</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(`history.${opt.label}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{t("history.totalMeals")}</div>
            <div className="text-2xl font-bold">{history.total_meals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{t("history.uniqueRestaurants")}</div>
            <div className="text-2xl font-bold">{uniqueRestaurantCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{t("history.avgMealsPerMonth")}</div>
            <div className="text-2xl font-bold">
              {history.avg_monthly_meals?.toFixed(1) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{t("history.avgRating")}</div>
            <div className="text-2xl font-bold flex items-center gap-1">
              {history.monthly_data?.[0]?.avg_rating?.toFixed(1) || "-"}
              {history.monthly_data?.[0]?.avg_rating && (
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Restaurants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("history.topRestaurants")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {history.all_time_top_restaurants?.map((restaurant, index) => (
                <div
                  key={restaurant.restaurant_name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-6 h-6 justify-center">
                      {index + 1}
                    </Badge>
                    <div>
                      <div className="font-medium">{restaurant.restaurant_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {restaurant.visit_count} {t("history.visitCount")}
                    </Badge>
                    {restaurant.avg_rating && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {restaurant.avg_rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!history.all_time_top_restaurants || history.all_time_top_restaurants.length === 0) && (
                <p className="text-sm text-muted-foreground">{t("history.noData")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t("history.monthlyBreakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.monthly_data?.map((month) => (
                <div key={month.month} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{month.month_label}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {month.total_meals} {t("history.meals")}
                    </Badge>
                    {month.avg_rating && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {month.avg_rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!history.monthly_data || history.monthly_data.length === 0) && (
                <p className="text-sm text-muted-foreground">{t("history.noData")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
