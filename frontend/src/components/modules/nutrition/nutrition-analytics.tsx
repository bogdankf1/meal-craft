"use client";

import { useTranslations } from "next-intl";
import {
  UtensilsCrossed,
  Store,
  Cookie,
  TrendingUp,
  Target,
  Calendar,
  Flame,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StatsCard,
  AnalyticsCard,
  DistributionList,
  EmptyState,
} from "@/components/shared";
import { type NutritionAnalytics as NutritionAnalyticsType } from "@/lib/api/nutrition-api";

interface NutritionAnalyticsProps {
  data: NutritionAnalyticsType | undefined;
  isLoading: boolean;
}

export function NutritionAnalytics({ data, isLoading }: NutritionAnalyticsProps) {
  const t = useTranslations("nutrition");

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (!data || data.total_meals === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-12 w-12" />}
        title={t("analytics.empty.title")}
        description={t("analytics.empty.description")}
      />
    );
  }

  // Source distribution data
  const sourceDistribution = [
    {
      key: "meal_plan",
      label: t("sources.meal_plan"),
      value: data.meals_from_plan,
    },
    {
      key: "restaurant",
      label: t("sources.restaurant"),
      value: data.meals_from_restaurant,
    },
    {
      key: "custom",
      label: t("sources.custom"),
      value: data.meals_custom,
    },
  ].filter((item) => item.value > 0);

  // Macro distribution (as percentage of calories)
  const proteinCals = data.avg_daily_protein_g * 4;
  const carbsCals = data.avg_daily_carbs_g * 4;
  const fatCals = data.avg_daily_fat_g * 9;
  const totalCals = proteinCals + carbsCals + fatCals;

  const macroDistribution = totalCals > 0 ? [
    {
      key: "protein",
      label: t("macros.protein"),
      value: Math.round((proteinCals / totalCals) * 100),
    },
    {
      key: "carbs",
      label: t("macros.carbs"),
      value: Math.round((carbsCals / totalCals) * 100),
    },
    {
      key: "fat",
      label: t("macros.fat"),
      value: Math.round((fatCals / totalCals) * 100),
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("analytics.avgDailyCalories")}
          value={Math.round(data.avg_daily_calories)}
          icon={<Flame className="h-4 w-4 text-muted-foreground" />}
          trend={{ value: "", label: t("units.kcal") }}
        />
        <StatsCard
          title={t("analytics.daysLogged")}
          value={data.days_logged}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          trend={{ value: "", label: t("analytics.outOf", { total: data.period_days }) }}
        />
        <StatsCard
          title={t("analytics.totalMeals")}
          value={data.total_meals}
          icon={<UtensilsCrossed className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title={t("analytics.goalAchievement")}
          value={data.goal_achievement_rate !== null ? `${Math.round(data.goal_achievement_rate)}%` : "-"}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          trend={{ value: "", label: data.goal_achievement_rate !== null ? t("analytics.daysOnTarget") : t("analytics.noGoalSet") }}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Meal Source Distribution */}
        <AnalyticsCard title={t("analytics.mealSources")}>
          <DistributionList
            items={sourceDistribution}
            emptyMessage={t("analytics.noData")}
            showPercentage
          />
        </AnalyticsCard>

        {/* Macro Distribution */}
        <AnalyticsCard title={t("analytics.macroDistribution")}>
          <div className="space-y-4">
            <DistributionList
              items={macroDistribution}
              emptyMessage={t("analytics.noData")}
            />
            {/* Visual representation */}
            <div className="flex h-4 rounded-full overflow-hidden">
              {macroDistribution.map((item) => (
                <div
                  key={item.key}
                  className={`transition-all ${
                    item.key === "protein"
                      ? "bg-blue-500"
                      : item.key === "carbs"
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }`}
                  style={{ width: `${item.value}%` }}
                  title={`${item.label}: ${item.value}%`}
                />
              ))}
            </div>
          </div>
        </AnalyticsCard>
      </div>

      {/* Average Daily Nutrients */}
      <Card>
        <CardHeader>
          <CardTitle>{t("analytics.avgDailyNutrients")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <NutrientStat
              label={t("macros.protein")}
              value={data.avg_daily_protein_g}
              unit="g"
              color="blue"
            />
            <NutrientStat
              label={t("macros.carbs")}
              value={data.avg_daily_carbs_g}
              unit="g"
              color="green"
            />
            <NutrientStat
              label={t("macros.fat")}
              value={data.avg_daily_fat_g}
              unit="g"
              color="yellow"
            />
            <NutrientStat
              label={t("macros.fiber")}
              value={data.avg_daily_fiber_g}
              unit="g"
              color="purple"
            />
            <NutrientStat
              label={t("macros.sugar")}
              value={data.avg_daily_sugar_g}
              unit="g"
              color="red"
            />
            <NutrientStat
              label={t("macros.sodium")}
              value={data.avg_daily_sodium_mg}
              unit="mg"
              color="gray"
            />
            <NutrientStat
              label={t("analytics.calories")}
              value={data.avg_daily_calories}
              unit={t("units.kcal")}
              color="orange"
            />
          </div>
        </CardContent>
      </Card>

      {/* Period Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t("analytics.periodSummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {t("analytics.periodSummaryText", {
              days: data.period_days,
              startDate: new Date(data.start_date).toLocaleDateString(),
              endDate: new Date(data.end_date).toLocaleDateString(),
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface NutrientStatProps {
  label: string;
  value: number;
  unit: string;
  color: "blue" | "green" | "yellow" | "purple" | "red" | "gray" | "orange";
}

function NutrientStat({ label, value, unit, color }: NutrientStatProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    orange: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };

  return (
    <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
      <div className="text-xs font-medium opacity-75">{label}</div>
      <div className="text-lg font-bold">
        {value.toFixed(1)}
        <span className="text-xs font-normal ml-1">{unit}</span>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
