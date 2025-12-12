"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Star, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useGetRestaurantMealAnalyticsQuery } from "@/lib/api/restaurants-api";

export function RestaurantMealAnalytics() {
  const t = useTranslations("restaurants");
  const tCommon = useTranslations("common");

  const { data: analytics, isLoading } = useGetRestaurantMealAnalyticsQuery();

  const mealTypeData = useMemo(() => {
    if (!analytics?.by_meal_type) return [];
    const total = analytics.by_meal_type.reduce((sum, item) => sum + item.count, 0);
    return analytics.by_meal_type.map((item) => ({
      type: item.meal_type,
      count: item.count,
      percentage: total > 0 ? (item.count / total) * 100 : 0,
    }));
  }, [analytics]);

  const orderTypeData = useMemo(() => {
    if (!analytics?.by_order_type) return [];
    const total = analytics.by_order_type.reduce((sum, item) => sum + item.count, 0);
    return analytics.by_order_type.map((item) => ({
      type: item.order_type,
      count: item.count,
      percentage: total > 0 ? (item.count / total) * 100 : 0,
    }));
  }, [analytics]);

  const tagData = useMemo(() => {
    if (!analytics?.by_tags) return [];
    const total = analytics.by_tags.reduce((sum, item) => sum + item.count, 0);
    return analytics.by_tags.map((item) => ({
      tag: item.tag,
      count: item.count,
      percentage: total > 0 ? (item.count / total) * 100 : 0,
    }));
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{tCommon("loading")}</div>
      </div>
    );
  }

  if (!analytics || analytics.total_meals === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">{t("analytics.empty.title")}</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {t("analytics.empty.description")}
        </p>
      </div>
    );
  }

  const getMealTypeColor = (type: string) => {
    switch (type) {
      case "breakfast":
        return "bg-yellow-500";
      case "lunch":
        return "bg-green-500";
      case "dinner":
        return "bg-blue-500";
      case "snack":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case "dine_in":
        return "bg-emerald-500";
      case "delivery":
        return "bg-orange-500";
      case "takeout":
        return "bg-cyan-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("analytics.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("analytics.description")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Meals by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analytics.byMealType")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mealTypeData.map((item) => (
                <div key={item.type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t(`mealTypes.${item.type}`)}</span>
                    <span className="text-muted-foreground">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={item.percentage} className={getMealTypeColor(item.type)} />
                </div>
              ))}
              {mealTypeData.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("analytics.noData")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Meals by Order Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analytics.byOrderType")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orderTypeData.map((item) => (
                <div key={item.type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t(`orderTypes.${item.type}`)}</span>
                    <span className="text-muted-foreground">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={item.percentage} className={getOrderTypeColor(item.type)} />
                </div>
              ))}
              {orderTypeData.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("analytics.noData")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Restaurants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analytics.topRestaurants")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.top_restaurants?.slice(0, 5).map((restaurant, index) => (
                <div
                  key={restaurant.restaurant_name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-6 h-6 justify-center">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{restaurant.restaurant_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{restaurant.visit_count} {t("analytics.visits")}</span>
                    {restaurant.avg_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span>{restaurant.avg_rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!analytics.top_restaurants || analytics.top_restaurants.length === 0) && (
                <p className="text-sm text-muted-foreground">{t("analytics.noData")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tags Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analytics.byTags")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tagData.slice(0, 6).map((item) => (
                <div key={item.tag} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t(`tags.${item.tag}`, { defaultValue: item.tag })}</span>
                    <span className="text-muted-foreground">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={item.percentage} className="bg-primary" />
                </div>
              ))}
              {tagData.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("analytics.noTags")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
