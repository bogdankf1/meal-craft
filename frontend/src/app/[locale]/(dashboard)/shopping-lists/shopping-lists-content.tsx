"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Plus,
  ShoppingCart,
  CheckCircle,
  ListTodo,
  Archive,
  LayoutGrid,
  BarChart3,
  History,
  Import,
  TableIcon,
  Calendar,
  TrendingUp,
  Package,
  Repeat,
  Tag,
  FolderArchive,
  DollarSign,
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
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingListForm,
  ShoppingListTable,
  ShoppingListFiltersBar,
  ShoppingListCalendarView,
  ShoppingListImport,
} from "@/components/modules/shopping-lists";
import {
  useGetShoppingListsQuery,
  useGetShoppingListAnalyticsQuery,
  useGetShoppingListHistoryQuery,
  type ShoppingListSummary,
  type ShoppingListFilters,
} from "@/lib/api/shopping-lists-api";
import { useCurrency } from "@/components/providers/currency-provider";

export function ShoppingListsContent() {
  const t = useTranslations("shoppingLists");
  const tCommon = useTranslations("common");
  const tGroceries = useTranslations("groceries");
  const { formatPriceFromUAH } = useCurrency();

  // State for active items
  const [filters, setFilters] = useState<ShoppingListFilters>({
    page: 1,
    per_page: 20,
    sort_by: "created_at",
    sort_order: "desc",
    is_archived: false,
  });

  // State for archived items
  const [archiveFilters, setArchiveFilters] = useState<ShoppingListFilters>({
    page: 1,
    per_page: 20,
    sort_by: "created_at",
    sort_order: "desc",
    is_archived: true,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingListSummary | null>(null);
  const [historyMonths, setHistoryMonths] = useState(3);
  const [currentView, setCurrentView] = useState<string>("table");
  const [archiveView, setArchiveView] = useState<string>("table");

  // View options
  const viewOptions: ViewOption[] = [
    {
      value: "table",
      label: tGroceries("views.table"),
      icon: <TableIcon className="h-4 w-4" />,
    },
    {
      value: "calendar",
      label: tGroceries("views.calendar"),
      icon: <Calendar className="h-4 w-4" />,
    },
  ];

  // API queries
  const { data: listsData, isLoading: isLoadingLists } =
    useGetShoppingListsQuery(filters);
  const { data: archivedData, isLoading: isLoadingArchived } =
    useGetShoppingListsQuery(archiveFilters);
  const { data: analytics } = useGetShoppingListAnalyticsQuery();
  const { data: historyData, isLoading: isLoadingHistory } =
    useGetShoppingListHistoryQuery(historyMonths);

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

  const handleAddClick = () => {
    setEditingList(null);
    setFormOpen(true);
  };

  const handleEditClick = (list: ShoppingListSummary) => {
    setEditingList(list);
    setFormOpen(true);
  };

  const handleViewClick = (list: ShoppingListSummary) => {
    router.push(`/shopping-lists/${list.id}`);
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

  const hasLists = (listsData?.total || 0) > 0;
  const hasArchivedLists = (archivedData?.total || 0) > 0;

  // Helper to translate category names
  const translateCategory = (category: string) => {
    try {
      return tGroceries(`categories.${category}`);
    } catch {
      return category;
    }
  };

  // Convert analytics data to component formats
  const categoryDistributionItems = Object.entries(analytics?.category_breakdown || {}).map(
    ([key, value]) => ({
      key,
      label: translateCategory(key),
      value: value as number,
    })
  );

  // History data conversions
  const listsTrendData = historyData?.monthly_data.map((month) => ({
    key: month.month,
    value: month.total_lists,
    label: month.month_label.split(" ")[0],
  })) || [];

  const completionTrendData = historyData?.monthly_data.map((month) => ({
    key: month.month,
    value: month.completion_rate,
    label: month.month_label.split(" ")[0],
  })) || [];

  const topItemsData = historyData?.top_items.map((item) => ({
    key: item.item_name,
    name: item.item_name,
    primaryValue: item.occurrence_count,
    primaryLabel: t("history.occurrenceCount"),
    secondaryInfo: [
      { label: t("history.purchaseCount"), value: item.purchase_count.toString() },
      { label: t("history.lastAdded"), value: item.last_added },
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
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title={t("stats.totalLists")}
                value={analytics?.total_lists?.toString() || "0"}
                icon={<ShoppingCart className="h-5 w-5 text-primary" />}
              />
              <StatsCard
                title={t("stats.activeLists")}
                value={analytics?.active_lists?.toString() || "0"}
                icon={<ListTodo className="h-5 w-5 text-blue-500" />}
              />
              <StatsCard
                title={t("stats.completedLists")}
                value={analytics?.completed_lists?.toString() || "0"}
                icon={<CheckCircle className="h-5 w-5 text-green-500" />}
                variant="success"
              />
              <StatsCard
                title={t("stats.avgCompletionRate")}
                value={`${Math.round(analytics?.avg_completion_rate || 0)}%`}
                icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full">
                <ShoppingListFiltersBar filters={filters} onFiltersChange={setFilters} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ViewSelector
                  currentView={currentView}
                  onViewChange={setCurrentView}
                  views={viewOptions}
                />
                <Button onClick={handleAddClick}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addList")}
                </Button>
              </div>
            </div>

            {hasLists ? (
              currentView === "table" ? (
                <ShoppingListTable
                  data={listsData}
                  isLoading={isLoadingLists}
                  page={filters.page || 1}
                  onPageChange={handlePageChange}
                  onEdit={handleEditClick}
                  onView={handleViewClick}
                />
              ) : (
                <ShoppingListCalendarView
                  items={listsData?.items || []}
                  isLoading={isLoadingLists}
                  onItemClick={handleViewClick}
                />
              )
            ) : (
              <EmptyState
                icon={<ShoppingCart />}
                title={t("empty.title")}
                description={t("empty.description")}
                action={{ label: t("addList"), onClick: handleAddClick }}
              />
            )}
          </div>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <ShoppingListImport
            onComplete={() => navigateToTab("overview")}
            onViewItems={() => navigateToTab("overview")}
          />
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive">
          <div className="space-y-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              <StatsCard
                title={t("stats.archivedLists")}
                value={archivedData?.total?.toString() || "0"}
                icon={<FolderArchive className="h-5 w-5 text-muted-foreground" />}
              />
              <StatsCard
                title={t("stats.archivedItems")}
                value={archivedData?.items?.reduce((sum, list) => sum + list.total_items, 0)?.toString() || "0"}
                icon={<Package className="h-5 w-5 text-muted-foreground" />}
              />
              <StatsCard
                title={t("stats.completionRate")}
                value={`${Math.round(
                  archivedData?.items?.length
                    ? archivedData.items.filter((l) => l.status === "completed").length /
                        archivedData.items.length * 100
                    : 0
                )}%`}
                icon={<CheckCircle className="h-5 w-5 text-muted-foreground" />}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full">
                <ShoppingListFiltersBar
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

            {hasArchivedLists ? (
              archiveView === "table" ? (
                <ShoppingListTable
                  data={archivedData}
                  isLoading={isLoadingArchived}
                  page={archiveFilters.page || 1}
                  onPageChange={handleArchivePageChange}
                  onEdit={handleEditClick}
                  onView={handleViewClick}
                  isArchiveView
                />
              ) : (
                <ShoppingListCalendarView
                  items={archivedData?.items || []}
                  isLoading={isLoadingArchived}
                  onItemClick={handleViewClick}
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

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          <div className="space-y-6">
            {hasLists && analytics ? (
              <>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <StatsCard
                    title={t("analysis.listsThisWeek")}
                    value={analytics.lists_this_week?.toString() || "0"}
                    icon={<ShoppingCart className="h-5 w-5 text-blue-500" />}
                  />
                  <StatsCard
                    title={t("analysis.listsThisMonth")}
                    value={analytics.lists_this_month?.toString() || "0"}
                    icon={<ShoppingCart className="h-5 w-5 text-purple-500" />}
                  />
                  <StatsCard
                    title={t("analysis.avgItemsPerList")}
                    value={Math.round(analytics.avg_items_per_list || 0).toString()}
                    icon={<Package className="h-5 w-5 text-green-500" />}
                  />
                  <StatsCard
                    title={t("analysis.totalItemsPurchased")}
                    value={analytics.total_items_purchased?.toString() || "0"}
                    icon={<CheckCircle className="h-5 w-5 text-orange-500" />}
                  />
                </div>

                <AnalyticsCard title={t("analysis.completionProgress")}>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{t("analysis.avgCompletionRate")}</span>
                        <span className="font-medium">{Math.round(analytics.avg_completion_rate)}%</span>
                      </div>
                      <Progress value={analytics.avg_completion_rate} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-green-500">
                          {analytics.completed_lists}
                        </div>
                        <div className="text-xs text-muted-foreground">{t("status.completed")}</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-blue-500">
                          {analytics.active_lists}
                        </div>
                        <div className="text-xs text-muted-foreground">{t("status.active")}</div>
                      </div>
                    </div>
                  </div>
                </AnalyticsCard>

                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  <AnalyticsCard title={t("analysis.categoryDistribution")}>
                    <DistributionList
                      items={categoryDistributionItems}
                      valueLabel={t("analysis.items")}
                      emptyMessage={t("analysis.empty.description")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard title={t("analysis.recentLists")}>
                    <div className="space-y-2">
                      {analytics.recent_lists.slice(0, 5).map((list) => (
                        <div
                          key={list.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleViewClick(list)}
                        >
                          <div className="flex items-center gap-2">
                            {list.status === "completed" ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <ListTodo className="h-4 w-4 text-blue-500" />
                            )}
                            <span className="font-medium text-sm">{list.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {list.purchased_items}/{list.total_items}
                          </span>
                        </div>
                      ))}
                      {analytics.recent_lists.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t("analysis.noRecentLists")}
                        </p>
                      )}
                    </div>
                  </AnalyticsCard>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<ShoppingCart />}
                title={t("analysis.empty.title")}
                description={t("analysis.empty.description")}
                action={{ label: t("addList"), onClick: handleAddClick }}
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
            ) : historyData && historyData.total_lists > 0 ? (
              <>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <StatsCard
                    title={t("history.totalInPeriod")}
                    value={historyData.total_lists.toString()}
                    icon={<ShoppingCart className="h-5 w-5 text-blue-500" />}
                  />
                  <StatsCard
                    title={t("history.completedInPeriod")}
                    value={historyData.completed_lists.toString()}
                    icon={<CheckCircle className="h-5 w-5 text-green-500" />}
                  />
                  <StatsCard
                    title={t("history.avgMonthlyLists")}
                    value={Math.round(historyData.avg_monthly_lists).toString()}
                    icon={<Repeat className="h-5 w-5 text-purple-500" />}
                  />
                  <StatsCard
                    title={t("history.avgCompletionRate")}
                    value={`${Math.round(historyData.avg_completion_rate)}%`}
                    icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
                  />
                </div>

                <div className="grid gap-6">
                  <AnalyticsCard
                    title={t("history.listsTrend")}
                    icon={<ShoppingCart className="h-4 w-4" />}
                  >
                    <BarChart
                      data={listsTrendData}
                      color="bg-blue-500"
                      emptyMessage={t("history.noData")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard
                    title={t("history.completionTrend")}
                    icon={<TrendingUp className="h-4 w-4" />}
                  >
                    <BarChart
                      data={completionTrendData}
                      formatValue={(v) => `${Math.round(v)}%`}
                      color="bg-green-500"
                      emptyMessage={t("history.noData")}
                    />
                  </AnalyticsCard>
                </div>

                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
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
                </div>
              </>
            ) : (
              <EmptyState
                icon={<History />}
                title={t("history.empty.title")}
                description={t("history.empty.description")}
                action={{ label: t("addList"), onClick: handleAddClick }}
              />
            )}
          </div>
        </TabsContent>
      </ModuleTabs>

      <ShoppingListForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingList={editingList}
      />
    </>
  );
}
