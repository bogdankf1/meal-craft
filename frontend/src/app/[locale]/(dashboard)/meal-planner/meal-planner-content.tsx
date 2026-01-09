"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Plus,
  Archive,
  LayoutGrid,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Import,
  Calendar,
  UtensilsCrossed,
  CalendarCheck,
  Clock,
  Search,
  History,
} from "lucide-react";

import {
  ModuleTabs,
  TabsContent,
  StatsCard,
  EmptyState,
  AnalyticsCard,
  DistributionList,
  ViewSelector,
  CALENDAR_VIEW,
  TABLE_VIEW,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MealPlanTable,
  MealCalendar,
  MealPlanForm,
  MealForm,
  RepeatMealPlanDialog,
  GenerateShoppingListDialog,
  MealPlanImport,
} from "@/components/modules/meal-planner";
import { ProfileSelector } from "@/components/shared/ProfileSelector";
import {
  useGetMealPlansQuery,
  useGetMealPlanQuery,
  useGetCurrentWeekPlanQuery,
  useGetCombinedWeekPlanQuery,
  useGetMealPlanAnalyticsQuery,
  useGetMealPlanHistoryQuery,
  useDeleteMealPlanMutation,
  useBulkArchiveMealPlansMutation,
  useBulkUnarchiveMealPlansMutation,
  useBulkDeleteMealPlansMutation,
  type MealPlanListItem,
  type MealPlanFilters,
  type Meal,
  type MealType,
  type MealWithProfile,
} from "@/lib/api/meal-planner-api";
import { toast } from "sonner";

export function MealPlannerContent() {
  const t = useTranslations("mealPlanner");
  const tCommon = useTranslations("common");

  // View mode: calendar or table
  const [viewMode, setViewMode] = useState<string>("calendar");

  // Profile filter
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // State for active items
  const [filters, setFilters] = useState<MealPlanFilters>({
    page: 1,
    per_page: 20,
    sort_by: "date_start",
    sort_order: "desc",
    is_archived: false,
  });

  // State for archived items
  const [archiveFilters, setArchiveFilters] = useState<MealPlanFilters>({
    page: 1,
    per_page: 20,
    sort_by: "date_start",
    sort_order: "desc",
    is_archived: true,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [historyMonths, setHistoryMonths] = useState(3);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MealPlanListItem | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [mealFormOpen, setMealFormOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [repeatDialogOpen, setRepeatDialogOpen] = useState(false);
  const [repeatItem, setRepeatItem] = useState<MealPlanListItem | null>(null);
  const [shoppingListDialogOpen, setShoppingListDialogOpen] = useState(false);
  const [shoppingListItem, setShoppingListItem] = useState<MealPlanListItem | null>(null);

  // API queries
  const { data: mealPlansData, isLoading: isLoadingPlans } = useGetMealPlansQuery({
    ...filters,
    search: searchQuery || undefined,
    profile_id: selectedProfileId,
  });
  const { data: archivedData, isLoading: isLoadingArchived } = useGetMealPlansQuery({
    ...archiveFilters,
    profile_id: selectedProfileId,
  });
  // For individual profile: fetch single plan
  const { data: currentWeekPlan, isLoading: isLoadingCurrentWeek } = useGetCurrentWeekPlanQuery(
    { profileId: selectedProfileId },
    { skip: selectedProfileId === null } // Skip when "All Members" is selected
  );
  // For "All Members": fetch combined plans
  const { data: combinedWeekPlan, isLoading: isLoadingCombined } = useGetCombinedWeekPlanQuery(
    undefined,
    { skip: selectedProfileId !== null } // Only fetch when "All Members" is selected
  );
  const { data: analytics } = useGetMealPlanAnalyticsQuery();
  const { data: historyData } = useGetMealPlanHistoryQuery(historyMonths);

  // Get selected plan details for calendar view
  const { data: selectedPlanData } = useGetMealPlanQuery(selectedPlanId ?? "", {
    skip: !selectedPlanId,
  });

  // Mutations
  const [deleteMealPlan] = useDeleteMealPlanMutation();
  const [bulkArchive] = useBulkArchiveMealPlansMutation();
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

  const tabs = [
    { value: "overview", label: t("tabs.overview"), icon: <LayoutGrid className="h-4 w-4" /> },
    { value: "import", label: t("tabs.import"), icon: <Import className="h-4 w-4" /> },
    { value: "archive", label: t("tabs.archive"), icon: <Archive className="h-4 w-4" /> },
    { value: "analysis", label: t("tabs.analysis"), icon: <BarChart3 className="h-4 w-4" /> },
    { value: "history", label: t("tabs.history"), icon: <History className="h-4 w-4" /> },
  ];

  const viewOptions = [
    { ...CALENDAR_VIEW, label: t("views.calendar") },
    { ...TABLE_VIEW, label: t("views.table") },
  ];

  const handleAddClick = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEditClick = (item: MealPlanListItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleViewClick = (item: MealPlanListItem) => {
    setSelectedPlanId(item.id);
    setViewMode("calendar");
  };

  const handleDeleteClick = async (item: MealPlanListItem) => {
    try {
      await deleteMealPlan(item.id).unwrap();
      toast.success(t("messages.planDeleted"));
    } catch (error) {
      toast.error(t("messages.deleteError"));
      console.error("Error deleting meal plan:", error);
    }
  };

  const handleRepeatClick = (item: MealPlanListItem) => {
    setRepeatItem(item);
    setRepeatDialogOpen(true);
  };

  const handleGenerateShoppingList = (item: MealPlanListItem) => {
    setShoppingListItem(item);
    setShoppingListDialogOpen(true);
  };

  const handleArchiveClick = async (item: MealPlanListItem) => {
    try {
      await bulkArchive([item.id]).unwrap();
      toast.success(t("messages.planArchived"));
    } catch (error) {
      toast.error(t("messages.archiveError"));
      console.error("Error archiving plan:", error);
    }
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

  const handleBulkAction = async (action: string, ids: string[]) => {
    try {
      switch (action) {
        case "archive":
          await bulkArchive(ids).unwrap();
          toast.success(t("messages.plansArchived", { count: ids.length }));
          break;
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

  const handleAddMeal = (date: Date, mealType: MealType) => {
    setSelectedDate(date);
    setSelectedMealType(mealType);
    setEditingMeal(null);
    setMealFormOpen(true);
  };

  const handleEditMeal = (meal: Meal) => {
    setEditingMeal(meal);
    setSelectedDate(parseISO(meal.date));
    setSelectedMealType(meal.meal_type);
    setMealFormOpen(true);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleArchivePageChange = (page: number) => {
    setArchiveFilters({ ...archiveFilters, page });
  };

  const hasPlans = (mealPlansData?.total || 0) > 0;
  const hasArchivedItems = (archivedData?.total || 0) > 0;

  // Find a plan that contains today's date, or fall back to first plan
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const planContainingToday = mealPlansData?.items?.find(
    (p) => p.date_start <= todayStr && p.date_end >= todayStr
  );
  const fallbackPlanId = planContainingToday?.id || mealPlansData?.items?.[0]?.id;

  // Determine which plan to load for calendar view
  // Priority: selectedPlanId > currentWeekPlan > plan containing today > first available plan
  const planIdToFetch = selectedPlanId || (!currentWeekPlan && fallbackPlanId ? fallbackPlanId : null);

  // Fetch the plan details if we have a plan ID but no selectedPlanData yet
  const { data: fallbackPlanData } = useGetMealPlanQuery(planIdToFetch ?? "", {
    skip: !planIdToFetch || !!selectedPlanId, // Skip if no ID or if we already have selectedPlanId query
  });

  // Use selected plan, current week plan, or fallback plan for calendar view
  const displayPlan = selectedPlanData || currentWeekPlan || fallbackPlanData;

  // Calculate current plan index for navigation
  const plansList = mealPlansData?.items || [];
  const currentPlanIndex = displayPlan
    ? plansList.findIndex(p => p.id === displayPlan.id)
    : -1;
  const totalPlans = plansList.length;

  // Navigation functions for calendar view
  // Plans are sorted by date_start DESC (newest first), so:
  // - Left arrow (previous/older) = higher index
  // - Right arrow (next/newer) = lower index
  const handlePreviousPlan = () => {
    if (currentPlanIndex < totalPlans - 1) {
      setSelectedPlanId(plansList[currentPlanIndex + 1].id);
    }
  };

  const handleNextPlan = () => {
    if (currentPlanIndex > 0) {
      setSelectedPlanId(plansList[currentPlanIndex - 1].id);
    }
  };

  const handleGoToToday = () => {
    // Reset to current week plan or first plan
    setSelectedPlanId(null);
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

  return (
    <div className="space-y-6">
      <ModuleTabs tabs={tabs} defaultTab="overview">
        {/* Overview Tab */}
        <TabsContent value="overview">
          {/* Stats Cards */}
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

          {/* Filters and Actions Row */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-0 sm:min-w-[200px] max-w-md w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("filters.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ProfileSelector
                value={selectedProfileId}
                onChange={setSelectedProfileId}
                className="w-full sm:w-[180px]"
              />
              <ViewSelector
                currentView={viewMode}
                onViewChange={setViewMode}
                views={viewOptions}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              {selectedPlanId && displayPlan && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPlanId(null)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {tCommon("back")}
                  </Button>
                  <Badge variant="outline">{displayPlan.name}</Badge>
                </div>
              )}
              <div className="flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("createPlan")}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleAddClick}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("createNew")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateToTab("import")}>
                    <Import className="h-4 w-4 mr-2" />
                    {t("importPlan")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Calendar or Table View */}
          {viewMode === "calendar" ? (
            // Combined view for "All Members"
            selectedProfileId === null && combinedWeekPlan ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{t("allMembersWeek")}</span>
                      {/* Profile legend */}
                      {combinedWeekPlan.profiles.length > 0 && (
                        <div className="flex items-center gap-3 ml-4">
                          {combinedWeekPlan.profiles.map((profile) => (
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
                    <Badge variant="secondary">
                      {format(parseISO(combinedWeekPlan.date_start), "MMM d")} -{" "}
                      {format(parseISO(combinedWeekPlan.date_end), "MMM d, yyyy")}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MealCalendar
                    startDate={parseISO(combinedWeekPlan.date_start)}
                    meals={combinedWeekPlan.meals}
                    servings={2}
                    onEditMeal={handleEditMeal}
                    showAllMembers
                  />
                </CardContent>
              </Card>
            ) : displayPlan ? (
              <Card>
                <CardHeader className="pb-2">
                  {/* Navigation controls */}
                  {totalPlans > 1 && (
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handlePreviousPlan}
                          disabled={currentPlanIndex >= totalPlans - 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleNextPlan}
                          disabled={currentPlanIndex <= 0}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium ml-2">
                          {displayPlan.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {format(parseISO(displayPlan.date_start), "MMM d")} -{" "}
                          {format(parseISO(displayPlan.date_end), "MMM d, yyyy")}
                        </Badge>
                        {currentWeekPlan && selectedPlanId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGoToToday}
                          >
                            {t("navigation.today")}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {totalPlans <= 1 && (
                    <CardTitle className="flex items-center justify-between">
                      <span>{displayPlan.name}</span>
                      <Badge variant="secondary">
                        {format(parseISO(displayPlan.date_start), "MMM d")} -{" "}
                        {format(parseISO(displayPlan.date_end), "MMM d, yyyy")}
                      </Badge>
                    </CardTitle>
                  )}
                </CardHeader>
                <CardContent>
                  <MealCalendar
                    startDate={parseISO(displayPlan.date_start)}
                    meals={displayPlan.meals || []}
                    servings={displayPlan.servings}
                    onAddMeal={handleAddMeal}
                    onEditMeal={handleEditMeal}
                  />
                </CardContent>
              </Card>
            ) : (
              <EmptyState
                icon={<Calendar className="h-12 w-12" />}
                title={t("empty.title")}
                description={t("empty.description")}
                action={{ label: t("createPlan"), onClick: handleAddClick }}
              />
            )
          ) : hasPlans || isLoadingPlans ? (
            <MealPlanTable
              items={mealPlansData?.items || []}
              isLoading={isLoadingPlans}
              page={filters.page || 1}
              totalPages={mealPlansData?.total_pages || 1}
              onPageChange={handlePageChange}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onView={handleViewClick}
              onArchive={handleArchiveClick}
              onRepeat={handleRepeatClick}
              onGenerateShoppingList={handleGenerateShoppingList}
              onBulkAction={handleBulkAction}
            />
          ) : (
            <EmptyState
              icon={<Calendar className="h-12 w-12" />}
              title={t("empty.title")}
              description={t("empty.description")}
              action={{ label: t("createPlan"), onClick: handleAddClick }}
            />
          )}

        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <MealPlanImport onViewItems={() => navigateToTab("overview")} />
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
              onView={handleViewClick}
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
                action={{ label: t("createPlan"), onClick: handleAddClick }}
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
            {historyData && (
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
                action={{ label: t("createPlan"), onClick: handleAddClick }}
              />
            )}
          </div>
        </TabsContent>
      </ModuleTabs>

      {/* Meal Plan Form Dialog */}
      <MealPlanForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingItem={editingItem}
        defaultProfileId={selectedProfileId}
        onSuccess={() => {
          setFormOpen(false);
          setEditingItem(null);
        }}
      />

      {/* Meal Form Dialog */}
      {displayPlan && (
        <MealForm
          open={mealFormOpen}
          onOpenChange={setMealFormOpen}
          planId={displayPlan.id}
          date={selectedDate}
          mealType={selectedMealType}
          editingMeal={editingMeal}
          defaultServings={displayPlan.servings}
          onSuccess={() => {
            setMealFormOpen(false);
            setEditingMeal(null);
          }}
        />
      )}

      {/* Repeat Meal Plan Dialog */}
      <RepeatMealPlanDialog
        open={repeatDialogOpen}
        onOpenChange={setRepeatDialogOpen}
        mealPlan={repeatItem}
        onSuccess={() => {
          setRepeatDialogOpen(false);
          setRepeatItem(null);
        }}
      />

      {/* Generate Shopping List Dialog */}
      <GenerateShoppingListDialog
        open={shoppingListDialogOpen}
        onOpenChange={setShoppingListDialogOpen}
        mealPlan={shoppingListItem}
        onSuccess={() => {
          setShoppingListDialogOpen(false);
          setShoppingListItem(null);
        }}
      />
    </div>
  );
}
