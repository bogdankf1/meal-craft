"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  ShoppingCart,
  Carrot,
  BookOpen,
  Wallet,
  Target,
  Plus,
  Clock,
  AlertTriangle,
  Leaf,
  Wrench,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  RefreshCw,
  ChefHat,
  Trash2,
  GraduationCap,
  Utensils,
  Coffee,
  Sun,
  Moon,
} from "lucide-react";
import { useGetDashboardQuery } from "@/lib/api/dashboard-api";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatDistanceToNow, format, isToday, isTomorrow } from "date-fns";
import Link from "next/link";

// Icon mapping for activity types
const activityIcons: Record<string, React.ReactNode> = {
  "book-open": <BookOpen className="h-4 w-4" />,
  "shopping-cart": <ShoppingCart className="h-4 w-4" />,
  package: <Package className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  target: <Target className="h-4 w-4" />,
};

// Meal type icons
const mealTypeIcons: Record<string, React.ReactNode> = {
  breakfast: <Coffee className="h-4 w-4 text-orange-500" />,
  lunch: <Sun className="h-4 w-4 text-yellow-500" />,
  dinner: <Moon className="h-4 w-4 text-indigo-500" />,
  snack: <Utensils className="h-4 w-4 text-green-500" />,
};

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { data, isLoading, refetch } = useGetDashboardQuery();
  const { formatPriceFromUAH } = useCurrency();

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getTrendDirection = (current: number, previous: number): "up" | "down" | "neutral" => {
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "neutral";
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return t("today");
    if (isTomorrow(date)) return t("tomorrow");
    return format(date, "EEE, MMM d");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("description")} />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("description")} />
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">{t("noData")}</p>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("refresh")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("refresh")}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title={t("stats.mealsPlanned")}
          value={`${data.meal_plan_stats.meals_planned_this_week}/${data.meal_plan_stats.total_meal_slots}`}
          icon={<Calendar className="h-5 w-5 text-primary" />}
          trend={{
            value: data.meal_plan_stats.meals_planned_this_week > data.meal_plan_stats.meals_planned_last_week ? "+" : "",
            label: `${data.meal_plan_stats.meals_planned_this_week - data.meal_plan_stats.meals_planned_last_week} ${t("stats.vsLastWeek")}`,
            direction: getTrendDirection(
              data.meal_plan_stats.meals_planned_this_week,
              data.meal_plan_stats.meals_planned_last_week
            ),
          }}
        />
        <StatsCard
          title={t("stats.pantryItems")}
          value={data.pantry_stats.total_items.toString()}
          icon={<Package className="h-5 w-5 text-primary" />}
          description={
            data.pantry_stats.expiring_soon > 0
              ? `${data.pantry_stats.expiring_soon} ${t("stats.expiringSoon")}`
              : undefined
          }
          variant={data.pantry_stats.expiring_soon > 0 ? "warning" : "default"}
        />
        <StatsCard
          title={t("stats.recipes")}
          value={data.recipe_stats.total_recipes.toString()}
          icon={<BookOpen className="h-5 w-5 text-primary" />}
          description={`${data.recipe_stats.favorites} ${t("stats.favorites")}`}
        />
        <StatsCard
          title={t("stats.budgetThisMonth")}
          value={formatPriceFromUAH(data.budget_stats.spent_this_month, { decimals: 0 })}
          icon={<Wallet className="h-5 w-5 text-primary" />}
          trend={{
            value: "",
            label: `${t("stats.avg")} ${formatPriceFromUAH(data.budget_stats.average_monthly, { decimals: 0 })}`,
            direction: getTrendDirection(
              data.budget_stats.average_monthly,
              data.budget_stats.spent_this_month
            ),
          }}
        />
        {data.nutrition_stats && (
          <StatsCard
            title={t("stats.nutritionGoal")}
            value={`${data.nutrition_stats.goal_adherence_percent}%`}
            icon={<Target className="h-5 w-5 text-primary" />}
            description={t("stats.goalAdherence")}
            variant={data.nutrition_stats.goal_adherence_percent >= 70 ? "default" : "warning"}
          />
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Upcoming Meals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              {t("upcomingMeals.title")}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/meal-planner">{t("viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.upcoming_meals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("upcomingMeals.empty")}</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/meal-planner">
                    <Plus className="h-4 w-4 mr-1" />
                    {t("upcomingMeals.startPlanning")}
                  </Link>
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-3">
                  {data.upcoming_meals.map((meal) => (
                    <div
                      key={meal.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-shrink-0">
                        {mealTypeIcons[meal.meal_type] || <Utensils className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {meal.recipe_name || meal.custom_meal_name || t("upcomingMeals.unnamedMeal")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateLabel(meal.date)} • {meal.meal_type}
                          {meal.is_leftover && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {t("upcomingMeals.leftover")}
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {t("expiring.title")}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pantry">{t("viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.expiring_items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Carrot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("expiring.empty")}</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-3">
                  {data.expiring_items.map((item) => (
                    <div
                      key={`${item.source}-${item.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded ${
                            item.days_until_expiry <= 2
                              ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                              : "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400"
                          }`}
                        >
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity && `${item.quantity} ${item.unit || ""} • `}
                            {item.location || item.source}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={item.days_until_expiry <= 2 ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {item.days_until_expiry === 0
                          ? t("expiring.today")
                          : item.days_until_expiry === 1
                          ? t("expiring.tomorrow")
                          : `${item.days_until_expiry} ${t("expiring.days")}`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              {t("activity.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_activity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("activity.empty")}</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-3">
                  {data.recent_activity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="p-1.5 rounded bg-muted">
                        {activityIcons[activity.icon] || <Clock className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.title}</p>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground">{activity.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("quickActions.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/groceries">
                <ShoppingCart className="mr-2 h-4 w-4" />
                {t("quickActions.addGroceries")}
                {data.pending_shopping_lists > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {data.pending_shopping_lists}
                  </Badge>
                )}
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/recipes">
                <BookOpen className="mr-2 h-4 w-4" />
                {t("quickActions.browseRecipes")}
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/meal-planner">
                <Calendar className="mr-2 h-4 w-4" />
                {t("quickActions.planMeals")}
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/nutrition">
                <Target className="mr-2 h-4 w-4" />
                {t("quickActions.trackNutrition")}
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/pantry">
                <Package className="mr-2 h-4 w-4" />
                {t("quickActions.managePantry")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Insights */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Waste Analytics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trash2 className="h-5 w-5 text-red-500" />
              {t("waste.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("waste.thisMonth")}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{data.waste_stats.wasted_this_month} {t("waste.items")}</span>
                  {getTrendIcon(data.waste_stats.wasted_last_month, data.waste_stats.wasted_this_month)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("waste.wasteRate")}</span>
                <span className="font-semibold">{data.waste_stats.waste_rate_percent}%</span>
              </div>
              {data.waste_stats.top_waste_reason && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("waste.topReason")}</span>
                  <Badge variant="outline">{data.waste_stats.top_waste_reason}</Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("waste.costWasted")}</span>
                <span className="font-semibold text-red-600">
                  {formatPriceFromUAH(data.waste_stats.estimated_cost_wasted, { decimals: 0 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5 text-purple-500" />
              {t("skills.title")}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/learning">{t("viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.skills_in_progress.length === 0 && data.learning_paths.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t("skills.empty")}</p>
                <Button variant="link" size="sm" asChild>
                  <Link href="/learning">{t("skills.startLearning")}</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.skills_in_progress.slice(0, 3).map((skill) => (
                  <div key={skill.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{skill.name}</span>
                      <span className="text-xs text-muted-foreground">{skill.progress_percent}%</span>
                    </div>
                    <Progress value={skill.progress_percent} className="h-2" />
                  </div>
                ))}
                {data.learning_paths.slice(0, 1).map((path) => (
                  <div key={path.id} className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{path.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {path.skills_completed}/{path.total_skills}
                      </span>
                    </div>
                    <Progress value={path.progress_percent} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seasonal & Equipment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Leaf className="h-5 w-5 text-green-500" />
              {t("seasonal.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.seasonal_items.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Leaf className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t("seasonal.empty")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.seasonal_items.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Carrot className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    {item.is_peak && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        {t("seasonal.peak")}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Equipment Alerts */}
            {data.equipment_alerts.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  {t("equipment.title")}
                </p>
                {data.equipment_alerts.slice(0, 2).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">{alert.name}</span>
                    <Badge
                      variant={alert.maintenance_type === "overdue" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {alert.maintenance_type === "overdue"
                        ? `${alert.days_overdue}d ${t("equipment.overdue")}`
                        : t("equipment.due")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nutrition Progress (if available) */}
      {data.nutrition_stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-blue-500" />
              {t("nutrition.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("nutrition.calories")}</span>
                  <span className="text-xs text-muted-foreground">
                    {data.nutrition_stats.calories_today} / {data.nutrition_stats.calories_goal}
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    (data.nutrition_stats.calories_today / data.nutrition_stats.calories_goal) * 100,
                    100
                  )}
                  className="h-2"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("nutrition.protein")}</span>
                  <span className="text-xs text-muted-foreground">
                    {data.nutrition_stats.protein_today}g / {data.nutrition_stats.protein_goal}g
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    (data.nutrition_stats.protein_today / data.nutrition_stats.protein_goal) * 100,
                    100
                  )}
                  className="h-2"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("nutrition.carbs")}</span>
                  <span className="text-xs text-muted-foreground">
                    {data.nutrition_stats.carbs_today}g / {data.nutrition_stats.carbs_goal}g
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    (data.nutrition_stats.carbs_today / data.nutrition_stats.carbs_goal) * 100,
                    100
                  )}
                  className="h-2"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("nutrition.fat")}</span>
                  <span className="text-xs text-muted-foreground">
                    {data.nutrition_stats.fat_today}g / {data.nutrition_stats.fat_goal}g
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    (data.nutrition_stats.fat_today / data.nutrition_stats.fat_goal) * 100,
                    100
                  )}
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
