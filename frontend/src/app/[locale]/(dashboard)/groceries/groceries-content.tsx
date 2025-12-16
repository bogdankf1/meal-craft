"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Plus,
  Carrot,
  AlertTriangle,
  DollarSign,
  Archive,
  LayoutGrid,
  BarChart3,
  ChevronDown,
  List,
  FolderArchive,
  Tag,
  TrendingUp,
  ShoppingBag,
  Clock,
  CalendarDays,
  Store,
  History,
  Package,
  Repeat,
  Import,
  TableIcon,
  Calendar,
  Trash2,
  Lightbulb,
  Percent,
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
  StatusCard,
  StatusCardGrid,
  ViewSelector,
  type ViewOption,
} from "@/components/shared";
import { Progress } from "@/components/ui/progress";
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
  GroceryForm,
  GroceryBulkForm,
  GroceryTable,
  GroceryFiltersBar,
  GroceryImport,
  GroceryCalendarView,
  GroceryInsights,
} from "@/components/modules/groceries";
import {
  useGetGroceriesQuery,
  useGetGroceryAnalyticsQuery,
  useGetGroceryHistoryQuery,
  useGetWasteAnalyticsQuery,
  type Grocery,
  type GroceryFilters,
} from "@/lib/api/groceries-api";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useCurrency } from "@/components/providers/currency-provider";

export function GroceriesContent() {
  const t = useTranslations("groceries");
  const tCommon = useTranslations("common");
  const { formatPriceFromUAH } = useCurrency();

  // State for active items
  const [filters, setFilters] = useState<GroceryFilters>({
    page: 1,
    per_page: 20,
    sort_by: "created_at",
    sort_order: "desc",
    is_archived: false,
  });

  // State for archived items
  const [archiveFilters, setArchiveFilters] = useState<GroceryFilters>({
    page: 1,
    per_page: 20,
    sort_by: "created_at",
    sort_order: "desc",
    is_archived: true,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [bulkFormOpen, setBulkFormOpen] = useState(false);
  const [editingGrocery, setEditingGrocery] = useState<Grocery | null>(null);
  const [historyMonths, setHistoryMonths] = useState(3);
  const [currentView, setCurrentView] = useState<string>("table");
  const [archiveView, setArchiveView] = useState<string>("table");

  // View options for the overview tab
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
  ];

  // API queries
  const { data: groceriesData, isLoading: isLoadingGroceries } =
    useGetGroceriesQuery(filters);
  const { data: archivedData, isLoading: isLoadingArchived } =
    useGetGroceriesQuery(archiveFilters);
  const { data: analytics } = useGetGroceryAnalyticsQuery();
  const { data: historyData, isLoading: isLoadingHistory } =
    useGetGroceryHistoryQuery(historyMonths);
  const { data: wasteAnalytics, isLoading: isLoadingWaste } =
    useGetWasteAnalyticsQuery(historyMonths);

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
    { value: "waste", label: t("tabs.waste"), icon: <Trash2 className="h-4 w-4" /> },
    { value: "analysis", label: t("tabs.analysis"), icon: <BarChart3 className="h-4 w-4" /> },
    { value: "history", label: t("tabs.history"), icon: <History className="h-4 w-4" /> },
  ];

  const handleAddClick = () => {
    setEditingGrocery(null);
    setFormOpen(true);
  };

  const handleBulkAddClick = () => {
    setBulkFormOpen(true);
  };

  const handleEditClick = (grocery: Grocery) => {
    setEditingGrocery(grocery);
    setFormOpen(true);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleArchivePageChange = (page: number) => {
    setArchiveFilters({ ...archiveFilters, page });
  };

  const formatCurrency = (amount: number) => {
    return formatPriceFromUAH(amount);
  };

  const hasGroceries = (groceriesData?.total || 0) > 0;
  const hasArchivedGroceries = (archivedData?.total || 0) > 0;

  // Helper to translate category names
  const translateCategory = (category: string) => {
    try {
      return t(`categories.${category}`);
    } catch {
      return category;
    }
  };

  // Convert analytics data to DistributionList format
  const categoryDistributionItems = Object.entries(analytics?.category_breakdown || {}).map(
    ([key, value]) => ({
      key,
      label: translateCategory(key),
      value: value as number,
    })
  );

  const storeDistributionItems = Object.entries(analytics?.store_breakdown || {}).map(
    ([key, value]) => ({
      key,
      label: key,
      value: value as number,
    })
  );

  const spendingByCategoryItems = Object.entries(analytics?.spending_by_category || {}).map(
    ([key, value]) => ({
      key,
      label: translateCategory(key),
      value: value as number,
      formattedValue: formatCurrency(value as number),
    })
  );

  // Convert history data to component formats
  const itemsTrendData = historyData?.monthly_data.map((month) => ({
    key: month.month,
    value: month.total_items,
    label: month.month_label.split(" ")[0],
  })) || [];

  const spendingTrendData = historyData?.monthly_data.map((month) => ({
    key: month.month,
    value: month.total_spent,
    label: month.month_label.split(" ")[0],
  })) || [];

  const topItemsData = historyData?.top_items.map((item) => ({
    key: item.item_name,
    name: item.item_name,
    primaryValue: item.purchase_count,
    primaryLabel: t("history.purchaseCount"),
    secondaryInfo: [
      { label: t("history.totalSpent"), value: formatCurrency(item.total_spent) },
      { label: t("history.avgPrice"), value: formatCurrency(item.avg_price) },
    ],
  })) || [];

  const categoryTrendsItems = Object.entries(historyData?.category_trends || {}).map(
    ([category, monthData]) => ({
      key: category,
      label: translateCategory(category),
      value: Object.values(monthData).reduce((a, b) => a + b, 0),
    })
  );

  return (
    <>
      <ModuleTabs tabs={tabs} defaultTab="overview">
        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatsCard
                title={t("stats.totalItems")}
                value={groceriesData?.total?.toString() || "0"}
                icon={<Carrot className="h-5 w-5 text-primary" />}
              />
              <StatsCard
                title={t("stats.expiringSoon")}
                value={analytics?.expiring_soon?.toString() || "0"}
                icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
                variant={analytics?.expiring_soon ? "warning" : "default"}
              />
              <StatsCard
                title={t("stats.totalSpent")}
                value={formatCurrency(
                  groceriesData?.items?.reduce((sum, item) => sum + (item.cost || 0), 0) || 0
                )}
                icon={<DollarSign className="h-5 w-5 text-green-500" />}
                variant="success"
              />
            </div>

            {/* Insights Section - Seasonality & Meal Planner */}
            <GroceryInsights
              groceryItems={groceriesData?.items || []}
              onNavigateToSeasonality={() => {
                router.push(pathname.replace("/groceries", "/seasonality"));
              }}
              onNavigateToMealPlanner={() => {
                router.push(pathname.replace("/groceries", "/meal-planner"));
              }}
            />

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full">
                <GroceryFiltersBar filters={filters} onFiltersChange={setFilters} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ViewSelector
                  currentView={currentView}
                  onViewChange={setCurrentView}
                  views={viewOptions}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("addItem")}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleAddClick}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("addItem")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBulkAddClick}>
                      <List className="h-4 w-4 mr-2" />
                      {t("bulkForm.title")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {hasGroceries ? (
              currentView === "table" ? (
                <GroceryTable
                  data={groceriesData}
                  isLoading={isLoadingGroceries}
                  page={filters.page || 1}
                  onPageChange={handlePageChange}
                  onEdit={handleEditClick}
                />
              ) : (
                <GroceryCalendarView
                  items={groceriesData?.items || []}
                  isLoading={isLoadingGroceries}
                  onItemClick={handleEditClick}
                />
              )
            ) : (
              <EmptyState
                icon={<Carrot />}
                title={t("empty.title")}
                description={t("empty.description")}
                action={{ label: t("addGroceries"), onClick: handleAddClick }}
              />
            )}
          </div>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <GroceryImport
            onViewItems={() => navigateToTab("overview")}
          />
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatsCard
                title={t("stats.archivedItems")}
                value={archivedData?.total?.toString() || "0"}
                icon={<FolderArchive className="h-5 w-5 text-muted-foreground" />}
              />
              <StatsCard
                title={t("stats.archivedValue")}
                value={formatCurrency(
                  archivedData?.items?.reduce((sum, item) => sum + (item.cost || 0), 0) || 0
                )}
                icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
              />
              <StatsCard
                title={t("stats.categories")}
                value={new Set(archivedData?.items?.map((item) => item.category).filter(Boolean)).size.toString()}
                icon={<Tag className="h-5 w-5 text-muted-foreground" />}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full">
                <GroceryFiltersBar
                  filters={archiveFilters}
                  onFiltersChange={(f) => setArchiveFilters({ ...f, is_archived: true })}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ViewSelector
                  currentView={archiveView}
                  onViewChange={setArchiveView}
                  views={viewOptions}
                />
              </div>
            </div>

            {hasArchivedGroceries ? (
              archiveView === "table" ? (
                <GroceryTable
                  data={archivedData}
                  isLoading={isLoadingArchived}
                  page={archiveFilters.page || 1}
                  onPageChange={handleArchivePageChange}
                  onEdit={handleEditClick}
                  isArchiveView
                />
              ) : (
                <GroceryCalendarView
                  items={archivedData?.items || []}
                  isLoading={isLoadingArchived}
                  onItemClick={handleEditClick}
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

        {/* Waste Tab */}
        <TabsContent value="waste">
          <div className="space-y-6">
            {isLoadingWaste ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">{tCommon("loading")}</div>
              </div>
            ) : wasteAnalytics && wasteAnalytics.total_wasted_items > 0 ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <StatsCard
                    title={t("waste.stats.totalWasted")}
                    value={wasteAnalytics.total_wasted_items.toString()}
                    icon={<Trash2 className="h-5 w-5 text-red-500" />}
                    variant="danger"
                  />
                  <StatsCard
                    title={t("waste.stats.costWasted")}
                    value={formatCurrency(wasteAnalytics.total_wasted_cost)}
                    icon={<DollarSign className="h-5 w-5 text-red-500" />}
                    variant="danger"
                  />
                  <StatsCard
                    title={t("waste.stats.wastedThisMonth")}
                    value={wasteAnalytics.wasted_this_month.toString()}
                    icon={<CalendarDays className="h-5 w-5 text-orange-500" />}
                    variant={wasteAnalytics.wasted_this_month > 0 ? "warning" : "default"}
                  />
                  <StatsCard
                    title={t("waste.stats.wasteRate")}
                    value={`${wasteAnalytics.waste_rate}%`}
                    icon={<Percent className="h-5 w-5 text-purple-500" />}
                    variant={wasteAnalytics.waste_rate > 10 ? "warning" : "default"}
                  />
                </div>

                {/* Suggestions card */}
                {wasteAnalytics.suggestions.length > 0 && (
                  <AnalyticsCard
                    title={t("waste.analytics.suggestions")}
                    icon={<Lightbulb className="h-4 w-4 text-yellow-500" />}
                  >
                    <ul className="space-y-2">
                      {wasteAnalytics.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-yellow-500 mt-0.5">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </AnalyticsCard>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  <AnalyticsCard title={t("waste.analytics.byReason")}>
                    <DistributionList
                      items={wasteAnalytics.by_reason.map((item) => ({
                        key: item.reason,
                        label: t(`waste.reasons.${item.reason}`),
                        value: item.count,
                        formattedValue: formatCurrency(item.total_cost),
                      }))}
                      valueLabel={t("waste.stats.items")}
                      emptyMessage={t("waste.analytics.noWasteData")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard title={t("waste.analytics.byCategory")}>
                    <DistributionList
                      items={wasteAnalytics.by_category.map((item) => ({
                        key: item.category,
                        label: translateCategory(item.category),
                        value: item.count,
                        formattedValue: formatCurrency(item.total_cost),
                      }))}
                      valueLabel={t("waste.stats.items")}
                      emptyMessage={t("waste.analytics.noWasteData")}
                    />
                  </AnalyticsCard>
                </div>

                {/* Waste trends chart */}
                {wasteAnalytics.monthly_trends.length > 0 && (
                  <AnalyticsCard
                    title={t("waste.analytics.trends")}
                    icon={<TrendingUp className="h-4 w-4" />}
                  >
                    <BarChart
                      data={wasteAnalytics.monthly_trends.map((month) => ({
                        key: month.month,
                        value: month.wasted_count,
                        label: month.month_label.split(" ")[0],
                      }))}
                      color="bg-red-500"
                      emptyMessage={t("waste.analytics.noWasteData")}
                    />
                  </AnalyticsCard>
                )}

                {/* Recent wasted items */}
                <AnalyticsCard title={t("waste.analytics.recentWasted")}>
                  <div className="space-y-3">
                    {wasteAnalytics.recent_wasted.length > 0 ? (
                      wasteAnalytics.recent_wasted.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{item.item_name}</span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>
                                {t("waste.analytics.wastedOn", {
                                  date: format(parseISO(item.wasted_at), "MMM d, yyyy"),
                                })}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {t(`waste.reasons.${item.waste_reason}`)}
                              </Badge>
                            </div>
                          </div>
                          {item.cost && (
                            <span className="text-sm font-medium text-red-500">
                              {formatCurrency(item.cost)}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("waste.analytics.noWasteData")}
                      </p>
                    )}
                  </div>
                </AnalyticsCard>
              </>
            ) : (
              <EmptyState
                icon={<Trash2 />}
                title={t("waste.empty.title")}
                description={t("waste.empty.description")}
              />
            )}
          </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          <div className="space-y-6">
            {hasGroceries && analytics ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <StatsCard
                    title={t("analysis.thisWeek")}
                    value={analytics.items_this_week?.toString() || "0"}
                    icon={<CalendarDays className="h-5 w-5 text-blue-500" />}
                  />
                  <StatsCard
                    title={t("analysis.thisMonth")}
                    value={analytics.items_this_month?.toString() || "0"}
                    icon={<ShoppingBag className="h-5 w-5 text-purple-500" />}
                  />
                  <StatsCard
                    title={t("analysis.avgPerItem")}
                    value={formatCurrency(
                      analytics.items_this_month > 0
                        ? analytics.total_spent_this_month / analytics.items_this_month
                        : 0
                    )}
                    icon={<TrendingUp className="h-5 w-5 text-green-500" />}
                  />
                  <StatsCard
                    title={t("analysis.expiryStatus")}
                    value={`${analytics.expired || 0} / ${analytics.expiring_soon || 0}`}
                    icon={<Clock className="h-5 w-5 text-orange-500" />}
                    variant={analytics.expired > 0 ? "danger" : analytics.expiring_soon > 0 ? "warning" : "default"}
                  />
                </div>

                {/* Week vs Month Comparison */}
                <AnalyticsCard title={t("analysis.weekVsMonth")}>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{t("analysis.thisWeek")}</span>
                        <span className="font-medium">{formatCurrency(analytics.total_spent_this_week || 0)}</span>
                      </div>
                      <Progress
                        value={
                          analytics.total_spent_this_month > 0
                            ? (analytics.total_spent_this_week / analytics.total_spent_this_month) * 100
                            : 0
                        }
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {analytics.total_spent_this_month > 0
                          ? Math.round((analytics.total_spent_this_week / analytics.total_spent_this_month) * 100)
                          : 0}
                        % {t("analysis.ofMonthlySpending")}
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{t("analysis.thisMonth")}</span>
                        <span className="font-medium">{formatCurrency(analytics.total_spent_this_month || 0)}</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                  </div>
                </AnalyticsCard>

                <div className="grid gap-6 md:grid-cols-2">
                  <AnalyticsCard title={t("analysis.categoryDistribution")}>
                    <DistributionList
                      items={categoryDistributionItems}
                      valueLabel={t("analysis.items")}
                      emptyMessage={t("analysis.empty.description")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard
                    title={t("analysis.topStores")}
                    icon={<Store className="h-4 w-4" />}
                  >
                    <DistributionList
                      items={storeDistributionItems}
                      maxItems={5}
                      valueLabel={t("analysis.items")}
                      emptyMessage={t("analysis.noStoreData")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard title={t("analysis.spendingByCategory")} fullWidth>
                    <DistributionList
                      items={spendingByCategoryItems}
                      showPercentage
                      emptyMessage={t("analysis.empty.description")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard title={t("analysis.expiryStatus")} fullWidth>
                    <StatusCardGrid columns={3}>
                      <StatusCard
                        icon={<AlertTriangle className="h-4 w-4" />}
                        value={analytics.expired || 0}
                        label={t("analysis.expired")}
                        variant="danger"
                      />
                      <StatusCard
                        icon={<Clock className="h-4 w-4" />}
                        value={analytics.expiring_soon || 0}
                        label={t("analysis.expiringSoon")}
                        variant="warning"
                      />
                      <StatusCard
                        icon={<Carrot className="h-4 w-4" />}
                        value={Math.max(0, analytics.total_items - (analytics.expired || 0) - (analytics.expiring_soon || 0))}
                        label={t("analysis.fresh")}
                        variant="success"
                      />
                    </StatusCardGrid>
                  </AnalyticsCard>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Carrot />}
                title={t("analysis.empty.title")}
                description={t("analysis.empty.description")}
                action={{ label: t("addGroceries"), onClick: handleAddClick }}
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
                <SelectTrigger className="w-[140px]">
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
            ) : historyData && historyData.total_items > 0 ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <StatsCard
                    title={t("history.totalInPeriod")}
                    value={historyData.total_items.toString()}
                    icon={<Package className="h-5 w-5 text-blue-500" />}
                  />
                  <StatsCard
                    title={t("stats.totalSpent")}
                    value={formatCurrency(historyData.total_spent)}
                    icon={<DollarSign className="h-5 w-5 text-green-500" />}
                  />
                  <StatsCard
                    title={t("history.avgMonthlyItems")}
                    value={Math.round(historyData.avg_monthly_items).toString()}
                    icon={<Repeat className="h-5 w-5 text-purple-500" />}
                  />
                  <StatsCard
                    title={t("history.avgMonthlySpending")}
                    value={formatCurrency(historyData.avg_monthly_spending)}
                    icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
                  />
                </div>

                <div className="grid gap-6">
                  <AnalyticsCard
                    title={t("history.itemsTrend")}
                    icon={<Package className="h-4 w-4" />}
                  >
                    <BarChart
                      data={itemsTrendData}
                      color="bg-blue-500"
                      emptyMessage={t("history.noData")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard
                    title={t("history.spendingTrend")}
                    icon={<DollarSign className="h-4 w-4" />}
                  >
                    <BarChart
                      data={spendingTrendData}
                      formatValue={formatCurrency}
                      color="bg-green-500"
                      emptyMessage={t("history.noData")}
                    />
                  </AnalyticsCard>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <AnalyticsCard title={t("history.topItems")}>
                    <TopItemsList
                      items={topItemsData}
                      emptyMessage={t("history.noData")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard title={t("history.categoryTrends")}>
                    <DistributionList
                      items={categoryTrendsItems}
                      valueLabel={t("analysis.items")}
                      emptyMessage={t("history.noData")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard
                    title={t("history.storeTrends")}
                    icon={<Store className="h-4 w-4" />}
                    fullWidth
                  >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(historyData.store_trends)
                        .map(([store, monthData]) => ({
                          store,
                          total: Object.values(monthData).reduce((a, b) => a + b, 0),
                          months: Object.keys(monthData).length,
                        }))
                        .sort((a, b) => b.total - a.total)
                        .slice(0, 6)
                        .map(({ store, total, months }) => (
                          <div key={store} className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-1">
                              <Store className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{store}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {total} {t("analysis.items")} • {t("history.monthsCount", { count: months })}
                            </div>
                          </div>
                        ))}
                      {Object.keys(historyData.store_trends).length === 0 && (
                        <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                          {t("analysis.noStoreData")}
                        </p>
                      )}
                    </div>
                  </AnalyticsCard>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<History />}
                title={t("history.empty.title")}
                description={t("history.empty.description")}
                action={{ label: t("addGroceries"), onClick: handleAddClick }}
              />
            )}
          </div>
        </TabsContent>
      </ModuleTabs>

      <GroceryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingGrocery={editingGrocery}
      />

      <GroceryBulkForm
        open={bulkFormOpen}
        onOpenChange={setBulkFormOpen}
      />
    </>
  );
}
