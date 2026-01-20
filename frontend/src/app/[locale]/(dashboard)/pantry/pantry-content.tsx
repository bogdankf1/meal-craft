"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Plus,
  AlertTriangle,
  Archive,
  LayoutGrid,
  BarChart3,
  ChevronDown,
  List,
  FolderArchive,
  Tag,
  TrendingUp,
  Clock,
  CalendarDays,
  History,
  Package,
  Import,
  Trash2,
  Lightbulb,
  Percent,
  Refrigerator,
  ThermometerSnowflake,
  Home,
  TableIcon,
  Calendar,
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
  PantryForm,
  PantryBulkForm,
  PantryTable,
  PantryFiltersBar,
  PantryImport,
  PantryCalendarView,
  PantryInsights,
} from "@/components/modules/pantry";
import { AddToShoppingListDialog } from "@/components/modules/shopping-lists";
import {
  useGetPantryItemsQuery,
  useGetPantryAnalyticsQuery,
  useGetPantryHistoryQuery,
  useGetPantryWasteAnalyticsQuery,
  type PantryItem,
  type PantryFilters,
} from "@/lib/api/pantry-api";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useUserStore } from "@/lib/store/user-store";

export function PantryContent() {
  const t = useTranslations("pantry");
  const tCommon = useTranslations("common");
  const { preferences } = useUserStore();
  const { uiVisibility } = preferences;

  // State for active items
  const [filters, setFilters] = useState<PantryFilters>({
    page: 1,
    per_page: 20,
    sort_by: "created_at",
    sort_order: "desc",
    is_archived: false,
  });

  // State for archived items
  const [archiveFilters, setArchiveFilters] = useState<PantryFilters>({
    page: 1,
    per_page: 20,
    sort_by: "created_at",
    sort_order: "desc",
    is_archived: true,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [bulkFormOpen, setBulkFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [historyMonths, setHistoryMonths] = useState(3);
  const [currentView, setCurrentView] = useState<string>("table");
  const [archiveView, setArchiveView] = useState<string>("table");
  const [shoppingListDialogOpen, setShoppingListDialogOpen] = useState(false);
  const [itemsToAddToShoppingList, setItemsToAddToShoppingList] = useState<
    { name: string; quantity?: number | null; unit?: string | null; category?: string | null }[]
  >([]);

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
  const { data: pantryData, isLoading: isLoadingPantry } =
    useGetPantryItemsQuery(filters);
  const { data: archivedData, isLoading: isLoadingArchived } =
    useGetPantryItemsQuery(archiveFilters);
  const { data: analytics } = useGetPantryAnalyticsQuery();
  const { data: historyData, isLoading: isLoadingHistory } =
    useGetPantryHistoryQuery(historyMonths);
  const { data: wasteAnalytics, isLoading: isLoadingWaste } =
    useGetPantryWasteAnalyticsQuery(historyMonths);

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
    { value: "archive", label: t("tabs.archive"), icon: <Archive className="h-4 w-4" />, visibilityKey: "showArchiveTab" as const },
    { value: "waste", label: t("tabs.waste"), icon: <Trash2 className="h-4 w-4" />, visibilityKey: "showWasteTab" as const },
    { value: "analysis", label: t("tabs.analysis"), icon: <BarChart3 className="h-4 w-4" />, visibilityKey: "showAnalysisTab" as const },
    { value: "history", label: t("tabs.history"), icon: <History className="h-4 w-4" />, visibilityKey: "showHistoryTab" as const },
  ];

  const tabs = allTabs.filter(tab => !tab.visibilityKey || uiVisibility[tab.visibilityKey]);

  const handleAddClick = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleBulkAddClick = () => {
    setBulkFormOpen(true);
  };

  const handleEditClick = (item: PantryItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleArchivePageChange = (page: number) => {
    setArchiveFilters({ ...archiveFilters, page });
  };

  const hasPantryItems = (pantryData?.total || 0) > 0;
  const hasArchivedItems = (archivedData?.total || 0) > 0;

  // Helper to translate category names
  const translateCategory = (category: string) => {
    try {
      return t(`categories.${category}`);
    } catch {
      return category;
    }
  };

  // Helper to translate storage locations
  const translateLocation = (location: string) => {
    try {
      return t(`storageLocations.${location}`);
    } catch {
      return location;
    }
  };

  // Convert analytics data to DistributionList format
  const locationDistributionItems = Object.entries(analytics?.items_by_location || {}).map(
    ([key, value]) => ({
      key,
      label: translateLocation(key),
      value: value as number,
    })
  );

  const categoryDistributionItems = Object.entries(analytics?.items_by_category || {}).map(
    ([key, value]) => ({
      key,
      label: translateCategory(key),
      value: value as number,
    })
  );

  // Convert history data to component formats
  const itemsAddedTrendData = historyData?.monthly_data.map((month) => ({
    key: month.month,
    value: month.items_added,
    label: month.month_label.split(" ")[0],
  })) || [];

  const itemsConsumedTrendData = historyData?.monthly_data.map((month) => ({
    key: month.month,
    value: month.items_consumed,
    label: month.month_label.split(" ")[0],
  })) || [];

  const topItemsData = historyData?.top_items.map((item) => ({
    key: item.item_name,
    name: item.item_name,
    primaryValue: item.times_added ?? 0,
    primaryLabel: t("history.timesAdded"),
    secondaryInfo: [
      { label: t("history.timesConsumed"), value: (item.times_consumed ?? 0).toString() },
      { label: t("history.wasteRate"), value: `${item.waste_rate ?? 0}%` },
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
            {uiVisibility.showStatsCards && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  title={t("stats.totalItems")}
                  value={pantryData?.total?.toString() || "0"}
                  icon={<Package className="h-5 w-5 text-primary" />}
                />
                <StatsCard
                  title={t("stats.expiringSoon")}
                  value={analytics?.expiring_soon?.toString() || "0"}
                  icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
                  variant={analytics?.expiring_soon ? "warning" : "default"}
                />
                <StatsCard
                  title={t("stats.lowStock")}
                  value={analytics?.low_stock_items?.toString() || "0"}
                  icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                  variant={analytics?.low_stock_items ? "danger" : "default"}
                />
                <StatsCard
                  title={t("stats.expired")}
                  value={analytics?.expired?.toString() || "0"}
                  icon={<Clock className="h-5 w-5 text-destructive" />}
                  variant={analytics?.expired ? "danger" : "default"}
                />
              </div>
            )}

            {/* Insights Section - Seasonality & Low Stock */}
            {uiVisibility.showInsights && (
              <PantryInsights
                pantryItems={pantryData?.items || []}
                analytics={analytics}
                onAddToShoppingList={(itemName, quantity, unit) => {
                  setItemsToAddToShoppingList([
                    { name: itemName, quantity, unit },
                  ]);
                  setShoppingListDialogOpen(true);
                }}
                onNavigateToSeasonality={() => {
                  router.push(pathname.replace("/pantry", "/seasonality"));
                }}
              />
            )}

            {/* Filters and Actions - Two line layout for better responsiveness */}
            <div className="space-y-3">
              {/* First row: Search and filters */}
              <div className="w-full">
                <PantryFiltersBar
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
                      {t("addItem")}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={handleAddClick}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("addItem")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBulkAddClick}>
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

            {hasPantryItems ? (
              currentView === "table" ? (
                <PantryTable
                  data={pantryData}
                  isLoading={isLoadingPantry}
                  page={filters.page || 1}
                  onPageChange={handlePageChange}
                  onEdit={handleEditClick}
                />
              ) : (
                <PantryCalendarView
                  items={pantryData?.items || []}
                  isLoading={isLoadingPantry}
                  onItemClick={handleEditClick}
                />
              )
            ) : (
              <EmptyState
                icon={<Package />}
                title={t("empty.title")}
                description={t("empty.description")}
                action={{ label: t("addItem"), onClick: handleAddClick }}
              />
            )}
          </div>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <PantryImport
            onViewItems={() => navigateToTab("overview")}
          />
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive">
          <div className="space-y-6">
            {uiVisibility.showStatsCards && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                <StatsCard
                  title={t("stats.archivedItems")}
                  value={archivedData?.total?.toString() || "0"}
                  icon={<FolderArchive className="h-5 w-5 text-muted-foreground" />}
                />
                <StatsCard
                  title={t("stats.categories")}
                  value={new Set(archivedData?.items?.map((item) => item.category).filter(Boolean)).size.toString()}
                  icon={<Tag className="h-5 w-5 text-muted-foreground" />}
                />
                <StatsCard
                  title={t("stats.locations")}
                  value={new Set(archivedData?.items?.map((item) => item.storage_location).filter(Boolean)).size.toString()}
                  icon={<Home className="h-5 w-5 text-muted-foreground" />}
                />
              </div>
            )}

            {/* Filters and View selector - Two line layout */}
            <div className="space-y-3">
              <div className="w-full">
                <PantryFiltersBar
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
              <div className="flex flex-wrap items-center gap-3">
                {uiVisibility.showViewSelector && (
                  <ViewSelector
                    currentView={archiveView}
                    onViewChange={setArchiveView}
                    views={viewOptions}
                  />
                )}
              </div>
            </div>

            {hasArchivedItems ? (
              archiveView === "table" ? (
                <PantryTable
                  data={archivedData}
                  isLoading={isLoadingArchived}
                  page={archiveFilters.page || 1}
                  onPageChange={handleArchivePageChange}
                  onEdit={handleEditClick}
                  isArchiveView
                />
              ) : (
                <PantryCalendarView
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
                {uiVisibility.showStatsCards && (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                      title={t("waste.stats.totalWasted")}
                      value={wasteAnalytics.total_wasted_items.toString()}
                      icon={<Trash2 className="h-5 w-5 text-red-500" />}
                      variant="danger"
                    />
                    <StatsCard
                      title={t("waste.stats.wastedThisMonth")}
                      value={(wasteAnalytics.wasted_this_month ?? 0).toString()}
                      icon={<CalendarDays className="h-5 w-5 text-orange-500" />}
                      variant={wasteAnalytics.wasted_this_month > 0 ? "warning" : "default"}
                    />
                    <StatsCard
                      title={t("waste.stats.wasteRate")}
                      value={`${wasteAnalytics.waste_rate ?? 0}%`}
                      icon={<Percent className="h-5 w-5 text-purple-500" />}
                      variant={(wasteAnalytics.waste_rate ?? 0) > 10 ? "warning" : "default"}
                    />
                    <StatsCard
                      title={t("waste.stats.topLocation")}
                      value={wasteAnalytics.by_location?.[0]?.location ? translateLocation(wasteAnalytics.by_location[0].location) : "-"}
                      icon={<Home className="h-5 w-5 text-muted-foreground" />}
                    />
                  </div>
                )}

                {/* Suggestions card */}
                {wasteAnalytics.suggestions && wasteAnalytics.suggestions.length > 0 && (
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

                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  <AnalyticsCard title={t("waste.analytics.byReason")}>
                    <DistributionList
                      items={(wasteAnalytics.by_reason ?? []).map((item) => ({
                        key: item.reason,
                        label: t(`waste.reasons.${item.reason}`),
                        value: item.count,
                      }))}
                      valueLabel={t("waste.stats.items")}
                      emptyMessage={t("waste.analytics.noWasteData")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard title={t("waste.analytics.byLocation")}>
                    <DistributionList
                      items={(wasteAnalytics.by_location ?? []).map((item) => ({
                        key: item.location,
                        label: translateLocation(item.location),
                        value: item.count,
                      }))}
                      valueLabel={t("waste.stats.items")}
                      emptyMessage={t("waste.analytics.noWasteData")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard title={t("waste.analytics.byCategory")}>
                    <DistributionList
                      items={(wasteAnalytics.by_category ?? []).map((item) => ({
                        key: item.category,
                        label: translateCategory(item.category),
                        value: item.count,
                      }))}
                      valueLabel={t("waste.stats.items")}
                      emptyMessage={t("waste.analytics.noWasteData")}
                    />
                  </AnalyticsCard>
                </div>

                {/* Waste trends chart */}
                {wasteAnalytics.monthly_trends && wasteAnalytics.monthly_trends.length > 0 && (
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
                {wasteAnalytics.recent_wasted && wasteAnalytics.recent_wasted.length > 0 && (
                  <AnalyticsCard title={t("waste.analytics.recentWasted")}>
                    <div className="space-y-3">
                      {wasteAnalytics.recent_wasted.map((item) => (
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
                          <span className="text-sm text-muted-foreground">
                            {translateLocation(item.storage_location)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AnalyticsCard>
                )}
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
            {hasPantryItems && analytics ? (
              <>
                {uiVisibility.showStatsCards && (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                      title={t("analysis.inFridge")}
                      value={analytics.items_by_location?.fridge?.toString() || "0"}
                      icon={<Refrigerator className="h-5 w-5 text-blue-500" />}
                    />
                    <StatsCard
                      title={t("analysis.inFreezer")}
                      value={analytics.items_by_location?.freezer?.toString() || "0"}
                      icon={<ThermometerSnowflake className="h-5 w-5 text-cyan-500" />}
                    />
                    <StatsCard
                      title={t("analysis.inPantry")}
                      value={analytics.items_by_location?.pantry?.toString() || "0"}
                      icon={<Home className="h-5 w-5 text-amber-500" />}
                    />
                    <StatsCard
                      title={t("analysis.expiryStatus")}
                      value={`${analytics.expired || 0} / ${analytics.expiring_soon || 0}`}
                      icon={<Clock className="h-5 w-5 text-orange-500" />}
                      variant={analytics.expired > 0 ? "danger" : analytics.expiring_soon > 0 ? "warning" : "default"}
                    />
                  </div>
                )}

                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  <AnalyticsCard title={t("analysis.locationDistribution")}>
                    <DistributionList
                      items={locationDistributionItems}
                      valueLabel={t("analysis.items")}
                      emptyMessage={t("analysis.empty.description")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard title={t("analysis.categoryDistribution")}>
                    <DistributionList
                      items={categoryDistributionItems}
                      valueLabel={t("analysis.items")}
                      emptyMessage={t("analysis.empty.description")}
                    />
                  </AnalyticsCard>
                </div>

                {/* Expiry Status */}
                <AnalyticsCard title={t("analysis.expiryOverview")} fullWidth>
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
                      icon={<Package className="h-4 w-4" />}
                      value={Math.max(0, analytics.total_items - (analytics.expired || 0) - (analytics.expiring_soon || 0))}
                      label={t("analysis.fresh")}
                      variant="success"
                    />
                  </StatusCardGrid>
                </AnalyticsCard>

                {/* Low Stock Items */}
                {analytics.low_stock_list && analytics.low_stock_list.length > 0 && (
                  <AnalyticsCard
                    title={t("analysis.lowStockItems")}
                    icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
                  >
                    <div className="space-y-3">
                      {analytics.low_stock_list.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{item.item_name}</span>
                            <span className="text-sm text-muted-foreground">
                              {translateLocation(item.storage_location)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-orange-500 font-medium">
                              {item.quantity} {item.unit}
                            </span>
                            {item.minimum_quantity && (
                              <span className="text-xs text-muted-foreground block">
                                {t("analysis.minQuantity")}: {item.minimum_quantity}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AnalyticsCard>
                )}

                {/* Expiring Items */}
                {analytics.expiring_items && analytics.expiring_items.length > 0 && (
                  <AnalyticsCard
                    title={t("analysis.expiringItems")}
                    icon={<Clock className="h-4 w-4 text-orange-500" />}
                  >
                    <div className="space-y-3">
                      {analytics.expiring_items.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{item.item_name}</span>
                            <span className="text-sm text-muted-foreground">
                              {translateLocation(item.storage_location)}
                            </span>
                          </div>
                          {item.expiry_date && (
                            <Badge variant="secondary" className="text-orange-500">
                              {format(parseISO(item.expiry_date), "MMM d, yyyy")}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </AnalyticsCard>
                )}
              </>
            ) : (
              <EmptyState
                icon={<Package />}
                title={t("analysis.empty.title")}
                description={t("analysis.empty.description")}
                action={{ label: t("addItem"), onClick: handleAddClick }}
              />
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            ) : historyData && historyData.total_items_added > 0 ? (
              <>
                {uiVisibility.showStatsCards && (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                      title={t("history.totalAdded")}
                      value={historyData.total_items_added.toString()}
                      icon={<Package className="h-5 w-5 text-blue-500" />}
                    />
                    <StatsCard
                      title={t("history.totalConsumed")}
                      value={historyData.total_items_consumed.toString()}
                      icon={<TrendingUp className="h-5 w-5 text-green-500" />}
                    />
                    <StatsCard
                      title={t("history.totalWasted")}
                      value={historyData.total_items_wasted.toString()}
                      icon={<Trash2 className="h-5 w-5 text-red-500" />}
                      variant={historyData.total_items_wasted > 0 ? "danger" : "default"}
                    />
                    <StatsCard
                      title={t("history.wasteRate")}
                      value={`${historyData.total_items_added > 0
                        ? Math.round((historyData.total_items_wasted / historyData.total_items_added) * 100)
                        : 0}%`}
                      icon={<Percent className="h-5 w-5 text-purple-500" />}
                    />
                  </div>
                )}

                <div className="grid gap-6">
                  <AnalyticsCard
                    title={t("history.itemsAddedTrend")}
                    icon={<Package className="h-4 w-4" />}
                  >
                    <BarChart
                      data={itemsAddedTrendData}
                      color="bg-blue-500"
                      emptyMessage={t("history.noData")}
                    />
                  </AnalyticsCard>

                  <AnalyticsCard
                    title={t("history.itemsConsumedTrend")}
                    icon={<TrendingUp className="h-4 w-4" />}
                  >
                    <BarChart
                      data={itemsConsumedTrendData}
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

                {/* Location Trends */}
                <AnalyticsCard
                  title={t("history.locationTrends")}
                  icon={<Home className="h-4 w-4" />}
                  fullWidth
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(historyData.location_trends)
                      .map(([location, monthData]) => ({
                        location,
                        total: Object.values(monthData).reduce((a, b) => a + b, 0),
                        months: Object.keys(monthData).length,
                      }))
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 6)
                      .map(({ location, total, months }) => (
                        <div key={location} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{translateLocation(location)}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {total} {t("analysis.items")} • {t("history.monthsCount", { count: months })}
                          </div>
                        </div>
                      ))}
                    {Object.keys(historyData.location_trends).length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                        {t("history.noData")}
                      </p>
                    )}
                  </div>
                </AnalyticsCard>

                {/* Waste Analytics Summary in History */}
                {wasteAnalytics && wasteAnalytics.total_wasted_items > 0 && (
                  <AnalyticsCard
                    title={t("history.wasteOverview")}
                    icon={<Trash2 className="h-4 w-4 text-red-500" />}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t("waste.analytics.byReason")}</h4>
                        <DistributionList
                          items={wasteAnalytics.by_reason.map((item) => ({
                            key: item.reason,
                            label: t(`waste.reasons.${item.reason}`),
                            value: item.count,
                          }))}
                          valueLabel={t("analysis.items")}
                          maxItems={5}
                          emptyMessage={t("waste.analytics.noWasteData")}
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t("waste.analytics.byLocation")}</h4>
                        <DistributionList
                          items={wasteAnalytics.by_location.map((item) => ({
                            key: item.location,
                            label: translateLocation(item.location),
                            value: item.count,
                          }))}
                          valueLabel={t("analysis.items")}
                          maxItems={5}
                          emptyMessage={t("waste.analytics.noWasteData")}
                        />
                      </div>
                    </div>
                    {wasteAnalytics.suggestions.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          <h4 className="text-sm font-medium">{t("waste.analytics.suggestions")}</h4>
                        </div>
                        <ul className="space-y-1">
                          {wasteAnalytics.suggestions.slice(0, 3).map((suggestion, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-yellow-500 mt-0.5">•</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AnalyticsCard>
                )}
              </>
            ) : (
              <EmptyState
                icon={<History />}
                title={t("history.empty.title")}
                description={t("history.empty.description")}
                action={{ label: t("addItem"), onClick: handleAddClick }}
              />
            )}
          </div>
        </TabsContent>
      </ModuleTabs>

      <PantryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingItem={editingItem}
      />

      <PantryBulkForm
        open={bulkFormOpen}
        onOpenChange={setBulkFormOpen}
      />

      <AddToShoppingListDialog
        open={shoppingListDialogOpen}
        onOpenChange={setShoppingListDialogOpen}
        items={itemsToAddToShoppingList}
      />
    </>
  );
}
