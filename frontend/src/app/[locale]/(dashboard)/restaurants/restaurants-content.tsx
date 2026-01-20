"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Plus,
  UtensilsCrossed,
  LayoutGrid,
  BarChart3,
  ChevronDown,
  Archive,
  History,
  Import,
  TableIcon,
  Calendar,
  Star,
  Truck,
  TrendingUp,
  CalendarDays,
  Heart,
  LayoutList,
  List,
} from "lucide-react";

import {
  ModuleTabs,
  TabsContent,
  StatsCard,
  EmptyState,
  AnalyticsCard,
  BarChart,
  DistributionList,
  TopItemsList,
  ViewSelector,
  type ViewOption,
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
import {
  RestaurantMealForm,
  RestaurantMealBulkForm,
  RestaurantMealTable,
  RestaurantMealFiltersBar,
  RestaurantMealCalendarView,
  RestaurantMealImport,
  RestaurantsInsights,
} from "@/components/modules/restaurants";
import {
  useGetRestaurantMealsQuery,
  useGetRestaurantMealAnalyticsQuery,
  useGetRestaurantMealHistoryQuery,
  type RestaurantMeal,
  type RestaurantMealFilters,
} from "@/lib/api/restaurants-api";
import { useUserStore } from "@/lib/store/user-store";

export function RestaurantsContent() {
  const t = useTranslations("restaurants");
  const tCommon = useTranslations("common");
  const { preferences } = useUserStore();
  const { uiVisibility } = preferences;

  // State for active items
  const [filters, setFilters] = useState<RestaurantMealFilters>({
    page: 1,
    per_page: 20,
    sort_by: "meal_date",
    sort_order: "desc",
    is_archived: false,
  });

  // State for archived items
  const [archiveFilters, setArchiveFilters] = useState<RestaurantMealFilters>({
    page: 1,
    per_page: 20,
    sort_by: "meal_date",
    sort_order: "desc",
    is_archived: true,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [bulkFormOpen, setBulkFormOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<RestaurantMeal | null>(null);
  const [historyMonths, setHistoryMonths] = useState(3);
  const [currentView, setCurrentView] = useState<string>("table");
  const [archiveView, setArchiveView] = useState<string>("table");

  // View options
  const viewOptions: ViewOption[] = [
    {
      value: "table",
      label: t("views.table"),
      icon: <TableIcon className="h-4 w-4" />,
    },
    {
      value: "calendar",
      label: t("views.calendar"),
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      value: "cards",
      label: t("views.cards"),
      icon: <LayoutList className="h-4 w-4" />,
    },
  ];

  // API queries
  const { data: mealsData, isLoading: isLoadingMeals } =
    useGetRestaurantMealsQuery(filters);
  const { data: archivedData, isLoading: isLoadingArchived } =
    useGetRestaurantMealsQuery(archiveFilters);
  const { data: analytics } = useGetRestaurantMealAnalyticsQuery();
  const { data: historyData, isLoading: isLoadingHistory } =
    useGetRestaurantMealHistoryQuery(historyMonths);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigateToTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  const allTabs = [
    { value: "overview", label: t("tabs.overview"), icon: <LayoutGrid className="h-4 w-4" /> },
    { value: "import", label: t("tabs.import"), icon: <Import className="h-4 w-4" /> },
    { value: "analytics", label: t("tabs.analytics"), icon: <BarChart3 className="h-4 w-4" />, visibilityKey: "showAnalysisTab" as const },
    { value: "history", label: t("tabs.history"), icon: <History className="h-4 w-4" />, visibilityKey: "showHistoryTab" as const },
    { value: "archive", label: t("tabs.archive"), icon: <Archive className="h-4 w-4" />, visibilityKey: "showArchiveTab" as const },
  ];

  const tabs = allTabs.filter(tab => !tab.visibilityKey || uiVisibility[tab.visibilityKey]);

  const handleAddClick = () => {
    setEditingMeal(null);
    setFormOpen(true);
  };

  const handleEditClick = (meal: RestaurantMeal) => {
    setEditingMeal(meal);
    setFormOpen(true);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleArchivePageChange = (page: number) => {
    setArchiveFilters({ ...archiveFilters, page });
  };

  // Helper to translate meal type
  const translateMealType = (type: string) => {
    try {
      return t(`mealTypes.${type}`);
    } catch {
      return type;
    }
  };

  // Helper to translate order type
  const translateOrderType = (type: string) => {
    try {
      return t(`orderTypes.${type}`);
    } catch {
      return type;
    }
  };

  const hasMeals = (mealsData?.total || 0) > 0;
  const hasArchivedMeals = (archivedData?.total || 0) > 0;

  // Convert analytics data to component formats
  const orderTypeItems = analytics?.by_order_type.map((item) => ({
    key: item.order_type,
    label: translateOrderType(item.order_type),
    value: item.count,
  })) || [];

  const mealTypeItems = analytics?.by_meal_type.map((item) => ({
    key: item.meal_type,
    label: translateMealType(item.meal_type),
    value: item.count,
  })) || [];

  const topRestaurantsItems = analytics?.top_restaurants.map((item) => ({
    key: item.restaurant_name,
    name: item.restaurant_name,
    primaryValue: item.visit_count,
    primaryLabel: t("analytics.visits"),
    secondaryInfo: item.avg_rating
      ? [{ label: t("analytics.avgRating"), value: `${item.avg_rating}/5` }]
      : [],
  })) || [];

  const tagItems = analytics?.by_tags.map((item) => ({
    key: item.tag,
    label: t(`tags.${item.tag}`, { defaultValue: item.tag }),
    value: item.count,
  })) || [];

  // History data
  const mealsTrendData = historyData?.monthly_data.map((month) => ({
    key: month.month,
    value: month.total_meals,
    label: month.month_label.split(" ")[0],
  })) || [];

  const historyTopRestaurants = historyData?.all_time_top_restaurants.map((item) => ({
    key: item.restaurant_name,
    name: item.restaurant_name,
    primaryValue: item.visit_count,
    primaryLabel: t("analytics.visits"),
    secondaryInfo: item.avg_rating
      ? [{ label: t("analytics.avgRating"), value: `${item.avg_rating}/5` }]
      : [],
  })) || [];

  return (
    <>
      <ModuleTabs tabs={tabs} defaultTab="overview">
        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {uiVisibility.showStatsCards && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  title={t("stats.totalMeals")}
                  value={mealsData?.total?.toString() || "0"}
                  icon={<UtensilsCrossed className="h-5 w-5 text-primary" />}
                />
                <StatsCard
                  title={t("stats.thisWeek")}
                  value={analytics?.meals_this_week?.toString() || "0"}
                  icon={<CalendarDays className="h-5 w-5 text-blue-500" />}
                />
                <StatsCard
                  title={t("stats.avgRating")}
                  value={analytics?.avg_rating ? `${analytics.avg_rating}/5` : "-"}
                  icon={<Star className="h-5 w-5 text-yellow-500" />}
                />
                <StatsCard
                  title={t("stats.avgFeeling")}
                  value={analytics?.avg_feeling ? `${analytics.avg_feeling}/5` : "-"}
                  icon={<Heart className="h-5 w-5 text-red-500" />}
                />
              </div>
            )}

            {/* Cross-module Insights */}
            {uiVisibility.showInsights && mealsData?.items && mealsData.items.length > 0 && (
              <RestaurantsInsights
                meals={mealsData.items}
                onNavigateToRecipes={() => router.push("/recipes")}
                onNavigateToLearning={() => router.push("/learning")}
                onRecipeClick={(recipeName) => {
                  const encodedSearch = encodeURIComponent(recipeName);
                  router.push(`/recipes?search=${encodedSearch}`);
                }}
                onSkillClick={(skillName) => {
                  const encodedSearch = encodeURIComponent(skillName);
                  router.push(`/learning?search=${encodedSearch}`);
                }}
              />
            )}

            {/* Filters and Actions - Two line layout for better responsiveness */}
            <div className="space-y-3">
              {/* First row: Search and filters */}
              <div className="w-full">
                <RestaurantMealFiltersBar
                  filters={filters}
                  onFiltersChange={setFilters}
                  visibility={{
                    showSearch: uiVisibility.showSearchBar,
                    showFilters: uiVisibility.showFilters,
                    showDateRange: uiVisibility.showDateRange,
                    showSorting: uiVisibility.showSorting,
                  }}
                />
              </div>

              {/* Second row: View selector and actions */}
              <div className="flex flex-wrap items-center justify-start gap-3">
                {uiVisibility.showViewSelector && (
                  <ViewSelector
                    currentView={currentView}
                    onViewChange={setCurrentView}
                    views={viewOptions}
                  />
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("addMeal")}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleAddClick}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("addMeal")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBulkFormOpen(true)}>
                      <List className="h-4 w-4 mr-2" />
                      {t("bulkForm.addMultiple")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigateToTab("import")}>
                      <Import className="h-4 w-4 mr-2" />
                      {t("tabs.import")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {hasMeals ? (
              currentView === "table" ? (
                <RestaurantMealTable
                  data={mealsData}
                  isLoading={isLoadingMeals}
                  page={filters.page || 1}
                  onPageChange={handlePageChange}
                  onEdit={handleEditClick}
                />
              ) : currentView === "calendar" ? (
                <RestaurantMealCalendarView
                  items={mealsData?.items || []}
                  isLoading={isLoadingMeals}
                  onItemClick={handleEditClick}
                />
              ) : (
                <RestaurantMealTable
                  data={mealsData}
                  isLoading={isLoadingMeals}
                  page={filters.page || 1}
                  onPageChange={handlePageChange}
                  onEdit={handleEditClick}
                  cardView
                />
              )
            ) : (
              <EmptyState
                icon={<UtensilsCrossed />}
                title={t("empty.title")}
                description={t("empty.description")}
                action={{ label: t("addMeal"), onClick: handleAddClick }}
              />
            )}
          </div>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <RestaurantMealImport
            onViewItems={() => navigateToTab("overview")}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            {hasMeals && analytics ? (
              <>
                {uiVisibility.showStatsCards && (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                      title={t("stats.thisWeek")}
                      value={analytics.meals_this_week?.toString() || "0"}
                      icon={<CalendarDays className="h-5 w-5 text-blue-500" />}
                    />
                    <StatsCard
                      title={t("stats.thisMonth")}
                      value={analytics.meals_this_month?.toString() || "0"}
                      icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
                    />
                    <StatsCard
                      title={t("stats.avgRating")}
                      value={analytics.avg_rating ? `${analytics.avg_rating}/5` : "-"}
                      icon={<Star className="h-5 w-5 text-yellow-500" />}
                    />
                    <StatsCard
                      title={t("stats.avgFeeling")}
                      value={analytics.avg_feeling ? `${analytics.avg_feeling}/5` : "-"}
                      icon={<Heart className="h-5 w-5 text-red-500" />}
                    />
                  </div>
                )}

                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  <AnalyticsCard title={t("analytics.byOrderType")}>
                    <DistributionList
                      items={orderTypeItems}
                      valueLabel={t("analytics.meals")}
                      emptyMessage={t("analytics.noData")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard title={t("analytics.byMealType")}>
                    <DistributionList
                      items={mealTypeItems}
                      valueLabel={t("analytics.meals")}
                      emptyMessage={t("analytics.noData")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard title={t("analytics.topRestaurants")}>
                    <TopItemsList
                      items={topRestaurantsItems}
                      emptyMessage={t("analytics.noData")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard title={t("analytics.byTags")}>
                    <DistributionList
                      items={tagItems}
                      valueLabel={t("analytics.meals")}
                      emptyMessage={t("analytics.noTags")}
                    />
                  </AnalyticsCard>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<BarChart3 />}
                title={t("analytics.empty.title")}
                description={t("analytics.empty.description")}
                action={{ label: t("addMeal"), onClick: handleAddClick }}
              />
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{t("history.title")}</h2>
                <p className="text-sm text-muted-foreground">{t("history.description")}</p>
              </div>
              <Select value={historyMonths.toString()} onValueChange={(v) => setHistoryMonths(parseInt(v))}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t("history.months3")}</SelectItem>
                  <SelectItem value="6">{t("history.months6")}</SelectItem>
                  <SelectItem value="9">{t("history.months9")}</SelectItem>
                  <SelectItem value="12">{t("history.months12")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">{tCommon("loading")}</div>
              </div>
            ) : historyData && historyData.total_meals > 0 ? (
              <>
                {uiVisibility.showStatsCards && (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                    <StatsCard
                      title={t("history.totalInPeriod")}
                      value={historyData.total_meals.toString()}
                      icon={<UtensilsCrossed className="h-5 w-5 text-blue-500" />}
                    />
                    <StatsCard
                      title={t("history.avgMonthly")}
                      value={Math.round(historyData.avg_monthly_meals).toString()}
                      icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
                    />
                    <StatsCard
                      title={t("history.uniqueRestaurants")}
                      value={historyData.all_time_top_restaurants.length.toString()}
                      icon={<Truck className="h-5 w-5 text-orange-500" />}
                    />
                  </div>
                )}

                <AnalyticsCard
                  title={t("history.mealsTrend")}
                  icon={<TrendingUp className="h-4 w-4" />}
                >
                  <BarChart
                    data={mealsTrendData}
                    color="bg-primary"
                    emptyMessage={t("history.noData")}
                  />
                </AnalyticsCard>

                <AnalyticsCard title={t("history.topRestaurants")}>
                  <TopItemsList
                    items={historyTopRestaurants}
                    emptyMessage={t("history.noData")}
                  />
                </AnalyticsCard>
              </>
            ) : (
              <EmptyState
                icon={<History />}
                title={t("history.empty.title")}
                description={t("history.empty.description")}
                action={{ label: t("addMeal"), onClick: handleAddClick }}
              />
            )}
          </div>
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive">
          <div className="space-y-6">
            {uiVisibility.showStatsCards && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                <StatsCard
                  title={t("stats.archivedMeals")}
                  value={archivedData?.total?.toString() || "0"}
                  icon={<Archive className="h-5 w-5 text-muted-foreground" />}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full">
                <RestaurantMealFiltersBar
                  filters={archiveFilters}
                  onFiltersChange={(f) => setArchiveFilters({ ...f, is_archived: true })}
                  visibility={{
                    showSearch: uiVisibility.showSearchBar,
                    showFilters: uiVisibility.showFilters,
                    showDateRange: uiVisibility.showDateRange,
                    showSorting: uiVisibility.showSorting,
                  }}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {uiVisibility.showViewSelector && (
                  <ViewSelector
                    currentView={archiveView}
                    onViewChange={setArchiveView}
                    views={viewOptions}
                  />
                )}
              </div>
            </div>

            {hasArchivedMeals ? (
              archiveView === "table" ? (
                <RestaurantMealTable
                  data={archivedData}
                  isLoading={isLoadingArchived}
                  page={archiveFilters.page || 1}
                  onPageChange={handleArchivePageChange}
                  onEdit={handleEditClick}
                  isArchiveView
                />
              ) : archiveView === "calendar" ? (
                <RestaurantMealCalendarView
                  items={archivedData?.items || []}
                  isLoading={isLoadingArchived}
                  onItemClick={handleEditClick}
                />
              ) : (
                <RestaurantMealTable
                  data={archivedData}
                  isLoading={isLoadingArchived}
                  page={archiveFilters.page || 1}
                  onPageChange={handleArchivePageChange}
                  onEdit={handleEditClick}
                  isArchiveView
                  cardView
                />
              )
            ) : (
              <EmptyState
                icon={<Archive />}
                title={t("archive.empty.title")}
                description={t("archive.empty.description")}
              />
            )}
          </div>
        </TabsContent>
      </ModuleTabs>

      <RestaurantMealForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingMeal={editingMeal}
      />

      <RestaurantMealBulkForm
        open={bulkFormOpen}
        onOpenChange={setBulkFormOpen}
      />
    </>
  );
}
