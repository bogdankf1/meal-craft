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
  Import,
  Wrench,
  History,
  ChefHat,
  DollarSign,
  Package,
  List,
  Clock,
  CheckCircle2,
  Calendar,
} from "lucide-react";

import {
  ModuleTabs,
  TabsContent,
  StatsCard,
  EmptyState,
  AnalyticsCard,
  DistributionList,
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
  KitchenEquipmentForm,
  KitchenEquipmentBulkForm,
  KitchenEquipmentTable,
  KitchenEquipmentFilters,
  KitchenEquipmentImport,
  RecordMaintenanceDialog,
  KitchenEquipmentInsights,
} from "@/components/modules/kitchen-equipment";
import { AddToShoppingListDialog } from "@/components/modules/shopping-lists";
import {
  useGetKitchenEquipmentQuery,
  useGetKitchenEquipmentAnalyticsQuery,
  useGetMaintenanceOverviewQuery,
  useGetKitchenEquipmentHistoryQuery,
  type KitchenEquipment,
  type KitchenEquipmentFilters as EquipmentFilters,
} from "@/lib/api/kitchen-equipment-api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useCurrency } from "@/components/providers/currency-provider";

export function KitchenEquipmentContent() {
  const t = useTranslations("kitchenEquipment");
  const tCommon = useTranslations("common");
  const { formatPriceFromUAH } = useCurrency();

  // State for active items
  const [filters, setFilters] = useState<EquipmentFilters>({
    page: 1,
    per_page: 20,
    sort_by: "created_at",
    sort_order: "desc",
    is_archived: false,
  });

  // State for archived items
  const [archiveFilters, setArchiveFilters] = useState<EquipmentFilters>({
    page: 1,
    per_page: 20,
    sort_by: "created_at",
    sort_order: "desc",
    is_archived: true,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [bulkFormOpen, setBulkFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KitchenEquipment | null>(null);
  const [historyMonths, setHistoryMonths] = useState(3);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [shoppingListDialogOpen, setShoppingListDialogOpen] = useState(false);
  const [itemsToAddToShoppingList, setItemsToAddToShoppingList] = useState<
    { name: string; quantity?: number | null; unit?: string | null; category?: string | null }[]
  >([]);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [maintenanceFilter, setMaintenanceFilter] = useState("all");

  // API queries
  const { data: equipmentData, isLoading: isLoadingEquipment } =
    useGetKitchenEquipmentQuery({
      ...filters,
      search: searchQuery || undefined,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      condition: conditionFilter !== "all" ? conditionFilter : undefined,
      location: locationFilter !== "all" ? locationFilter : undefined,
      needs_maintenance: maintenanceFilter !== "all" ? maintenanceFilter === "true" : undefined,
    });
  const { data: archivedData, isLoading: isLoadingArchived } =
    useGetKitchenEquipmentQuery(archiveFilters);
  const { data: analytics } = useGetKitchenEquipmentAnalyticsQuery();
  const { data: maintenanceOverview } = useGetMaintenanceOverviewQuery();
  const { data: historyData, isLoading: isLoadingHistory } =
    useGetKitchenEquipmentHistoryQuery(historyMonths);

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
    { value: "maintenance", label: t("tabs.maintenance"), icon: <Wrench className="h-4 w-4" /> },
    { value: "analysis", label: t("tabs.analysis"), icon: <BarChart3 className="h-4 w-4" /> },
  ];

  const handleAddClick = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEditClick = (item: KitchenEquipment) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleArchivePageChange = (page: number) => {
    setArchiveFilters({ ...archiveFilters, page });
  };

  const hasEquipmentItems = (equipmentData?.total || 0) > 0;
  const hasArchivedItems = (archivedData?.total || 0) > 0;

  // Helper to translate category names
  const translateCategory = (category: string) => {
    try {
      return t(`categories.${category}`);
    } catch {
      return category;
    }
  };

  // Helper to translate conditions
  const translateCondition = (condition: string) => {
    try {
      return t(`conditions.${condition}`);
    } catch {
      return condition;
    }
  };

  // Helper to translate locations
  const translateLocation = (location: string) => {
    try {
      return t(`locations.${location}`);
    } catch {
      return location;
    }
  };

  // Convert analytics data to DistributionList format
  const categoryDistributionItems = (analytics?.items_by_category || []).map(
    (item) => ({
      key: item.category,
      label: translateCategory(item.category),
      value: item.count,
    })
  );

  const conditionDistributionItems = (analytics?.items_by_condition || []).map(
    (item) => ({
      key: item.condition,
      label: translateCondition(item.condition),
      value: item.count,
    })
  );

  const locationDistributionItems = (analytics?.items_by_location || []).map(
    (item) => ({
      key: item.location,
      label: translateLocation(item.location),
      value: item.count,
    })
  );

  return (
    <div className="space-y-6">
      <ModuleTabs tabs={tabs} defaultTab="overview">
        {/* Overview Tab */}
        <TabsContent value="overview">
          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatsCard
              title={t("stats.totalItems")}
              value={analytics?.total_items || 0}
              icon={<ChefHat className="h-4 w-4 text-muted-foreground" />}
            />
            <StatsCard
              title={t("stats.needsMaintenance")}
              value={analytics?.needs_maintenance || 0}
              icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
              variant={
                (analytics?.needs_maintenance || 0) > 0 ? "warning" : "default"
              }
            />
            <StatsCard
              title={t("stats.needsRepair")}
              value={analytics?.needs_repair || 0}
              icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
              variant={
                (analytics?.needs_repair || 0) > 0 ? "danger" : "default"
              }
            />
            <StatsCard
              title={t("stats.totalValue")}
              value={formatPriceFromUAH(Number(analytics?.total_value || 0))}
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Insights Section - Recipes & Learning Integration */}
          {equipmentData?.items && equipmentData.items.length > 0 && (
            <div className="mb-6">
              <KitchenEquipmentInsights
                equipmentItems={equipmentData.items}
                onNavigateToRecipes={() => router.push("/recipes")}
                onNavigateToLearning={() => router.push("/learning")}
                onAddToWishlist={(equipment) => {
                  setItemsToAddToShoppingList([{ name: equipment.name, category: equipment.category }]);
                  setShoppingListDialogOpen(true);
                }}
                onRecipeClick={(recipeName) => {
                  // Navigate to recipes page with search prefilled
                  const encodedSearch = encodeURIComponent(recipeName);
                  router.push(`/recipes?search=${encodedSearch}`);
                }}
                onSkillClick={(skillName) => {
                  // Navigate to learning page with search prefilled
                  const encodedSearch = encodeURIComponent(skillName);
                  router.push(`/learning?search=${encodedSearch}`);
                }}
              />
            </div>
          )}

          {/* Filters Row */}
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
              <KitchenEquipmentFilters
                category={categoryFilter}
                onCategoryChange={setCategoryFilter}
                condition={conditionFilter}
                onConditionChange={setConditionFilter}
                location={locationFilter}
                onLocationChange={setLocationFilter}
                needsMaintenance={maintenanceFilter}
                onNeedsMaintenanceChange={setMaintenanceFilter}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
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
                    {t("addSingle")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBulkFormOpen(true)}>
                    <List className="h-4 w-4 mr-2" />
                    {t("addMultiple")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateToTab("import")}>
                    <Import className="h-4 w-4 mr-2" />
                    {t("importItems")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table or Empty State */}
          {hasEquipmentItems || isLoadingEquipment ? (
            <KitchenEquipmentTable
              data={equipmentData}
              isLoading={isLoadingEquipment}
              page={filters.page || 1}
              onPageChange={handlePageChange}
              onEdit={handleEditClick}
            />
          ) : (
            <EmptyState
              icon={<ChefHat className="h-12 w-12" />}
              title={t("empty.title")}
              description={t("empty.description")}
              action={{ label: t("addItem"), onClick: handleAddClick }}
            />
          )}
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <KitchenEquipmentImport
            onViewItems={() => navigateToTab("overview")}
          />
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive">
          {hasArchivedItems || isLoadingArchived ? (
            <KitchenEquipmentTable
              data={archivedData}
              isLoading={isLoadingArchived}
              page={archiveFilters.page || 1}
              onPageChange={handleArchivePageChange}
              onEdit={handleEditClick}
              isArchiveView
            />
          ) : (
            <EmptyState
              icon={<Archive className="h-12 w-12" />}
              title={t("archive.empty.title")}
              description={t("archive.empty.description")}
            />
          )}
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <div className="space-y-6">
            {/* Maintenance Stats */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title={t("maintenance.stats.total")}
                value={maintenanceOverview?.total_equipment || 0}
                icon={<Package className="h-4 w-4 text-muted-foreground" />}
              />
              <StatsCard
                title={t("maintenance.stats.needsMaintenance")}
                value={maintenanceOverview?.needs_maintenance || 0}
                icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
                variant={
                  (maintenanceOverview?.needs_maintenance || 0) > 0
                    ? "warning"
                    : "default"
                }
              />
              <StatsCard
                title={t("maintenance.stats.rate")}
                value={`${maintenanceOverview?.maintenance_rate || 0}%`}
                icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
              />
              <StatsCard
                title={t("maintenance.stats.overdue")}
                value={maintenanceOverview?.overdue_items?.length || 0}
                icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                variant={
                  (maintenanceOverview?.overdue_items?.length || 0) > 0
                    ? "danger"
                    : "default"
                }
              />
            </div>

            {/* Overdue Items */}
            {maintenanceOverview?.overdue_items &&
              maintenanceOverview.overdue_items.length > 0 && (
                <Card className="border-destructive/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      {t("maintenance.overdueItems")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {maintenanceOverview.overdue_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-destructive/10">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            </div>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.category ? translateCategory(item.category) : t("categories.other")}
                                {item.last_maintenance_date && (
                                  <> • {t("maintenance.lastMaintained")}: {format(parseISO(item.last_maintenance_date), "MMM d, yyyy")}</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="destructive">
                              {t("maintenance.daysOverdue", { days: item.days_overdue })}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMaintenanceDialogOpen(true)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              {t("maintenance.markDone")}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Upcoming Maintenance */}
            {maintenanceOverview?.upcoming_items &&
              maintenanceOverview.upcoming_items.length > 0 && (
                <Card className="border-warning/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <Clock className="h-5 w-5" />
                      {t("maintenance.upcomingItems")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {maintenanceOverview.upcoming_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.category ? translateCategory(item.category) : t("categories.other")}
                                {item.last_maintenance_date && (
                                  <> • {t("maintenance.lastMaintained")}: {format(parseISO(item.last_maintenance_date), "MMM d, yyyy")}</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-400">
                              {t("maintenance.daysUntil", { days: Math.abs(item.days_overdue) })}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMaintenanceDialogOpen(true)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              {t("maintenance.markDone")}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* All Items with Maintenance Schedule */}
            {equipmentData && equipmentData.items.filter(item => item.maintenance_interval_days).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t("maintenance.scheduledItems")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {equipmentData.items
                      .filter(item => item.maintenance_interval_days && !item.needs_maintenance)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-muted">
                              <Wrench className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.category ? translateCategory(item.category) : t("categories.other")}
                                {item.brand && ` • ${item.brand}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="text-right">
                              <p>{t("maintenance.interval")}: {item.maintenance_interval_days} {t("maintenance.days")}</p>
                              {item.last_maintenance_date && (
                                <p className="text-xs">
                                  {t("maintenance.lastMaintained")}: {format(parseISO(item.last_maintenance_date), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                            {item.days_until_maintenance !== null && (
                              <Badge variant="secondary">
                                {item.days_until_maintenance}d
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state for maintenance */}
            {(!maintenanceOverview?.overdue_items ||
              maintenanceOverview.overdue_items.length === 0) &&
              (!maintenanceOverview?.upcoming_items ||
                maintenanceOverview.upcoming_items.length === 0) &&
              (!equipmentData || equipmentData.items.filter(item => item.maintenance_interval_days).length === 0) && (
                <EmptyState
                  icon={<Wrench className="h-12 w-12" />}
                  title={t("maintenance.empty.title")}
                  description={t("maintenance.empty.description")}
                />
              )}
          </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          <div className="space-y-6">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("analysis.period")}:
              </span>
              <Select
                value={historyMonths.toString()}
                onValueChange={(value) => setHistoryMonths(parseInt(value))}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t("analysis.months3")}</SelectItem>
                  <SelectItem value="6">{t("analysis.months6")}</SelectItem>
                  <SelectItem value="12">{t("analysis.months12")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {analytics && (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {/* By Category */}
                <AnalyticsCard title={t("analysis.byCategory")}>
                  <DistributionList
                    items={categoryDistributionItems}
                    emptyMessage={t("analysis.noData")}
                  />
                </AnalyticsCard>

                {/* By Condition */}
                <AnalyticsCard title={t("analysis.byCondition")}>
                  <DistributionList
                    items={conditionDistributionItems}
                    emptyMessage={t("analysis.noData")}
                  />
                </AnalyticsCard>

                {/* By Location */}
                <AnalyticsCard title={t("analysis.byLocation")}>
                  <DistributionList
                    items={locationDistributionItems}
                    emptyMessage={t("analysis.noData")}
                  />
                </AnalyticsCard>
              </div>
            )}

            {/* Recently Added */}
            {analytics?.recently_added && analytics.recently_added.length > 0 && (
              <AnalyticsCard title={t("analysis.recentlyAdded")}>
                <div className="divide-y">
                  {analytics.recently_added.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.category
                            ? translateCategory(item.category)
                            : t("categories.other")}
                          {item.brand && ` • ${item.brand}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">
                          {translateCondition(item.condition || "good")}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(item.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </AnalyticsCard>
            )}

            {/* Empty state for analysis */}
            {(!analytics || analytics.total_items === 0) && (
              <EmptyState
                icon={<BarChart3 className="h-12 w-12" />}
                title={t("analysis.empty.title")}
                description={t("analysis.empty.description")}
                action={{ label: t("addItem"), onClick: handleAddClick }}
              />
            )}
          </div>
        </TabsContent>
      </ModuleTabs>

      {/* Form Dialog */}
      <KitchenEquipmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingItem={editingItem}
        onSuccess={() => {
          setFormOpen(false);
          setEditingItem(null);
        }}
      />

      {/* Record Maintenance Dialog */}
      <RecordMaintenanceDialog
        open={maintenanceDialogOpen}
        onOpenChange={setMaintenanceDialogOpen}
        items={
          maintenanceOverview?.overdue_items?.map((item) => ({
            id: item.id,
            name: item.name,
          })) || []
        }
      />

      {/* Bulk Form Dialog */}
      <KitchenEquipmentBulkForm
        open={bulkFormOpen}
        onOpenChange={setBulkFormOpen}
        onSuccess={() => {
          setBulkFormOpen(false);
        }}
      />

      {/* Add to Shopping List Dialog */}
      <AddToShoppingListDialog
        open={shoppingListDialogOpen}
        onOpenChange={setShoppingListDialogOpen}
        items={itemsToAddToShoppingList}
        onSuccess={() => {
          setShoppingListDialogOpen(false);
          setItemsToAddToShoppingList([]);
        }}
      />
    </div>
  );
}
