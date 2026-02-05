"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, parseISO, addDays } from "date-fns";
import {
  Archive,
  LayoutGrid,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Calendar,
  UtensilsCrossed,
  CalendarCheck,
  Clock,
  History,
} from "lucide-react";

import {
  ModuleTabs,
  TabsContent,
  StatsCard,
  EmptyState,
  AnalyticsCard,
  DistributionList,
} from "@/components/shared";
import { BackToSetupButton } from "@/components/modules/onboarding";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  MealCalendar,
  MealForm,
  MarkCookedDialog,
} from "@/components/modules/meal-planner";
import { ProfileSelector } from "@/components/shared/ProfileSelector";
import {
  useGetWeekMealsQuery,
  useGetMealPlanAnalyticsQuery,
  useGetMealPlanHistoryQuery,
  useBulkArchiveMealPlansMutation,
  useBulkUnarchiveMealPlansMutation,
  useBulkDeleteMealPlansMutation,
  useGetMealPlansQuery,
  type Meal,
  type MealType,
  type MealWithProfile,
  type MealPlanFilters,
  type MealPlanListItem,
} from "@/lib/api/meal-planner-api";
import { useUserStore } from "@/lib/store/user-store";
import { useGetProfilesQuery } from "@/lib/api/profiles-api";
import { MealPlanTable } from "@/components/modules/meal-planner";
import { toast } from "sonner";

export function MealPlannerContent() {
  const t = useTranslations("mealPlanner");
  const tCommon = useTranslations("common");
  const { preferences } = useUserStore();
  const { uiVisibility } = preferences;

  // Week navigation: 0 = current week, -1 = last week, +1 = next week
  const [weekOffset, setWeekOffset] = useState(0);

  // Profile filter: null = All Members (shared + all profiles)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Meal form state
  const [mealFormOpen, setMealFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [editingMeal, setEditingMeal] = useState<Meal | MealWithProfile | null>(null);

  // Mark as cooked dialog
  const [markCookedDialogOpen, setMarkCookedDialogOpen] = useState(false);
  const [markCookedMeal, setMarkCookedMeal] = useState<Meal | null>(null);

  // History period
  const [historyMonths, setHistoryMonths] = useState(3);

  // Archive state (for archive tab)
  const [archiveFilters, setArchiveFilters] = useState<MealPlanFilters>({
    page: 1,
    per_page: 20,
    sort_by: "date_start",
    sort_order: "desc",
    is_archived: true,
  });

  // Calculate target date based on week offset
  const targetDate = useMemo(() => {
    const today = new Date();
    const offsetDate = addDays(today, weekOffset * 7);
    return format(offsetDate, "yyyy-MM-dd");
  }, [weekOffset]);

  // API queries - single query for week meals
  const { data: weekData, isLoading: isLoadingWeek } = useGetWeekMealsQuery({
    targetDate,
    profileId: selectedProfileId,
  });

  const { data: analytics } = useGetMealPlanAnalyticsQuery();
  const { data: historyData } = useGetMealPlanHistoryQuery(historyMonths);
  const { data: archivedData, isLoading: isLoadingArchived } = useGetMealPlansQuery({
    ...archiveFilters,
    profile_id: selectedProfileId,
  });
  const { data: profilesData } = useGetProfilesQuery();

  // Mutations for archive tab
  const [bulkUnarchive] = useBulkUnarchiveMealPlansMutation();
  const [bulkDelete] = useBulkDeleteMealPlansMutation();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigateToTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  const allTabs = [
    { value: "overview", label: t("tabs.overview"), icon: <LayoutGrid className="h-4 w-4" />, alwaysShow: true },
    { value: "archive", label: t("tabs.archive"), icon: <Archive className="h-4 w-4" />, visibilityKey: "showArchiveTab" as const },
    { value: "analysis", label: t("tabs.analysis"), icon: <BarChart3 className="h-4 w-4" />, visibilityKey: "showAnalysisTab" as const },
    { value: "history", label: t("tabs.history"), icon: <History className="h-4 w-4" />, visibilityKey: "showHistoryTab" as const },
  ];

  const tabs = allTabs.filter((tab) => {
    if (tab.alwaysShow) return true;
    if (tab.visibilityKey) return uiVisibility[tab.visibilityKey];
    return true;
  });

  // Handlers
  const handleAddMeal = (date: Date, mealType: MealType) => {
    setSelectedDate(date);
    setSelectedMealType(mealType);
    setEditingMeal(null);
    setMealFormOpen(true);
  };

  const handleEditMeal = (meal: Meal | MealWithProfile) => {
    setEditingMeal(meal);
    setSelectedDate(parseISO(meal.date));
    setSelectedMealType(meal.meal_type);
    setMealFormOpen(true);
  };

  const handleMarkCooked = (meal: Meal | MealWithProfile) => {
    setMarkCookedMeal(meal as Meal);
    setMarkCookedDialogOpen(true);
  };

  const handlePreviousWeek = () => {
    setWeekOffset(weekOffset - 1);
  };

  const handleNextWeek = () => {
    setWeekOffset(weekOffset + 1);
  };

  const handleGoToToday = () => {
    setWeekOffset(0);
  };

  const handleArchivePageChange = (page: number) => {
    setArchiveFilters({ ...archiveFilters, page });
  };

  const handleUnarchiveClick = async (item: MealPlanListItem) => {
    try {
      await bulkUnarchive([item.id]).unwrap();
      toast.success(t("messages.planUnarchived"));
    } catch (error) {
      toast.error(t("messages.unarchiveError"));
      console.error("Error unarchiving plan:", error);
    }
  };

  const handleDeleteClick = async (item: MealPlanListItem) => {
    try {
      await bulkDelete([item.id]).unwrap();
      toast.success(t("messages.planDeleted"));
    } catch (error) {
      toast.error(t("messages.deleteError"));
      console.error("Error deleting plan:", error);
    }
  };

  const handleBulkAction = async (action: string, ids: string[]) => {
    try {
      switch (action) {
        case "unarchive":
          await bulkUnarchive(ids).unwrap();
          toast.success(t("messages.plansUnarchived", { count: ids.length }));
          break;
        case "delete":
          await bulkDelete(ids).unwrap();
          toast.success(t("messages.plansDeleted", { count: ids.length }));
          break;
      }
    } catch (error) {
      toast.error(t("messages.bulkActionError"));
      console.error("Error performing bulk action:", error);
    }
  };

  // Helper to translate meal types
  const translateMealType = (mealType: string) => {
    try {
      return t(`mealTypes.${mealType}`);
    } catch {
      return mealType;
    }
  };

  // Convert analytics data to DistributionList format
  const mealTypeDistributionItems = (analytics?.by_meal_type || []).map((item) => ({
    key: item.meal_type,
    label: translateMealType(item.meal_type),
    value: item.count,
  }));

  const topRecipesItems = (analytics?.most_planned_recipes || []).slice(0, 5).map((item) => ({
    key: item.recipe_id,
    label: item.recipe_name,
    value: item.count,
  }));

  const hasArchivedItems = (archivedData?.total || 0) > 0;

  // Determine profile ID to use when creating meals
  // When "All Members" is selected (null), create shared meals (profile_id = null)
  // When a specific profile is selected, create meals for that profile
  const mealProfileId = selectedProfileId;

  return (
    <div className="space-y-6">
      <ModuleTabs tabs={tabs} defaultTab="overview">
        {/* Overview Tab */}
        <TabsContent value="overview">
          {/* Stats Cards */}
          {uiVisibility.showStatsCards && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <StatsCard
                title={t("stats.totalPlans")}
                value={analytics?.total_meal_plans || 0}
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
              />
              <StatsCard
                title={t("stats.totalMeals")}
                value={analytics?.total_meals || 0}
                icon={<UtensilsCrossed className="h-4 w-4 text-muted-foreground" />}
              />
              <StatsCard
                title={t("stats.avgMealsPerPlan")}
                value={analytics?.avg_meals_per_plan?.toFixed(1) || "-"}
                icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
              />
              <StatsCard
                title={t("stats.recipeVariety")}
                value={analytics?.recipe_variety_score || 0}
                icon={<Clock className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
          )}

          {/* Calendar View */}
          <Card>
            <CardHeader className="pb-2">
              {/* Navigation controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Left: Navigation with date range between arrows */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousWeek}
                    title={t("navigation.previousWeek")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {weekData && (
                    <span className="text-sm font-medium px-2 min-w-[160px] text-center">
                      {format(parseISO(weekData.date_start), "MMM d")} -{" "}
                      {format(parseISO(weekData.date_end), "MMM d, yyyy")}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextWeek}
                    title={t("navigation.nextWeek")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {weekOffset !== 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGoToToday}
                    >
                      {t("navigation.today")}
                    </Button>
                  )}
                </div>

                {/* Right: Profile selector with legend below (only when All Members selected) */}
                <div className="flex flex-col items-end gap-2">
                  <ProfileSelector
                    value={selectedProfileId}
                    onChange={setSelectedProfileId}
                    className="w-[180px]"
                    data-spotlight="members-selector"
                  />
                  {/* Profile legend - always show when All Members selected */}
                  {selectedProfileId === null && (
                    <div className="flex items-center gap-3 flex-wrap min-w-[180px] min-h-[24px] justify-end">
                      {(profilesData?.profiles || []).map((profile) => (
                        <div key={profile.id} className="flex items-center gap-1.5">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: profile.color || '#3B82F6' }}
                          />
                          <span className="text-sm font-normal text-muted-foreground">
                            {profile.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingWeek ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mb-4 animate-pulse" />
                  <p>{tCommon("loading")}</p>
                </div>
              ) : weekData ? (
                <MealCalendar
                  startDate={parseISO(weekData.date_start)}
                  meals={weekData.meals}
                  onAddMeal={handleAddMeal}
                  onEditMeal={handleEditMeal}
                  onMarkCooked={handleMarkCooked}
                />
              ) : (
                <EmptyState
                  icon={<Calendar className="h-12 w-12" />}
                  title={t("empty.title")}
                  description={t("hints.clickToAddMeal")}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive">
          {hasArchivedItems || isLoadingArchived ? (
            <MealPlanTable
              items={archivedData?.items || []}
              isLoading={isLoadingArchived}
              page={archiveFilters.page || 1}
              totalPages={archivedData?.total_pages || 1}
              onPageChange={handleArchivePageChange}
              onDelete={handleDeleteClick}
              onUnarchive={handleUnarchiveClick}
              onBulkAction={handleBulkAction}
              showArchived
            />
          ) : (
            <EmptyState
              icon={<Archive className="h-12 w-12" />}
              title={t("archive.empty.title")}
              description={t("archive.empty.description")}
            />
          )}
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          <div className="space-y-6">
            {analytics && (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                {/* By Meal Type */}
                <AnalyticsCard title={t("analysis.byMealType")}>
                  <DistributionList
                    items={mealTypeDistributionItems}
                    emptyMessage={t("analysis.noData")}
                  />
                </AnalyticsCard>

                {/* Most Planned Recipes */}
                <AnalyticsCard title={t("analysis.mostPlanned")}>
                  <DistributionList
                    items={topRecipesItems}
                    emptyMessage={t("analysis.noData")}
                  />
                </AnalyticsCard>
              </div>
            )}

            {/* Empty state for analysis */}
            {(!analytics || analytics.total_meals === 0) && (
              <EmptyState
                icon={<BarChart3 className="h-12 w-12" />}
                title={t("analysis.empty.title")}
                description={t("analysis.empty.description")}
              />
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="space-y-6">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("history.period")}:</span>
              <Select
                value={historyMonths.toString()}
                onValueChange={(value) => setHistoryMonths(parseInt(value))}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t("history.months3")}</SelectItem>
                  <SelectItem value="6">{t("history.months6")}</SelectItem>
                  <SelectItem value="12">{t("history.months12")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* History stats */}
            {uiVisibility.showStatsCards && historyData && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mb-6">
                <StatsCard
                  title={t("history.totalPlans")}
                  value={historyData.total_plans}
                  icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title={t("history.totalMeals")}
                  value={historyData.total_meals}
                  icon={<UtensilsCrossed className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title={t("history.periodMonths")}
                  value={historyData.period_months}
                  icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
            )}

            {/* Monthly breakdown */}
            {historyData?.monthly_data && historyData.monthly_data.length > 0 && (
              <AnalyticsCard title={t("history.monthlyBreakdown")}>
                <div className="divide-y">
                  {historyData.monthly_data.map((item) => (
                    <div
                      key={item.month}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{item.month_label}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("history.uniqueRecipes", { count: item.unique_recipes })}
                        </p>
                      </div>
                      <div className="flex gap-4 text-right">
                        <div>
                          <p className="font-medium">{item.plans_created}</p>
                          <p className="text-xs text-muted-foreground">{t("history.plans")}</p>
                        </div>
                        <div>
                          <p className="font-medium">{item.meals_planned}</p>
                          <p className="text-xs text-muted-foreground">{t("history.meals")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AnalyticsCard>
            )}

            {/* Empty state for history */}
            {(!historyData || historyData.total_plans === 0) && (
              <EmptyState
                icon={<History className="h-12 w-12" />}
                title={t("history.empty.title")}
                description={t("history.empty.description")}
              />
            )}
          </div>
        </TabsContent>
      </ModuleTabs>

      {/* Meal Form Dialog */}
      <MealForm
        open={mealFormOpen}
        onOpenChange={setMealFormOpen}
        date={selectedDate}
        mealType={selectedMealType}
        profileId={mealProfileId}
        editingMeal={editingMeal}
        onSuccess={() => {
          setMealFormOpen(false);
          setEditingMeal(null);
        }}
      />

      {/* Mark as Cooked Dialog */}
      {markCookedMeal && (
        <MarkCookedDialog
          open={markCookedDialogOpen}
          onOpenChange={setMarkCookedDialogOpen}
          meal={markCookedMeal}
          planId={markCookedMeal.meal_plan_id}
          onSuccess={() => {
            setMarkCookedDialogOpen(false);
            setMarkCookedMeal(null);
          }}
        />
      )}

      {/* Back to Setup button for onboarding */}
      <BackToSetupButton stepId="meal_plan" />
    </div>
  );
}
