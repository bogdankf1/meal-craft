"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Check,
  ChevronRight,
  ScanLine,
} from "lucide-react";
import { useGetDashboardQuery } from "@/lib/api/dashboard-api";
import { useCurrency } from "@/components/providers/currency-provider";
import { useUserStore } from "@/lib/store/user-store";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { formatDistanceToNow, format, isToday, isTomorrow } from "date-fns";
import Link from "next/link";
import { OnboardingFlow } from "@/components/modules/onboarding";

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

// Setup steps for the "Get started" card
const SETUP_STEPS = [
  { key: "groceries", title: "Add your groceries", desc: "Import from receipt, photo, or type manually", icon: ShoppingCart, terra: true, href: "/groceries" },
  { key: "pantry", title: "Organize your pantry", desc: "Move items to your virtual kitchen", icon: Package, terra: true, href: "/pantry" },
  { key: "recipes", title: "Discover recipes", desc: "Get suggestions based on your ingredients", icon: BookOpen, terra: false, href: "/recipes" },
  { key: "plan", title: "Plan your first week", desc: "Drag recipes into your weekly planner", icon: Calendar, terra: false, href: "/meal-planner" },
] as const;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardSetupCard({ onNavigate }: { onNavigate: (href: string) => void }) {
  const { steps } = useOnboardingStore();

  const completedKeys = SETUP_STEPS.filter(
    (s) => {
      const storeKey = s.key === "plan" ? "meal_plan" : s.key;
      const step = steps[storeKey as keyof typeof steps];
      return step && (step.status === "completed" || step.status === "skipped");
    }
  );
  const doneCount = completedKeys.length;

  if (doneCount === SETUP_STEPS.length) {
    return (
      <Card className="shadow-sm border-0 bg-[var(--green-ghost)]">
        <CardContent className="py-6 text-center">
          <p className="text-[15px] font-medium text-primary">Setup complete!</p>
          <p className="text-xs text-muted-foreground mt-1">You&apos;re all set. Your kitchen is ready to go.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0">
      <CardContent className="pt-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-base font-medium">Get started</p>
            <p className="text-xs text-muted-foreground mt-0.5">Complete these to unlock the full experience</p>
          </div>
          <Badge variant="secondary" className="rounded-lg">{doneCount}/{SETUP_STEPS.length}</Badge>
        </div>
        <Progress value={(doneCount / SETUP_STEPS.length) * 100} className="h-1 mb-4" />

        {SETUP_STEPS.map((step, i) => {
          const storeKey = step.key === "plan" ? "meal_plan" : step.key;
          const storeStep = steps[storeKey as keyof typeof steps];
          const isDone = storeStep && (storeStep.status === "completed" || storeStep.status === "skipped");
          const Icon = step.icon;
          return (
            <div
              key={step.key}
              onClick={() => !isDone && onNavigate(step.href)}
              className={`flex items-center gap-3.5 py-3.5 transition-opacity ${
                !isDone ? "cursor-pointer" : ""
              } ${i > 0 ? "border-t border-border" : ""} ${isDone ? "opacity-50" : ""}`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isDone ? "bg-primary" : step.terra ? "bg-[var(--terra-wash)]" : "bg-[var(--green-wash)]"
              }`}>
                {isDone
                  ? <Check className="h-[18px] w-[18px] text-white" />
                  : <Icon className={`h-[18px] w-[18px] ${step.terra ? "text-accent" : "text-primary"}`} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
              {!isDone && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { data: session } = useSession();
  const { data, isLoading, refetch } = useGetDashboardQuery();
  const { formatPriceFromUAH } = useCurrency();
  const { preferences } = useUserStore();
  const uiVisibility = preferences.uiVisibility;
  const { isDismissed, isAllComplete } = useOnboardingStore();

  // Show only onboarding if it's active (not dismissed and not complete)
  const showOnboardingOnly = !isDismissed && !isAllComplete();

  const userName = session?.user?.name || "";
  const greeting = getGreeting();

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

  // Show only onboarding flow when active
  if (showOnboardingOnly) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("welcomeDescription")} />
        <OnboardingFlow />
      </div>
    );
  }

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
      {/* Greeting Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-muted-foreground">{greeting}</p>
          <h1 className="text-[22px] font-medium">{userName || t("title")}</h1>
        </div>
        <div className="h-10 w-10 rounded-[14px] bg-primary flex items-center justify-center shrink-0">
          <span className="text-base font-medium text-white">{userName ? userName[0].toUpperCase() : "M"}</span>
        </div>
      </div>

      {/* Get Started Setup Card */}
      {!isDismissed && (
        <DashboardSetupCard onNavigate={(href) => router.push(href)} />
      )}

      {/* Quick Actions */}
      <div>
        <p className="text-sm font-medium mb-3">Quick actions</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => router.push("/groceries")} className="bg-card rounded-2xl py-4 px-3 flex flex-col items-center gap-2 shadow-[0_1px_6px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow cursor-pointer border-0">
            <div className="h-10 w-10 rounded-xl bg-[var(--terra-ghost)] flex items-center justify-center">
              <ScanLine className="h-5 w-5 text-accent" />
            </div>
            <p className="text-[13px] font-medium">Scan Receipt</p>
          </button>
          <button onClick={() => router.push("/recipes")} className="bg-card rounded-2xl py-4 px-3 flex flex-col items-center gap-2 shadow-[0_1px_6px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow cursor-pointer border-0">
            <div className="h-10 w-10 rounded-xl bg-[var(--green-ghost)] flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <p className="text-[13px] font-medium">Browse Recipes</p>
          </button>
        </div>
      </div>

      {/* Today's Meals */}
      <div>
        <p className="text-sm font-medium mb-3">Today&apos;s meals</p>
        <div className="space-y-2">
          {["Breakfast", "Lunch", "Dinner"].map((meal) => {
            const mealKey = meal.toLowerCase();
            const todayMeal = data?.upcoming_meals?.find(
              (m) => m.meal_type === mealKey && isToday(new Date(m.date))
            );
            return (
              <div key={meal} className="bg-card rounded-[14px] shadow-[0_1px_6px_rgba(0,0,0,0.04)] px-4 py-3 flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full shrink-0 ${todayMeal ? "bg-primary" : "bg-muted"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium">{meal}</p>
                  <p className="text-[11px] text-muted-foreground/60">
                    {todayMeal
                      ? (todayMeal.recipe_name || todayMeal.custom_meal_name)
                      : "Not planned yet"}
                  </p>
                </div>
                {!todayMeal && (
                  <button
                    onClick={() => router.push("/meal-planner")}
                    className="rounded-lg bg-[var(--green-ghost)] text-primary text-[11px] font-medium h-7 px-3 hover:bg-[var(--green-wash)] transition-colors cursor-pointer border-0"
                  >
                    Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Cards */}
      {uiVisibility.showDashboardStats && (
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title={t("stats.mealsPlanned")}
          value={`${data.meal_plan_stats.meals_planned_this_week}/${data.meal_plan_stats.total_meal_slots}`}
          icon={<Calendar className="h-4 w-4 text-primary" />}
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
          icon={<Package className="h-4 w-4 text-primary" />}
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
          icon={<BookOpen className="h-4 w-4 text-primary" />}
          description={`${data.recipe_stats.favorites} ${t("stats.favorites")}`}
        />
        <StatsCard
          title={t("stats.budgetThisMonth")}
          value={formatPriceFromUAH(data.budget_stats.spent_this_month, { decimals: 0 })}
          icon={<Wallet className="h-4 w-4 text-primary" />}
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
            icon={<Target className="h-4 w-4 text-primary" />}
            description={t("stats.goalAdherence")}
            variant={data.nutrition_stats.goal_adherence_percent >= 70 ? "default" : "warning"}
          />
        )}
      </div>
      )}

      {/* Upcoming Meals */}
      {uiVisibility.showDashboardUpcomingMeals && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">{t("upcomingMeals.title")}</p>
            <Link href="/meal-planner" className="text-xs text-primary font-medium">{t("viewAll")}</Link>
          </div>
          {data.upcoming_meals.length === 0 ? (
            <div className="bg-card rounded-[1.375rem] shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center py-6 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-[13px]">{t("upcomingMeals.empty")}</p>
              <Link href="/meal-planner" className="text-xs text-primary font-medium mt-1 inline-block">
                {t("upcomingMeals.startPlanning")}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(
                data.upcoming_meals.reduce((groups, meal) => {
                  const dateKey = meal.date;
                  if (!groups[dateKey]) groups[dateKey] = [];
                  groups[dateKey].push(meal);
                  return groups;
                }, {} as Record<string, typeof data.upcoming_meals>)
              ).map(([dateKey, meals]) => (
                <div key={dateKey}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    {formatDateLabel(dateKey)}
                  </p>
                  <div className="space-y-1.5">
                    {meals.map((meal) => (
                      <div
                        key={meal.id}
                        className="flex items-center gap-3 px-3 py-2 bg-card rounded-[14px] shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
                      >
                        {meal.profile_color && (
                          <div
                            className="w-1 h-8 rounded-full flex-shrink-0"
                            style={{ backgroundColor: meal.profile_color }}
                          />
                        )}
                        <div className="flex-shrink-0">
                          {mealTypeIcons[meal.meal_type] || <Utensils className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-[13px]">
                            {meal.recipe_name || meal.custom_meal_name || t("upcomingMeals.unnamedMeal")}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {meal.meal_type}
                            {meal.profile_name && (
                              <span className="ml-1">· {meal.profile_name}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">

        {/* Expiring Soon */}
        {uiVisibility.showDashboardExpiringSoon && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">{t("expiring.title")}</p>
            <Link href="/pantry" className="text-xs text-primary font-medium">{t("viewAll")}</Link>
          </div>
          {data.expiring_items.length === 0 ? (
            <div className="bg-card rounded-[1.375rem] shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center py-6 text-muted-foreground">
              <Carrot className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-[13px]">{t("expiring.empty")}</p>
            </div>
          ) : (
            <div className="bg-card rounded-[1.375rem] shadow-[0_2px_12px_rgba(0,0,0,0.04)] divide-y divide-border">
              {data.expiring_items.slice(0, 6).map((item) => (
                <div
                  key={`${item.source}-${item.id}`}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                        item.days_until_expiry <= 2
                          ? "bg-[var(--error-bg)] text-destructive"
                          : "bg-[var(--terra-wash)] text-accent"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.quantity && `${item.quantity} ${item.unit || ""} · `}
                        {item.location || item.source}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={item.days_until_expiry <= 2 ? "destructive" : "secondary"}
                    className="text-[10px]"
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
          )}
        </div>
        )}

        {/* Recent Activity */}
        {uiVisibility.showDashboardRecentActivity && (
        <div>
          <p className="text-sm font-medium mb-3">{t("activity.title")}</p>
          {data.recent_activity.length === 0 ? (
            <div className="bg-card rounded-[1.375rem] shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center py-6 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-[13px]">{t("activity.empty")}</p>
            </div>
          ) : (
            <div className="bg-card rounded-[1.375rem] shadow-[0_2px_12px_rgba(0,0,0,0.04)] divide-y divide-border">
              {data.recent_activity.slice(0, 6).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-2.5 px-4 py-2.5"
                >
                  <div className="h-7 w-7 rounded-lg bg-[var(--green-ghost)] flex items-center justify-center shrink-0 mt-0.5">
                    {activityIcons[activity.icon] || <Clock className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium">{activity.title}</p>
                    {activity.description && (
                      <p className="text-[11px] text-muted-foreground">{activity.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Quick Actions List */}
        {uiVisibility.showDashboardQuickActions && (
        <div>
          <p className="text-sm font-medium mb-3">{t("quickActions.title")}</p>
          <div className="bg-card rounded-[1.375rem] shadow-[0_2px_12px_rgba(0,0,0,0.04)] divide-y divide-border">
            {[
              { href: "/groceries", icon: <ShoppingCart className="h-3.5 w-3.5 text-accent" />, label: t("quickActions.addGroceries"), bg: "bg-[var(--terra-ghost)]", badge: data.pending_shopping_lists > 0 ? data.pending_shopping_lists : undefined },
              { href: "/recipes", icon: <BookOpen className="h-3.5 w-3.5 text-primary" />, label: t("quickActions.browseRecipes"), bg: "bg-[var(--green-ghost)]" },
              { href: "/meal-planner", icon: <Calendar className="h-3.5 w-3.5 text-primary" />, label: t("quickActions.planMeals"), bg: "bg-[var(--green-ghost)]" },
              { href: "/nutrition", icon: <Target className="h-3.5 w-3.5 text-accent" />, label: t("quickActions.trackNutrition"), bg: "bg-[var(--terra-ghost)]" },
              { href: "/pantry", icon: <Package className="h-3.5 w-3.5 text-primary" />, label: t("quickActions.managePantry"), bg: "bg-[var(--green-ghost)]" },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <div className={`h-7 w-7 rounded-lg ${action.bg} flex items-center justify-center shrink-0`}>{action.icon}</div>
                <span className="text-[13px] font-medium flex-1">{action.label}</span>
                {action.badge !== undefined && <Badge variant="secondary" className="text-[10px]">{action.badge}</Badge>}
                <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
              </Link>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Insights Row */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Waste Analytics */}
        {uiVisibility.showDashboardWasteAnalytics && (
        <div>
          <p className="text-sm font-medium mb-3">{t("waste.title")}</p>
          <div className="bg-card rounded-[1.375rem] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">{t("waste.thisMonth")}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-medium">{data.waste_stats.wasted_this_month} {t("waste.items")}</span>
                {getTrendIcon(data.waste_stats.wasted_last_month, data.waste_stats.wasted_this_month)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">{t("waste.wasteRate")}</span>
              <span className="text-[13px] font-medium">{data.waste_stats.waste_rate_percent}%</span>
            </div>
            {data.waste_stats.top_waste_reason && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">{t("waste.topReason")}</span>
                <Badge variant="outline" className="text-[10px]">{data.waste_stats.top_waste_reason}</Badge>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">{t("waste.costWasted")}</span>
              <span className="text-[13px] font-medium text-destructive">
                {formatPriceFromUAH(data.waste_stats.estimated_cost_wasted, { decimals: 0 })}
              </span>
            </div>
          </div>
        </div>
        )}

        {/* Skills Progress */}
        {uiVisibility.showDashboardSkillsProgress && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">{t("skills.title")}</p>
            <Link href="/learning" className="text-xs text-primary font-medium">{t("viewAll")}</Link>
          </div>
          <div className="bg-card rounded-[1.375rem] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
            {data.skills_in_progress.length === 0 && data.learning_paths.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-[13px]">{t("skills.empty")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.skills_in_progress.slice(0, 3).map((skill) => (
                  <div key={skill.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium">{skill.name}</span>
                      <span className="text-[11px] text-muted-foreground">{skill.progress_percent}%</span>
                    </div>
                    <Progress value={skill.progress_percent} className="h-1.5" />
                  </div>
                ))}
                {data.learning_paths.slice(0, 1).map((path) => (
                  <div key={path.id} className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium">{path.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {path.skills_completed}/{path.total_skills}
                      </span>
                    </div>
                    <Progress value={path.progress_percent} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Seasonal & Equipment */}
        {uiVisibility.showDashboardSeasonalInsights && (
        <div>
          <p className="text-sm font-medium mb-3">{t("seasonal.title")}</p>
          <div className="bg-card rounded-[1.375rem] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
            {data.seasonal_items.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Leaf className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-[13px]">{t("seasonal.empty")}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {data.seasonal_items.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Carrot className="h-3.5 w-3.5 text-accent" />
                      <span className="text-[13px]">{item.name}</span>
                    </div>
                    {item.is_peak && (
                      <Badge variant="secondary" className="text-[10px]">
                        {t("seasonal.peak")}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            {data.equipment_alerts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[13px] font-medium mb-2 flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5" />
                  {t("equipment.title")}
                </p>
                {data.equipment_alerts.slice(0, 2).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-[13px]">{alert.name}</span>
                    <Badge
                      variant={alert.maintenance_type === "overdue" ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {alert.maintenance_type === "overdue"
                        ? `${alert.days_overdue}d ${t("equipment.overdue")}`
                        : t("equipment.due")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Nutrition Progress */}
      {uiVisibility.showDashboardNutrition && data.nutrition_stats && (
        <div>
          <p className="text-sm font-medium mb-3">{t("nutrition.title")}</p>
          <div className="bg-card rounded-[1.375rem] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {[
                { label: t("nutrition.calories"), current: data.nutrition_stats.calories_today, goal: data.nutrition_stats.calories_goal, unit: "" },
                { label: t("nutrition.protein"), current: data.nutrition_stats.protein_today, goal: data.nutrition_stats.protein_goal, unit: "g" },
                { label: t("nutrition.carbs"), current: data.nutrition_stats.carbs_today, goal: data.nutrition_stats.carbs_goal, unit: "g" },
                { label: t("nutrition.fat"), current: data.nutrition_stats.fat_today, goal: data.nutrition_stats.fat_goal, unit: "g" },
              ].map((nutrient) => (
                <div key={nutrient.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium">{nutrient.label}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {nutrient.current}{nutrient.unit} / {nutrient.goal}{nutrient.unit}
                    </span>
                  </div>
                  <Progress
                    value={Math.min((nutrient.current / nutrient.goal) * 100, 100)}
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
