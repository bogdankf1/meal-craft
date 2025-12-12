"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Plus,
  LayoutGrid,
  Target,
  BarChart3,
  History,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Settings,
  Cookie,
} from "lucide-react";

import {
  ModuleTabs,
  TabsContent,
  StatsCard,
  EmptyState,
  ViewSelector,
  CALENDAR_VIEW,
  LIST_VIEW,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  NutritionDailyView,
  NutritionCalendar,
  NutritionGoalForm,
  NutritionLogForm,
  NutritionAnalytics,
  NutritionHistory,
} from "@/components/modules/nutrition";
import {
  useGetDailyNutritionQuery,
  useGetActiveNutritionGoalQuery,
  useGetNutritionGoalsQuery,
  useGetNutritionAnalyticsQuery,
  useDeleteNutritionGoalMutation,
  type NutritionGoal,
  type MealType,
} from "@/lib/api/nutrition-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function NutritionContent() {
  const t = useTranslations("nutrition");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Selected date for daily view
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateString = format(selectedDate, "yyyy-MM-dd");

  // View mode: calendar or list
  const [viewMode, setViewMode] = useState<string>("list");

  // Analytics period
  const [analyticsDays, setAnalyticsDays] = useState(30);

  // Dialog states
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<NutritionGoal | null>(null);
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [defaultMealType, setDefaultMealType] = useState<MealType | undefined>();

  // API queries
  const { data: dailyData, isLoading: isLoadingDaily } = useGetDailyNutritionQuery(dateString);
  const { data: activeGoal, isLoading: isLoadingGoal } = useGetActiveNutritionGoalQuery();
  const { data: allGoals } = useGetNutritionGoalsQuery(false);
  const { data: analytics, isLoading: isLoadingAnalytics } = useGetNutritionAnalyticsQuery(analyticsDays);

  // Mutations
  const [deleteGoal] = useDeleteNutritionGoalMutation();

  const navigateToTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  const tabs = [
    { value: "overview", label: t("tabs.overview"), icon: <LayoutGrid className="h-4 w-4" /> },
    { value: "goals", label: t("tabs.goals"), icon: <Target className="h-4 w-4" /> },
    { value: "analytics", label: t("tabs.analytics"), icon: <BarChart3 className="h-4 w-4" /> },
    { value: "history", label: t("tabs.history"), icon: <History className="h-4 w-4" /> },
  ];

  const viewOptions = [
    { ...LIST_VIEW, label: t("views.daily") },
    { ...CALENDAR_VIEW, label: t("views.calendar") },
  ];

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleAddEntry = (mealType?: MealType) => {
    setDefaultMealType(mealType);
    setLogFormOpen(true);
  };

  const handleEditGoal = (goal: NutritionGoal) => {
    setEditingGoal(goal);
    setGoalFormOpen(true);
  };

  const handleDeleteGoal = async (goal: NutritionGoal) => {
    try {
      await deleteGoal(goal.id).unwrap();
      toast.success(t("messages.goalDeleted"));
    } catch (error) {
      toast.error(t("messages.errorDeletingGoal"));
      console.error("Error deleting goal:", error);
    }
  };

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <ModuleTabs tabs={tabs} defaultTab="overview">
        {/* Overview Tab */}
        <TabsContent value="overview">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatsCard
              title={t("stats.todayCalories")}
              value={dailyData?.total_calories || 0}
              icon={<Target className="h-4 w-4 text-muted-foreground" />}
              trend={
                activeGoal?.daily_calories
                  ? { value: `${t("stats.of")} ${activeGoal.daily_calories}`, label: t("units.kcal") }
                  : undefined
              }
            />
            <StatsCard
              title={t("stats.todayProtein")}
              value={`${(dailyData?.total_protein_g || 0).toFixed(0)}g`}
              icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
              trend={
                activeGoal?.daily_protein_g
                  ? { value: `${t("stats.of")} ${activeGoal.daily_protein_g}g`, label: "" }
                  : undefined
              }
            />
            <StatsCard
              title={t("stats.todayMeals")}
              value={dailyData?.meal_count || 0}
              icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            />
            <StatsCard
              title={t("stats.goalProgress")}
              value={
                dailyData?.calories_percent !== null && dailyData?.calories_percent !== undefined
                  ? `${Math.round(dailyData.calories_percent)}%`
                  : "-"
              }
              icon={<Target className="h-4 w-4 text-muted-foreground" />}
              trend={{ value: "", label: activeGoal ? t("stats.ofDailyGoal") : t("stats.noGoalSet") }}
            />
          </div>

          {/* View Controls */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousDay}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextDay}
                  disabled={isToday}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold mx-2">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </span>
                {!isToday && (
                  <Button variant="outline" size="sm" onClick={handleToday}>
                    {t("today")}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ViewSelector
                  currentView={viewMode}
                  onViewChange={setViewMode}
                  views={viewOptions}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("addEntry")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAddEntry("breakfast")}>
                      {t("mealTypes.breakfast")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddEntry("lunch")}>
                      {t("mealTypes.lunch")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddEntry("dinner")}>
                      {t("mealTypes.dinner")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddEntry("snack")}>
                      {t("mealTypes.snack")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Daily View or Calendar */}
          {viewMode === "list" ? (
            <NutritionDailyView
              data={dailyData}
              isLoading={isLoadingDaily}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <NutritionCalendar
                  dailyData={analytics?.daily_data || []}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  calorieGoal={activeGoal?.daily_calories}
                  isLoading={isLoadingAnalytics}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals">
          <div className="space-y-6">
            {/* Active Goal Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t("goals.activeGoal")}</span>
                  <Button onClick={() => {
                    setEditingGoal(null);
                    setGoalFormOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("goals.newGoal")}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingGoal ? (
                  <div className="text-muted-foreground">{tCommon("loading")}</div>
                ) : activeGoal ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge>{t(`goalTypes.${activeGoal.goal_type}`)}</Badge>
                        <Badge variant="outline" className="text-green-600">
                          {t("goals.active")}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditGoal(activeGoal)}
                        >
                          {tCommon("edit")}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <GoalStat
                        label={t("macros.calories")}
                        value={activeGoal.daily_calories}
                        unit={t("units.kcal")}
                      />
                      <GoalStat
                        label={t("macros.protein")}
                        value={activeGoal.daily_protein_g}
                        unit="g"
                      />
                      <GoalStat
                        label={t("macros.carbs")}
                        value={activeGoal.daily_carbs_g}
                        unit="g"
                      />
                      <GoalStat
                        label={t("macros.fat")}
                        value={activeGoal.daily_fat_g}
                        unit="g"
                      />
                      <GoalStat
                        label={t("macros.fiber")}
                        value={activeGoal.daily_fiber_g}
                        unit="g"
                      />
                      <GoalStat
                        label={t("macros.sugar")}
                        value={activeGoal.daily_sugar_g}
                        unit="g"
                      />
                      <GoalStat
                        label={t("macros.sodium")}
                        value={activeGoal.daily_sodium_mg}
                        unit="mg"
                      />
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={<Target className="h-12 w-12" />}
                    title={t("goals.empty.title")}
                    description={t("goals.empty.description")}
                    action={{
                      label: t("goals.createGoal"),
                      onClick: () => setGoalFormOpen(true),
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* All Goals History */}
            {allGoals && allGoals.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("goals.goalHistory")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {allGoals
                      .filter((g) => g.id !== activeGoal?.id)
                      .map((goal) => (
                        <div
                          key={goal.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {t(`goalTypes.${goal.goal_type}`)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {goal.daily_calories} {t("units.kcal")}
                            </span>
                            {goal.start_date && (
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(goal.start_date), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditGoal(goal)}
                            >
                              {tCommon("edit")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteGoal(goal)}
                            >
                              {tCommon("delete")}
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <NutritionAnalytics
            data={analytics}
            isLoading={isLoadingAnalytics}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <NutritionHistory
            analytics={analytics}
            isLoading={isLoadingAnalytics}
            onSelectDate={(date) => {
              setSelectedDate(date);
              navigateToTab("overview");
            }}
          />
        </TabsContent>
      </ModuleTabs>

      {/* Goal Form Dialog */}
      <NutritionGoalForm
        open={goalFormOpen}
        onOpenChange={setGoalFormOpen}
        editingGoal={editingGoal}
        onSuccess={() => {
          setGoalFormOpen(false);
          setEditingGoal(null);
        }}
      />

      {/* Log Form Dialog */}
      <NutritionLogForm
        open={logFormOpen}
        onOpenChange={setLogFormOpen}
        defaultDate={selectedDate}
        defaultMealType={defaultMealType}
        onSuccess={() => {
          setLogFormOpen(false);
          setDefaultMealType(undefined);
        }}
      />
    </div>
  );
}

interface GoalStatProps {
  label: string;
  value: number | null;
  unit: string;
}

function GoalStat({ label, value, unit }: GoalStatProps) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/30">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-lg font-bold">
        {value !== null ? value : "-"}
        {value !== null && <span className="text-xs font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
}
