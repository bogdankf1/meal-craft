"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Carrot, AlertTriangle, DollarSign, Archive, LayoutGrid, BarChart3, ChevronDown, List, FolderArchive, Tag, TrendingUp, ShoppingBag, Clock, CalendarDays, Store, History, Package, Repeat } from "lucide-react";

import { ModuleTabs, TabsContent } from "@/components/shared/ModuleTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatsCard } from "@/components/shared/StatsCard";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GroceryForm,
  GroceryBulkForm,
  GroceryTable,
  GroceryFiltersBar,
} from "@/components/modules/groceries";
import {
  useGetGroceriesQuery,
  useGetGroceryAnalyticsQuery,
  useGetGroceryHistoryQuery,
  type Grocery,
  type GroceryFilters,
} from "@/lib/api/groceries-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO } from "date-fns";

export function GroceriesContent() {
  const t = useTranslations("groceries");

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

  // API queries - active items
  const { data: groceriesData, isLoading: isLoadingGroceries } =
    useGetGroceriesQuery(filters);

  // API queries - archived items
  const { data: archivedData, isLoading: isLoadingArchived } =
    useGetGroceriesQuery(archiveFilters);

  const { data: analytics } = useGetGroceryAnalyticsQuery();
  const { data: historyData, isLoading: isLoadingHistory } = useGetGroceryHistoryQuery(historyMonths);

  const tabs = [
    { value: "overview", label: t("tabs.overview"), icon: <LayoutGrid className="h-4 w-4" /> },
    { value: "archive", label: t("tabs.archive"), icon: <Archive className="h-4 w-4" /> },
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const hasGroceries = (groceriesData?.total || 0) > 0;
  const hasArchivedGroceries = (archivedData?.total || 0) > 0;

  return (
    <>
      <ModuleTabs tabs={tabs} defaultTab="overview">
        {/* Overview Tab - Stats + Full Inventory */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Stats Cards */}
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

            {/* Filters + Add Button Row */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full">
                <GroceryFiltersBar filters={filters} onFiltersChange={setFilters} />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="shrink-0">
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

            {/* Table or Empty State */}
            {hasGroceries ? (
              <GroceryTable
                data={groceriesData}
                isLoading={isLoadingGroceries}
                page={filters.page || 1}
                onPageChange={handlePageChange}
                onEdit={handleEditClick}
              />
            ) : (
              <EmptyState
                icon={<Carrot />}
                title={t("empty.title")}
                description={t("empty.description")}
                action={{
                  label: t("addGroceries"),
                  onClick: handleAddClick,
                }}
              />
            )}
          </div>
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive">
          <div className="space-y-6">
            {/* Stats Cards */}
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
                value={new Set(archivedData?.items?.map(item => item.category).filter(Boolean)).size.toString()}
                icon={<Tag className="h-5 w-5 text-muted-foreground" />}
              />
            </div>

            {/* Filters for archived items */}
            <GroceryFiltersBar
              filters={archiveFilters}
              onFiltersChange={(f) => setArchiveFilters({ ...f, is_archived: true })}
            />

            {/* Table or Empty State */}
            {hasArchivedGroceries ? (
              <GroceryTable
                data={archivedData}
                isLoading={isLoadingArchived}
                page={archiveFilters.page || 1}
                onPageChange={handleArchivePageChange}
                onEdit={handleEditClick}
                isArchiveView
              />
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
            {hasGroceries && analytics ? (
              <>
                {/* Overview Stats */}
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
                      analytics.total_items > 0
                        ? analytics.total_spent_this_month / analytics.items_this_month || 0
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
                <Card className="py-0 gap-0">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-base font-medium">{t("analysis.weekVsMonth")}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{t("analysis.thisWeek")}</span>
                          <span className="font-medium">{formatCurrency(analytics.total_spent_this_week || 0)}</span>
                        </div>
                        <Progress
                          value={analytics.total_spent_this_month > 0
                            ? (analytics.total_spent_this_week / analytics.total_spent_this_month) * 100
                            : 0
                          }
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {analytics.total_spent_this_month > 0
                            ? Math.round((analytics.total_spent_this_week / analytics.total_spent_this_month) * 100)
                            : 0
                          }% {t("analysis.ofMonthlySpending")}
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
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Category Distribution with Progress Bars */}
                  <Card className="py-0 gap-0">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-base font-medium">{t("analysis.categoryDistribution")}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {Object.entries(analytics.category_breakdown || {})
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 6)
                          .map(([category, count]) => {
                            const maxCount = Math.max(...Object.values(analytics.category_breakdown || {}));
                            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            return (
                              <div key={category}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="capitalize">{t(`categories.${category}`) || category}</span>
                                  <span className="text-muted-foreground">{count} {t("analysis.items")}</span>
                                </div>
                                <Progress value={percentage} className="h-2" />
                              </div>
                            );
                          })}
                        {Object.keys(analytics.category_breakdown || {}).length === 0 && (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            {t("analysis.empty.description")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Store Distribution */}
                  <Card className="py-0 gap-0">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        {t("analysis.topStores")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {Object.entries(analytics.store_breakdown || {})
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([store, count]) => {
                            const maxCount = Math.max(...Object.values(analytics.store_breakdown || {}));
                            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            return (
                              <div key={store}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>{store}</span>
                                  <span className="text-muted-foreground">{count} {t("analysis.items")}</span>
                                </div>
                                <Progress value={percentage} className="h-2" />
                              </div>
                            );
                          })}
                        {Object.keys(analytics.store_breakdown || {}).length === 0 && (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            {t("analysis.noStoreData")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Spending by Category */}
                  <Card className="py-0 gap-0 md:col-span-2">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-base font-medium">{t("analysis.spendingByCategory")}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {Object.entries(analytics.spending_by_category || {})
                          .sort(([, a], [, b]) => b - a)
                          .map(([category, amount]) => {
                            const maxAmount = Math.max(...Object.values(analytics.spending_by_category || {}));
                            const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                            const totalSpending = Object.values(analytics.spending_by_category || {}).reduce((a, b) => a + b, 0);
                            const sharePercentage = totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0;
                            return (
                              <div key={category}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="capitalize">{t(`categories.${category}`) || category}</span>
                                  <span className="font-medium">{formatCurrency(amount)} <span className="text-muted-foreground font-normal">({sharePercentage}%)</span></span>
                                </div>
                                <Progress value={percentage} className="h-2" />
                              </div>
                            );
                          })}
                        {Object.keys(analytics.spending_by_category || {}).length === 0 && (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            {t("analysis.empty.description")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expiry Status */}
                  <Card className="py-0 gap-0 md:col-span-2">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-base font-medium">{t("analysis.expiryStatus")}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                          <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{analytics.expired || 0}</p>
                            <p className="text-sm text-muted-foreground">{t("analysis.expired")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                          <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{analytics.expiring_soon || 0}</p>
                            <p className="text-sm text-muted-foreground">{t("analysis.expiringSoon")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                            <Carrot className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {Math.max(0, analytics.total_items - (analytics.expired || 0) - (analytics.expiring_soon || 0))}
                            </p>
                            <p className="text-sm text-muted-foreground">{t("analysis.fresh")}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Carrot />}
                title={t("analysis.empty.title")}
                description={t("analysis.empty.description")}
                action={{
                  label: t("addGroceries"),
                  onClick: handleAddClick,
                }}
              />
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="space-y-6">
            {/* Period Selector */}
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
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : historyData && historyData.total_items > 0 ? (
              <>
                {/* Overview Stats */}
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

                {/* Monthly Trends Charts */}
                <div className="grid gap-6">
                  {/* Items Trend */}
                  <Card className="py-0 gap-0">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {t("history.itemsTrend")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="flex gap-3">
                        {historyData.monthly_data.map((month) => {
                          const maxItems = Math.max(...historyData.monthly_data.map(m => m.total_items));
                          const heightPx = maxItems > 0 ? Math.round((month.total_items / maxItems) * 80) : 0;
                          return (
                            <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                              <span className="text-sm font-semibold">{month.total_items}</span>
                              <div className="h-20 w-full flex items-end px-1">
                                <div
                                  className="w-full bg-blue-500 rounded-t transition-all"
                                  style={{ height: `${heightPx}px`, minHeight: month.total_items > 0 ? '4px' : '0' }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{month.month_label.split(' ')[0]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Spending Trend */}
                  <Card className="py-0 gap-0">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {t("history.spendingTrend")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="flex gap-3">
                        {historyData.monthly_data.map((month) => {
                          const maxSpent = Math.max(...historyData.monthly_data.map(m => m.total_spent));
                          const heightPx = maxSpent > 0 ? Math.round((month.total_spent / maxSpent) * 80) : 0;
                          return (
                            <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                              <span className="text-sm font-semibold">{formatCurrency(month.total_spent)}</span>
                              <div className="h-20 w-full flex items-end px-1">
                                <div
                                  className="w-full bg-green-500 rounded-t transition-all"
                                  style={{ height: `${heightPx}px`, minHeight: month.total_spent > 0 ? '4px' : '0' }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{month.month_label.split(' ')[0]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Top Purchased Items */}
                  <Card className="py-0 gap-0">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-base font-medium">{t("history.topItems")}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {historyData.top_items.slice(0, 8).map((item, index) => {
                          const maxCount = historyData.top_items[0]?.purchase_count || 1;
                          const percentage = (item.purchase_count / maxCount) * 100;
                          return (
                            <div key={item.item_name}>
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-muted-foreground w-5">{index + 1}.</span>
                                  <span className="text-sm font-medium">{item.item_name}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {item.purchase_count} {t("history.purchaseCount")}
                                </span>
                              </div>
                              <Progress value={percentage} className="h-1.5" />
                              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>{formatCurrency(item.total_spent)} {t("history.totalSpent")}</span>
                                <span>{t("history.avgPrice")}: {formatCurrency(item.avg_price)}</span>
                              </div>
                            </div>
                          );
                        })}
                        {historyData.top_items.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {t("history.noData")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Trends */}
                  <Card className="py-0 gap-0">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-base font-medium">{t("history.categoryTrends")}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {Object.entries(historyData.category_trends)
                          .map(([category, monthData]) => ({
                            category,
                            total: Object.values(monthData).reduce((a, b) => a + b, 0),
                          }))
                          .sort((a, b) => b.total - a.total)
                          .slice(0, 6)
                          .map(({ category, total }) => {
                            const maxTotal = Math.max(
                              ...Object.entries(historyData.category_trends)
                                .map(([, monthData]) => Object.values(monthData).reduce((a, b) => a + b, 0))
                            );
                            const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                            return (
                              <div key={category}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="capitalize">{t(`categories.${category}`) || category}</span>
                                  <span className="text-muted-foreground">{total} {t("analysis.items")}</span>
                                </div>
                                <Progress value={percentage} className="h-2" />
                              </div>
                            );
                          })}
                        {Object.keys(historyData.category_trends).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {t("history.noData")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Store Trends */}
                  <Card className="py-0 gap-0 md:col-span-2">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        {t("history.storeTrends")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
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
                                {total} {t("analysis.items")} • {months} {t("history.purchaseCount").replace('purchases', 'months')}
                              </div>
                            </div>
                          ))}
                        {Object.keys(historyData.store_trends).length === 0 && (
                          <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                            {t("analysis.noStoreData")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<History />}
                title={t("history.empty.title")}
                description={t("history.empty.description")}
                action={{
                  label: t("addGroceries"),
                  onClick: handleAddClick,
                }}
              />
            )}
          </div>
        </TabsContent>
      </ModuleTabs>

      {/* Add/Edit Form Dialog */}
      <GroceryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingGrocery={editingGrocery}
      />

      {/* Bulk Add Form Dialog */}
      <GroceryBulkForm
        open={bulkFormOpen}
        onOpenChange={setBulkFormOpen}
      />
    </>
  );
}
