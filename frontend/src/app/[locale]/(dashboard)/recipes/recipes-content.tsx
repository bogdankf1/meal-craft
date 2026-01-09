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
  Import,
  BookOpen,
  Heart,
  Clock,
  FolderOpen,
  Star,
  Search,
  CalendarCheck,
  ArrowLeft,
  Sparkles,
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  RecipeTable,
  RecipeFilters,
  RecipeForm,
  RecipeImport,
  RecordCookingDialog,
  CollectionManager,
  AddToCollectionDialog,
  AddToShoppingListDialog,
  AiRecipeSuggestionsDialog,
  ViewRecipeDialog,
  RecipeInsights,
} from "@/components/modules/recipes";
import { AddToShoppingListDialog as SimpleShoppingListDialog } from "@/components/modules/shopping-lists";
import {
  useGetRecipesQuery,
  useGetRecipeQuery,
  useLazyGetRecipeQuery,
  useGetRecipeAnalyticsQuery,
  useGetRecipeHistoryQuery,
  useGetCookingHistoryQuery,
  useGetCollectionWithRecipesQuery,
  type RecipeListItem,
  type Recipe,
  type RecipeCollection,
  type RecipeFilters as RecipeFilterType,
} from "@/lib/api/recipes-api";

export function RecipesContent() {
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State for active items
  const [filters, setFilters] = useState<RecipeFilterType>({
    page: 1,
    per_page: 20,
    sort_by: "created_at",
    sort_order: "desc",
    is_archived: false,
  });

  // State for archived items
  const [archiveFilters, setArchiveFilters] = useState<RecipeFilterType>({
    page: 1,
    per_page: 20,
    sort_by: "created_at",
    sort_order: "desc",
    is_archived: true,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecipeListItem | null>(null);
  const [historyMonths, setHistoryMonths] = useState(3);
  const [cookingDialogOpen, setCookingDialogOpen] = useState(false);
  const [selectedRecipeForCooking, setSelectedRecipeForCooking] =
    useState<RecipeListItem | null>(null);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [selectedRecipesForCollection, setSelectedRecipesForCollection] =
    useState<RecipeListItem[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<RecipeCollection | null>(null);
  const [shoppingListDialogOpen, setShoppingListDialogOpen] = useState(false);
  const [selectedRecipeForShoppingList, setSelectedRecipeForShoppingList] = useState<Recipe | null>(null);
  const [simpleShoppingListDialogOpen, setSimpleShoppingListDialogOpen] = useState(false);
  const [simpleShoppingListItems, setSimpleShoppingListItems] = useState<{ name: string; category?: string }[]>([]);
  const [aiSuggestionsOpen, setAiSuggestionsOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecipeForView, setSelectedRecipeForView] = useState<RecipeListItem | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [favoriteFilter, setFavoriteFilter] = useState("all");

  // API queries
  const { data: recipesData, isLoading: isLoadingRecipes } = useGetRecipesQuery({
    ...filters,
    search: searchQuery || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    difficulty: difficultyFilter !== "all" ? difficultyFilter : undefined,
    cuisine_type: cuisineFilter !== "all" ? cuisineFilter : undefined,
    is_favorite: favoriteFilter !== "all" ? favoriteFilter === "true" : undefined,
  });
  const { data: archivedData, isLoading: isLoadingArchived } =
    useGetRecipesQuery(archiveFilters);
  const { data: analytics } = useGetRecipeAnalyticsQuery();
  useGetRecipeHistoryQuery(historyMonths);
  const { data: cookingHistoryData } = useGetCookingHistoryQuery({
    page: 1,
    per_page: 10,
  });

  // Get full recipe data for editing
  const { data: editingRecipeData } = useGetRecipeQuery(editingItem?.id ?? "", {
    skip: !editingItem?.id,
  });

  // Get collection with recipes when a collection is selected
  const { data: collectionData, isLoading: isLoadingCollection } =
    useGetCollectionWithRecipesQuery(selectedCollection?.id ?? "", {
      skip: !selectedCollection?.id,
    });

  // Lazy query for fetching recipe details when adding to shopping list
  const [fetchRecipe] = useLazyGetRecipeQuery();

  const navigateToTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  const tabs = [
    { value: "overview", label: t("tabs.overview"), icon: <LayoutGrid className="h-4 w-4" /> },
    { value: "import", label: t("tabs.import"), icon: <Import className="h-4 w-4" /> },
    { value: "collections", label: t("tabs.collections"), icon: <FolderOpen className="h-4 w-4" /> },
    { value: "archive", label: t("tabs.archive"), icon: <Archive className="h-4 w-4" /> },
    { value: "analysis", label: t("tabs.analysis"), icon: <BarChart3 className="h-4 w-4" /> },
  ];

  const handleAddClick = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEditClick = (item: RecipeListItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleCookClick = (item: RecipeListItem) => {
    setSelectedRecipeForCooking(item);
    setCookingDialogOpen(true);
  };

  const handleViewClick = (item: RecipeListItem) => {
    setSelectedRecipeForView(item);
    setViewDialogOpen(true);
  };

  const handleAddToCollection = (items: RecipeListItem[]) => {
    setSelectedRecipesForCollection(items);
    setCollectionDialogOpen(true);
  };

  const handleAddToShoppingList = async (item: RecipeListItem) => {
    try {
      const result = await fetchRecipe(item.id).unwrap();
      setSelectedRecipeForShoppingList(result);
      setShoppingListDialogOpen(true);
    } catch (error) {
      console.error("Error fetching recipe:", error);
    }
  };

  const handleSimpleAddToShoppingList = (items: { name: string; category?: string }[]) => {
    setSimpleShoppingListItems(items);
    setSimpleShoppingListDialogOpen(true);
  };

  const handleSelectCollection = (collection: RecipeCollection) => {
    setSelectedCollection(collection);
  };

  const handleBackToCollections = () => {
    setSelectedCollection(null);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleArchivePageChange = (page: number) => {
    setArchiveFilters({ ...archiveFilters, page });
  };

  const hasRecipes = (recipesData?.total || 0) > 0;
  const hasArchivedItems = (archivedData?.total || 0) > 0;

  // Helper to translate category names
  const translateCategory = (category: string) => {
    try {
      return t(`categories.${category}`);
    } catch {
      return category;
    }
  };

  // Helper to translate difficulty
  const translateDifficulty = (difficulty: string) => {
    try {
      return t(`difficulties.${difficulty}`);
    } catch {
      return difficulty;
    }
  };

  // Convert analytics data to DistributionList format
  const categoryDistributionItems = (analytics?.by_category || []).map((item) => ({
    key: item.category,
    label: translateCategory(item.category),
    value: item.count,
  }));

  const cuisineDistributionItems = (analytics?.by_cuisine || []).map((item) => ({
    key: item.cuisine,
    label: item.cuisine || t("cuisines.other"),
    value: item.count,
  }));

  const difficultyDistributionItems = (analytics?.by_difficulty || []).map((item) => ({
    key: item.difficulty,
    label: translateDifficulty(item.difficulty),
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
              title={t("stats.totalRecipes")}
              value={analytics?.total_recipes || 0}
              icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
            />
            <StatsCard
              title={t("stats.favorites")}
              value={analytics?.total_favorites || 0}
              icon={<Heart className="h-4 w-4 text-muted-foreground" />}
            />
            <StatsCard
              title={t("stats.timesCooked")}
              value={analytics?.total_times_cooked || 0}
              icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
            />
            <StatsCard
              title={t("stats.avgCookTime")}
              value={
                analytics?.avg_cook_time
                  ? `${Math.round(analytics.avg_cook_time)} min`
                  : "-"
              }
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Cross-module Insights */}
          {recipesData?.items && recipesData.items.length > 0 && (
            <div className="mb-6">
              <RecipeInsights
                recipes={recipesData.items}
                onNavigateToPantry={() => router.push("/pantry")}
                onNavigateToShoppingLists={() => router.push("/shopping-lists")}
                onNavigateToLearning={() => router.push("/learning")}
                onPantryClick={(ingredientName) => {
                  const encodedSearch = encodeURIComponent(ingredientName);
                  router.push(`/pantry?search=${encodedSearch}`);
                }}
                onAddToShoppingList={handleSimpleAddToShoppingList}
                onSkillClick={(skillName) => {
                  const encodedSearch = encodeURIComponent(skillName);
                  router.push(`/learning?tab=library&search=${encodedSearch}`);
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
              <RecipeFilters
                category={categoryFilter}
                onCategoryChange={setCategoryFilter}
                difficulty={difficultyFilter}
                onDifficultyChange={setDifficultyFilter}
                cuisineType={cuisineFilter}
                onCuisineTypeChange={setCuisineFilter}
                isFavorite={favoriteFilter}
                onIsFavoriteChange={setFavoriteFilter}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addRecipe")}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleAddClick}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addSingle")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAiSuggestionsOpen(true)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t("aiSuggestions.title")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateToTab("import")}>
                    <Import className="h-4 w-4 mr-2" />
                    {t("importRecipes")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table or Empty State */}
          {hasRecipes || isLoadingRecipes ? (
            <RecipeTable
              data={recipesData}
              isLoading={isLoadingRecipes}
              page={filters.page || 1}
              onPageChange={handlePageChange}
              onEdit={handleEditClick}
              onView={handleViewClick}
              onCook={handleCookClick}
              onAddToShoppingList={handleAddToShoppingList}
              onAddToCollection={handleAddToCollection}
            />
          ) : (
            <EmptyState
              icon={<BookOpen className="h-12 w-12" />}
              title={t("empty.title")}
              description={t("empty.description")}
              action={{ label: t("addRecipe"), onClick: handleAddClick }}
            />
          )}
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <RecipeImport
            onViewItems={() => navigateToTab("overview")}
            initialAiQuery={searchParams.get("aiImport") || undefined}
          />
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections">
          {selectedCollection ? (
            <div className="space-y-6">
              {/* Collection Header */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToCollections}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {tCommon("back")}
                </Button>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: selectedCollection.color || "#3b82f6" }}
                  />
                  <h2 className="text-lg font-semibold">{selectedCollection.name}</h2>
                  <Badge variant="secondary">
                    {t("collections.recipeCount", {
                      count: collectionData?.recipes?.length ?? selectedCollection.recipe_count,
                    })}
                  </Badge>
                </div>
              </div>

              {/* Collection Description */}
              {selectedCollection.description && (
                <p className="text-muted-foreground">{selectedCollection.description}</p>
              )}

              {/* Collection Recipes */}
              {isLoadingCollection ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">{tCommon("loading")}</div>
                </div>
              ) : collectionData?.recipes && collectionData.recipes.length > 0 ? (
                <RecipeTable
                  data={{
                    items: collectionData.recipes,
                    total: collectionData.recipes.length,
                    page: 1,
                    per_page: collectionData.recipes.length,
                    total_pages: 1,
                  }}
                  isLoading={false}
                  page={1}
                  onPageChange={() => {}}
                  onEdit={handleEditClick}
                  onView={handleViewClick}
                  onCook={handleCookClick}
                  onAddToShoppingList={handleAddToShoppingList}
                  onAddToCollection={handleAddToCollection}
                />
              ) : (
                <EmptyState
                  icon={<FolderOpen className="h-12 w-12" />}
                  title={t("collectionDetail.empty.title")}
                  description={t("collectionDetail.empty.description")}
                  action={{ label: t("tabs.overview"), onClick: () => navigateToTab("overview") }}
                />
              )}
            </div>
          ) : (
            <CollectionManager
              onSelectCollection={handleSelectCollection}
              selectedCollectionId={null}
            />
          )}
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive">
          {hasArchivedItems || isLoadingArchived ? (
            <RecipeTable
              data={archivedData}
              isLoading={isLoadingArchived}
              page={archiveFilters.page || 1}
              onPageChange={handleArchivePageChange}
              onEdit={handleEditClick}
              onView={handleViewClick}
              onAddToShoppingList={handleAddToShoppingList}
              onAddToCollection={handleAddToCollection}
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

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          <div className="space-y-6">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("analysis.period")}:</span>
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

                {/* By Cuisine */}
                <AnalyticsCard title={t("analysis.byCuisine")}>
                  <DistributionList
                    items={cuisineDistributionItems}
                    emptyMessage={t("analysis.noData")}
                  />
                </AnalyticsCard>

                {/* By Difficulty */}
                <AnalyticsCard title={t("analysis.byDifficulty")}>
                  <DistributionList
                    items={difficultyDistributionItems}
                    emptyMessage={t("analysis.noData")}
                  />
                </AnalyticsCard>
              </div>
            )}

            {/* Most Cooked Recipes */}
            {analytics?.most_cooked && analytics.most_cooked.length > 0 && (
              <AnalyticsCard title={t("analysis.mostCooked")}>
                <div className="divide-y">
                  {analytics.most_cooked.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.category ? translateCategory(item.category) : t("categories.other")}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {t("analysis.cookedTimes", { count: item.times_cooked })}
                      </Badge>
                    </div>
                  ))}
                </div>
              </AnalyticsCard>
            )}

            {/* Recently Cooked */}
            {cookingHistoryData?.items && cookingHistoryData.items.length > 0 && (
              <AnalyticsCard title={t("analysis.recentlyCookedTitle")}>
                <div className="divide-y">
                  {cookingHistoryData.items.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{item.recipe_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(item.cooked_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      {item.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= item.rating!
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300 dark:text-gray-600"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AnalyticsCard>
            )}

            {/* Empty state for analysis */}
            {(!analytics || analytics.total_recipes === 0) && (
              <EmptyState
                icon={<BarChart3 className="h-12 w-12" />}
                title={t("analysis.empty.title")}
                description={t("analysis.empty.description")}
                action={{ label: t("addRecipe"), onClick: handleAddClick }}
              />
            )}
          </div>
        </TabsContent>
      </ModuleTabs>

      {/* Form Dialog */}
      <RecipeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingItem={editingRecipeData || null}
        onSuccess={() => {
          setFormOpen(false);
          setEditingItem(null);
        }}
      />

      {/* Record Cooking Dialog */}
      <RecordCookingDialog
        open={cookingDialogOpen}
        onOpenChange={setCookingDialogOpen}
        recipe={selectedRecipeForCooking}
      />

      {/* Add to Collection Dialog */}
      <AddToCollectionDialog
        open={collectionDialogOpen}
        onOpenChange={setCollectionDialogOpen}
        recipeIds={selectedRecipesForCollection.map((r) => r.id)}
        recipeNames={selectedRecipesForCollection.map((r) => r.name)}
        onSuccess={() => setSelectedRecipesForCollection([])}
      />

      {/* Add to Shopping List Dialog */}
      {selectedRecipeForShoppingList && (
        <AddToShoppingListDialog
          open={shoppingListDialogOpen}
          onOpenChange={(open) => {
            setShoppingListDialogOpen(open);
            if (!open) setSelectedRecipeForShoppingList(null);
          }}
          recipeName={selectedRecipeForShoppingList.name}
          ingredients={selectedRecipeForShoppingList.ingredients}
          servings={selectedRecipeForShoppingList.servings}
          onSuccess={() => setSelectedRecipeForShoppingList(null)}
        />
      )}

      {/* Simple Shopping List Dialog for missing ingredients */}
      <SimpleShoppingListDialog
        open={simpleShoppingListDialogOpen}
        onOpenChange={(open) => {
          setSimpleShoppingListDialogOpen(open);
          if (!open) setSimpleShoppingListItems([]);
        }}
        items={simpleShoppingListItems}
        onSuccess={() => setSimpleShoppingListItems([])}
      />

      {/* AI Recipe Suggestions Dialog */}
      <AiRecipeSuggestionsDialog
        open={aiSuggestionsOpen}
        onOpenChange={setAiSuggestionsOpen}
        onSuccess={() => {
          // Refresh data after adding new recipes
          setFilters((prev) => ({ ...prev }));
        }}
      />

      {/* View Recipe Dialog */}
      <ViewRecipeDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        recipe={selectedRecipeForView}
      />
    </div>
  );
}
