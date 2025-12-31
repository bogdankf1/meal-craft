"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Leaf,
  Calendar,
  MapPin,
  Search,
  Star,
  Sparkles,
  ShoppingBag,
  ShoppingCart,
  Heart,
  TrendingUp,
  Loader2,
  Info,
  BookOpen,
  ExternalLink,
  Bookmark,
} from "lucide-react";

import {
  ModuleTabs,
  TabsContent,
  StatsCard,
  EmptyState,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetUserSeasonalPreferencesQuery,
  useGetSeasonalProduceQuery,
  useGetLocalSpecialtiesQuery,
  useGetSeasonalCalendarQuery,
  useGetSeasonalRecommendationsMutation,
  useGetWeeklyPicksMutation,
  useAddFavoriteProduceMutation,
  useRemoveFavoriteProduceMutation,
  useSaveRecommendationAsProduceMutation,
  useDeleteProduceMutation,
  SUPPORTED_COUNTRIES,
  PRODUCE_CATEGORIES,
  type SeasonalProduce,
  type SeasonalRecommendation,
  type WeeklyPick,
  type SeasonalProduceFilters,
} from "@/lib/api/seasonality-api";
import { AddToShoppingListDialog } from "@/components/modules/shopping-lists";
import { SeasonalityInsights } from "@/components/modules/seasonality";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Map seasonality categories to shopping list categories
const mapToShoppingListCategory = (seasonalityCategory: string): string => {
  switch (seasonalityCategory) {
    case "seafood":
      return "seafood";
    case "nuts":
    case "grains":
      return "pantry";
    default:
      // vegetables, fruits, herbs, mushrooms all map to produce
      return "produce";
  }
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function SeasonalityContent() {
  const t = useTranslations("seasonality");
  const router = useRouter();

  // Current month
  const currentMonth = new Date().getMonth() + 1;

  // State
  const [produceFilters, setProduceFilters] = useState<SeasonalProduceFilters>({
    page: 1,
    per_page: 50,
    in_season_only: true,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Shopping list dialog state
  const [showShoppingDialog, setShowShoppingDialog] = useState(false);
  const [shoppingItems, setShoppingItems] = useState<{ name: string; category?: string }[]>([]);

  // Produce detail dialog state
  const [selectedProduce, setSelectedProduce] = useState<SeasonalProduce | null>(null);

  // API queries
  const { data: preferences, isLoading: isLoadingPrefs } = useGetUserSeasonalPreferencesQuery();
  const selectedCountry = preferences?.country_code || "UA";

  const { data: produceData, isLoading: isLoadingProduce } = useGetSeasonalProduceQuery({
    ...produceFilters,
    country_code: selectedCountry,
    search: searchQuery || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    month: selectedMonth,
  });

  const { data: specialtiesData, isLoading: isLoadingSpecialties } = useGetLocalSpecialtiesQuery({
    country_code: selectedCountry,
    page: 1,
    per_page: 20,
  });

  const { data: calendarData, isLoading: isLoadingCalendar } = useGetSeasonalCalendarQuery(selectedCountry);

  // AI recommendations
  const [getRecommendations, { data: recommendations, isLoading: isLoadingRecs, reset: resetRecommendations }] = useGetSeasonalRecommendationsMutation();
  const [getWeeklyPicks, { data: weeklyPicks, isLoading: isLoadingPicks, reset: resetWeeklyPicks }] = useGetWeeklyPicksMutation();

  // Mutations
  const [addFavorite] = useAddFavoriteProduceMutation();
  const [removeFavorite] = useRemoveFavoriteProduceMutation();
  const [saveRecommendation, { isLoading: isSavingRecommendation }] = useSaveRecommendationAsProduceMutation();
  const [deleteProduce, { isLoading: isDeletingProduce }] = useDeleteProduceMutation();

  // Track saved and favorited recommendations (by name)
  const [savedProduceNames, setSavedProduceNames] = useState<Set<string>>(new Set());
  const [favoritedProduceNames, setFavoritedProduceNames] = useState<Set<string>>(new Set());
  // Map name to saved produce ID (for favorite toggling)
  const [savedProduceIds, setSavedProduceIds] = useState<Map<string, string>>(new Map());

  const tabs = [
    {
      value: "thisMonth",
      label: t("tabs.thisMonth"),
      icon: <Leaf className="h-4 w-4" />,
    },
    {
      value: "calendar",
      label: t("tabs.calendar"),
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      value: "specialties",
      label: t("tabs.specialties"),
      icon: <MapPin className="h-4 w-4" />,
    },
  ];

  const handleToggleFavorite = async (produce: SeasonalProduce) => {
    try {
      if (produce.is_favorite) {
        await removeFavorite(produce.id).unwrap();
        toast.success(t("messages.removedFromFavorites"));
      } else {
        await addFavorite(produce.id).unwrap();
        toast.success(t("messages.addedToFavorites"));
      }
    } catch {
      toast.error(t("messages.errorUpdatingFavorites"));
    }
  };

  const handleDeleteProduce = async (produce: SeasonalProduce) => {
    try {
      await deleteProduce(produce.id).unwrap();
      toast.success(t("messages.removedFromProduce"));
    } catch {
      toast.error(t("messages.errorSavingProduce"));
    }
  };

  const handleGetRecommendations = async () => {
    try {
      await getRecommendations({
        country_code: selectedCountry,
        month: currentMonth,
      }).unwrap();
    } catch {
      toast.error(t("messages.errorGettingRecommendations"));
    }
  };

  const handleGetWeeklyPicks = async () => {
    try {
      await getWeeklyPicks({ country_code: selectedCountry }).unwrap();
    } catch {
      toast.error(t("messages.errorGettingWeeklyPicks"));
    }
  };

  const handleAddToShoppingList = (items: { name: string; category?: string }[]) => {
    setShoppingItems(items);
    setShowShoppingDialog(true);
  };

  const handleRecipeClick = (recipeName: string, ingredientName: string) => {
    // Navigate to recipes page Import tab with AI-prefilled text
    // Build a prompt that includes the recipe name and main ingredient for AI to generate
    const aiPrompt = `Generate a complete recipe for "${recipeName}" featuring ${ingredientName} as the main ingredient. Include ingredients with quantities, step-by-step instructions, prep time, cook time, and servings.`;
    const encodedPrompt = encodeURIComponent(aiPrompt);
    router.push(`/recipes?tab=import&aiImport=${encodedPrompt}`);
  };

  // Toggle save recommendation to database (save or remove)
  const handleSaveRecommendation = async (rec: SeasonalRecommendation | WeeklyPick) => {
    const name = 'produce_name' in rec ? rec.produce_name : rec.name;
    const description = 'why_now' in rec ? rec.why_now : rec.why_buy_now;
    const storageTip = 'storage_tip' in rec ? rec.storage_tip : undefined;
    const isPeak = 'is_peak' in rec ? rec.is_peak : false;

    const isSaved = savedProduceNames.has(name);
    const produceId = savedProduceIds.get(name);

    try {
      if (isSaved && produceId) {
        // Delete from database
        await deleteProduce(produceId).unwrap();
        setSavedProduceNames(prev => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
        setSavedProduceIds(prev => {
          const next = new Map(prev);
          next.delete(name);
          return next;
        });
        // Also remove from favorites if it was favorited
        setFavoritedProduceNames(prev => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
        toast.success(t("messages.removedFromProduce"));
      } else {
        // Save to database
        const result = await saveRecommendation({
          name,
          category: rec.category,
          country_code: selectedCountry,
          description,
          storage_tips: storageTip || undefined,
          available_months: [currentMonth],
          peak_months: isPeak ? [currentMonth] : undefined,
          add_to_favorites: false,
        }).unwrap();

        setSavedProduceNames(prev => new Set([...prev, name]));
        setSavedProduceIds(prev => new Map(prev).set(name, result.id));
        toast.success(t("messages.savedToProduce"));
      }
    } catch {
      toast.error(t("messages.errorSavingProduce"));
    }
  };

  // Toggle favorite for a recommendation (saves first if not saved)
  const handleFavoriteRecommendation = async (rec: SeasonalRecommendation | WeeklyPick) => {
    const name = 'produce_name' in rec ? rec.produce_name : rec.name;
    const description = 'why_now' in rec ? rec.why_now : rec.why_buy_now;
    const storageTip = 'storage_tip' in rec ? rec.storage_tip : undefined;
    const isPeak = 'is_peak' in rec ? rec.is_peak : false;

    const isFavorited = favoritedProduceNames.has(name);
    const produceId = savedProduceIds.get(name);

    try {
      if (isFavorited && produceId) {
        // Remove from favorites
        await removeFavorite(produceId).unwrap();
        setFavoritedProduceNames(prev => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
        toast.success(t("messages.removedFromFavorites"));
      } else {
        // Save (if not saved) and add to favorites
        const result = await saveRecommendation({
          name,
          category: rec.category,
          country_code: selectedCountry,
          description,
          storage_tips: storageTip || undefined,
          available_months: [currentMonth],
          peak_months: isPeak ? [currentMonth] : undefined,
          add_to_favorites: true,
        }).unwrap();

        setSavedProduceNames(prev => new Set([...prev, name]));
        setSavedProduceIds(prev => new Map(prev).set(name, result.id));
        setFavoritedProduceNames(prev => new Set([...prev, name]));
        toast.success(t("messages.addedToFavorites"));
      }
    } catch {
      toast.error(t("messages.errorUpdatingFavorites"));
    }
  };

  // Get country display info
  const countryInfo = SUPPORTED_COUNTRIES.find(c => c.code === selectedCountry);
  const currentMonthName = MONTHS[currentMonth - 1];

  // Filter produce for favorites if enabled
  const filteredProduce = showFavoritesOnly
    ? produceData?.items.filter(p => p.is_favorite) || []
    : produceData?.items || [];

  // Stats calculations
  const inSeasonCount = produceData?.items.filter(p => p.is_in_season).length || 0;
  const peakCount = produceData?.items.filter(p => p.is_peak_season).length || 0;
  const favoritesCount = produceData?.items.filter(p => p.is_favorite).length || 0;
  const specialtiesCount = specialtiesData?.total || 0;

  // Check if calendar/specialties have data, if not we'll show AI-generated content
  const hasCalendarData = calendarData?.months.some(m => m.produce_count > 0);
  const hasSpecialtiesData = (specialtiesData?.items.length || 0) > 0;

  return (
    <>
      <ModuleTabs tabs={tabs} defaultTab="thisMonth">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatsCard
            title={t("stats.inSeason")}
            value={inSeasonCount}
            icon={<Leaf className="h-4 w-4 text-green-600" />}
            trend={{ value: t("stats.itemsAvailable"), label: "", direction: "neutral" }}
          />
          <StatsCard
            title={t("stats.peakSeason")}
            value={peakCount}
            icon={<TrendingUp className="h-4 w-4 text-orange-600" />}
            trend={{ value: t("stats.atTheirBest"), label: "", direction: "neutral" }}
          />
          <StatsCard
            title={t("stats.favorites")}
            value={favoritesCount}
            icon={<Heart className="h-4 w-4 text-red-500" />}
            trend={{ value: t("stats.savedItems"), label: "", direction: "neutral" }}
          />
          <StatsCard
            title={t("stats.localSpecialties")}
            value={specialtiesCount}
            icon={<MapPin className="h-4 w-4 text-blue-600" />}
            trend={{ value: countryInfo?.name || "", label: "", direction: "neutral" }}
          />
        </div>

        {/* This Month Tab */}
        <TabsContent value="thisMonth" className="space-y-6">
          {/* Country & Month Selector */}
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{countryInfo?.flag}</span>
                  <div>
                    <h3 className="font-semibold">{countryInfo?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("thisMonth.showing", { month: currentMonthName })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleGetWeeklyPicks}
                    disabled={isLoadingPicks}
                  >
                    {isLoadingPicks ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShoppingBag className="h-4 w-4 mr-2" />
                    )}
                    {t("thisMonth.weeklyPicks")}
                  </Button>
                  <Button onClick={handleGetRecommendations} disabled={isLoadingRecs}>
                    {isLoadingRecs ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {t("thisMonth.getRecommendations")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cross-module Insights */}
          {produceData?.items && produceData.items.length > 0 && (
            <SeasonalityInsights
              seasonalProduce={produceData.items}
              currentMonth={currentMonth}
              onNavigateToPantry={() => router.push("/pantry")}
              onNavigateToGroceries={() => router.push("/groceries")}
              onNavigateToRecipes={() => router.push("/recipes")}
              onPantryClick={(ingredientName) => {
                const encodedSearch = encodeURIComponent(ingredientName);
                router.push(`/pantry?search=${encodedSearch}`);
              }}
              onGroceryClick={(itemName) => {
                const encodedSearch = encodeURIComponent(itemName);
                router.push(`/groceries?search=${encodedSearch}`);
              }}
              onRecipeClick={(recipeName) => {
                const encodedSearch = encodeURIComponent(recipeName);
                router.push(`/recipes?search=${encodedSearch}`);
              }}
              onAddToShoppingList={handleAddToShoppingList}
            />
          )}

          {/* AI Recommendations */}
          {recommendations && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {t("thisMonth.aiRecommendations")}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToShoppingList(
                      recommendations.recommendations.map(r => ({ name: r.produce_name, category: "produce" }))
                    )}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {t("thisMonth.addAllToList")}
                  </Button>
                </div>
                <CardDescription className="text-sm">
                  {t("thisMonth.seasonIs", { season: recommendations.season })} - {recommendations.seasonal_tip}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recommendations.recommendations.map((rec, idx) => (
                    <RecommendationCard
                      key={idx}
                      recommendation={rec}
                      onAddToList={() => handleAddToShoppingList([{ name: rec.produce_name, category: "produce" }])}
                      onRecipeClick={(recipe) => handleRecipeClick(recipe, rec.produce_name)}
                      onSave={() => handleSaveRecommendation(rec)}
                      onFavorite={() => handleFavoriteRecommendation(rec)}
                      isSaved={savedProduceNames.has(rec.produce_name)}
                      isFavorite={favoritedProduceNames.has(rec.produce_name)}
                      isSaving={isSavingRecommendation || isDeletingProduce}
                      t={t}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Picks */}
          {weeklyPicks && (
            <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingBag className="h-4 w-4 text-green-600" />
                    {t("thisMonth.whatToBuy")} - {weeklyPicks.week_of}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToShoppingList(weeklyPicks.picks.map(p => ({ name: p.name, category: "produce" })))}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {t("thisMonth.addAllToList")}
                  </Button>
                </div>
                <CardDescription className="text-sm">{weeklyPicks.market_tip}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {weeklyPicks.picks.map((pick, idx) => (
                    <WeeklyPickCard
                      key={idx}
                      pick={pick}
                      onAddToList={() => handleAddToShoppingList([{ name: pick.name, category: "produce" }])}
                      onRecipeClick={(recipe) => handleRecipeClick(recipe, pick.name)}
                      onSave={() => handleSaveRecommendation(pick)}
                      onFavorite={() => handleFavoriteRecommendation(pick)}
                      isSaved={savedProduceNames.has(pick.name)}
                      isFavorite={favoritedProduceNames.has(pick.name)}
                      isSaving={isSavingRecommendation || isDeletingProduce}
                      t={t}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("filters.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t("filters.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
                {PRODUCE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {t(`categories.${cat.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="in-season"
                  checked={produceFilters.in_season_only}
                  onCheckedChange={(checked) =>
                    setProduceFilters(prev => ({ ...prev, in_season_only: checked }))
                  }
                />
                <Label htmlFor="in-season" className="text-sm">
                  {t("filters.inSeasonOnly")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="favorites-only"
                  checked={showFavoritesOnly}
                  onCheckedChange={setShowFavoritesOnly}
                />
                <Label htmlFor="favorites-only" className="text-sm">
                  {t("filters.favoritesOnly")}
                </Label>
              </div>
            </div>
          </div>

          {/* Produce Grid */}
          {isLoadingProduce ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-lg" />
              ))}
            </div>
          ) : filteredProduce.length === 0 ? (
            <EmptyState
              icon={<Leaf className="h-12 w-12" />}
              title={showFavoritesOnly ? t("empty.favorites.title") : t("empty.produce.title")}
              description={showFavoritesOnly ? t("empty.favorites.description") : t("empty.produce.description")}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProduce.map((produce) => (
                <ProduceCard
                  key={produce.id}
                  produce={produce}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDeleteProduce}
                  onAddToList={() => handleAddToShoppingList([{ name: produce.name, category: mapToShoppingListCategory(produce.category) }])}
                  onClick={() => setSelectedProduce(produce)}
                  isDeleting={isDeletingProduce}
                  t={t}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("calendar.title")}</CardTitle>
              <CardDescription>
                {t("calendar.description", { country: countryInfo?.name || "" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCalendar ? (
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {[...Array(12)].map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-lg" />
                  ))}
                </div>
              ) : !hasCalendarData ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">{t("calendar.noData")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("calendar.noDataDescription")}
                  </p>
                  <Button onClick={handleGetRecommendations} disabled={isLoadingRecs}>
                    {isLoadingRecs ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {t("calendar.generateWithAI")}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {calendarData?.months.map((monthData) => (
                    <Card
                      key={monthData.month}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        monthData.month === currentMonth && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedMonth(monthData.month)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center justify-between">
                          {monthData.month_name}
                          {monthData.month === currentMonth && (
                            <Badge>{t("calendar.now")}</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {monthData.produce_count} {t("calendar.items")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {monthData.peak_produce.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-orange-600 mb-1">
                              {t("calendar.peak")}:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {monthData.peak_produce.slice(0, 4).map((name, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {name}
                                </Badge>
                              ))}
                              {monthData.peak_produce.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{monthData.peak_produce.length - 4}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        {monthData.coming_soon.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-green-600 mb-1">
                              {t("calendar.comingSoon")}:
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {monthData.coming_soon.slice(0, 3).join(", ")}
                            </p>
                          </div>
                        )}
                        {monthData.ending_soon.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-red-600 mb-1">
                              {t("calendar.endingSoon")}:
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {monthData.ending_soon.slice(0, 3).join(", ")}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Month Details */}
          {selectedMonth !== currentMonth && hasCalendarData && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("calendar.inSeasonIn", { month: MONTHS[selectedMonth - 1] })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SeasonalProduceByMonth
                  countryCode={selectedCountry}
                  month={selectedMonth}
                  t={t}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Local Specialties Tab */}
        <TabsContent value="specialties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t("specialties.title", { country: countryInfo?.name || "" })}
              </CardTitle>
              <CardDescription>{t("specialties.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSpecialties ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-lg" />
                  ))}
                </div>
              ) : !hasSpecialtiesData ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">{t("specialties.noData")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("specialties.noDataDescription")}
                  </p>
                  <Button onClick={handleGetRecommendations} disabled={isLoadingRecs}>
                    {isLoadingRecs ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {t("specialties.discoverWithAI")}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {specialtiesData?.items.map((specialty) => (
                    <SpecialtyCard key={specialty.id} specialty={specialty} t={t} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </ModuleTabs>

      {/* Shopping List Dialog */}
      <AddToShoppingListDialog
        open={showShoppingDialog}
        onOpenChange={setShowShoppingDialog}
        items={shoppingItems}
        onSuccess={() => setShoppingItems([])}
      />

      {/* Produce Detail Dialog */}
      <Dialog open={!!selectedProduce} onOpenChange={(open) => !open && setSelectedProduce(null)}>
        <DialogContent className="max-w-md">
          {selectedProduce && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedProduce.name}
                  {selectedProduce.is_peak_season && (
                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                      {t("badges.peak")}
                    </Badge>
                  )}
                  {selectedProduce.is_in_season && !selectedProduce.is_peak_season && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      {t("badges.inSeason")}
                    </Badge>
                  )}
                </DialogTitle>
                {selectedProduce.name_local && (
                  <p className="text-sm text-muted-foreground">{selectedProduce.name_local}</p>
                )}
              </DialogHeader>

              <div className="space-y-4">
                <Badge variant="outline">
                  {t(`categories.${selectedProduce.category}`)}
                </Badge>

                {selectedProduce.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">{t("details.description")}</p>
                    <p className="text-sm text-muted-foreground">{selectedProduce.description}</p>
                  </div>
                )}

                {selectedProduce.storage_tips && (
                  <div>
                    <p className="text-sm font-medium mb-1">{t("details.storageTips")}</p>
                    <p className="text-sm text-muted-foreground">{selectedProduce.storage_tips}</p>
                  </div>
                )}

                {selectedProduce.nutrition_highlights && (
                  <div>
                    <p className="text-sm font-medium mb-1">{t("details.nutrition")}</p>
                    <p className="text-sm text-muted-foreground">{selectedProduce.nutrition_highlights}</p>
                  </div>
                )}

                {selectedProduce.culinary_uses && (
                  <div>
                    <p className="text-sm font-medium mb-1">{t("details.culinaryUses")}</p>
                    <p className="text-sm text-muted-foreground">{selectedProduce.culinary_uses}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      handleToggleFavorite(selectedProduce);
                    }}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 mr-2",
                        selectedProduce.is_favorite ? "fill-red-500 text-red-500" : ""
                      )}
                    />
                    {selectedProduce.is_favorite ? t("actions.removeFromFavorites") : t("actions.addToFavorites")}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleAddToShoppingList([{ name: selectedProduce.name, category: mapToShoppingListCategory(selectedProduce.category) }]);
                      setSelectedProduce(null);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {t("actions.addToList")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============ Sub-components ============

interface RecommendationCardProps {
  recommendation: SeasonalRecommendation;
  onAddToList: () => void;
  onRecipeClick: (recipe: string) => void;
  onSave: () => void;
  onFavorite: () => void;
  isSaved: boolean;
  isFavorite: boolean;
  isSaving: boolean;
  t: ReturnType<typeof useTranslations>;
}

function RecommendationCard({ recommendation: rec, onAddToList, onRecipeClick, onSave, onFavorite, isSaved, isFavorite, isSaving, t }: RecommendationCardProps) {
  return (
    <Card className="bg-background">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium">{rec.produce_name}</h4>
          <div className="flex items-center gap-1">
            {rec.is_peak && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                {t("badges.peak")}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onSave}
              disabled={isSaving}
              title={isSaved ? t("actions.unsave") : t("actions.save")}
            >
              <Bookmark
                className={cn(
                  "h-4 w-4",
                  isSaved ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onFavorite}
              disabled={isSaving}
              title={isFavorite ? t("actions.removeFromFavorites") : t("actions.addToFavorites")}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-500"
                )}
              />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddToList}>
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{rec.why_now}</p>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t("thisMonth.recipeIdeas")}:</p>
          <ul className="text-sm space-y-1">
            {rec.recipe_ideas.map((idea, i) => (
              <li
                key={i}
                className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors group"
                onClick={() => onRecipeClick(idea)}
              >
                <BookOpen className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                <span className="flex-1">{idea}</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </li>
            ))}
          </ul>
        </div>
        {rec.storage_tip && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
            <Info className="h-3 w-3 inline mr-1" />
            {rec.storage_tip}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface WeeklyPickCardProps {
  pick: WeeklyPick;
  onAddToList: () => void;
  onRecipeClick: (recipe: string) => void;
  onSave: () => void;
  onFavorite: () => void;
  isSaved: boolean;
  isFavorite: boolean;
  isSaving: boolean;
  t: ReturnType<typeof useTranslations>;
}

function WeeklyPickCard({ pick, onAddToList, onRecipeClick, onSave, onFavorite, isSaved, isFavorite, isSaving, t }: WeeklyPickCardProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">{pick.name}</span>
            {pick.budget_friendly && (
              <Badge variant="outline" className="text-xs">💰</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onSave}
              disabled={isSaving}
              title={isSaved ? t("actions.unsave") : t("actions.save")}
            >
              <Bookmark
                className={cn(
                  "h-4 w-4",
                  isSaved ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onFavorite}
              disabled={isSaving}
              title={isFavorite ? t("actions.removeFromFavorites") : t("actions.addToFavorites")}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-500"
                )}
              />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddToList}>
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {pick.name_local && (
          <p className="text-xs text-muted-foreground">{pick.name_local}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">{pick.why_buy_now}</p>
        <p
          className="text-xs mt-2 cursor-pointer hover:text-primary transition-colors group flex items-center gap-1"
          onClick={() => onRecipeClick(pick.recipe_suggestion)}
        >
          <span className="font-medium">{t("thisMonth.try")}:</span>
          <span className="group-hover:underline">{pick.recipe_suggestion}</span>
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </p>
      </div>
    </div>
  );
}

interface ProduceCardProps {
  produce: SeasonalProduce;
  onToggleFavorite: (produce: SeasonalProduce) => void;
  onDelete: (produce: SeasonalProduce) => void;
  onAddToList: () => void;
  onClick: () => void;
  isDeleting: boolean;
  t: ReturnType<typeof useTranslations>;
}

function ProduceCard({ produce, onToggleFavorite, onDelete, onAddToList, onClick, isDeleting, t }: ProduceCardProps) {
  return (
    <Card className="group hover:shadow-md transition-all cursor-pointer" onClick={onClick}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-medium">{produce.name}</h4>
            {produce.name_local && (
              <p className="text-xs text-muted-foreground">{produce.name_local}</p>
            )}
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(produce)}
              disabled={isDeleting}
              title={t("actions.unsave")}
            >
              <Bookmark className="h-4 w-4 fill-primary text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleFavorite(produce)}
              title={produce.is_favorite ? t("actions.removeFromFavorites") : t("actions.addToFavorites")}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  produce.is_favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                )}
              />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddToList}>
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="outline" className="text-xs">
            {t(`categories.${produce.category}`)}
          </Badge>
          {produce.is_peak_season && (
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 text-xs">
              {t("badges.peak")}
            </Badge>
          )}
          {produce.is_in_season && !produce.is_peak_season && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
              {t("badges.inSeason")}
            </Badge>
          )}
        </div>

        {produce.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {produce.description}
          </p>
        )}

        {produce.storage_tips && (
          <p className="text-xs text-muted-foreground border-t pt-2">
            <Info className="h-3 w-3 inline mr-1" />
            {produce.storage_tips}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface SpecialtyCardProps {
  specialty: {
    id: string;
    name: string;
    name_local: string | null;
    description: string | null;
    specialty_type: string;
    cultural_info: string | null;
    how_to_use: string | null;
    related_dishes: string[] | null;
    is_featured: boolean;
  };
  t: ReturnType<typeof useTranslations>;
}

function SpecialtyCard({ specialty, t }: SpecialtyCardProps) {
  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-medium">{specialty.name}</h4>
            {specialty.name_local && (
              <p className="text-xs text-muted-foreground">{specialty.name_local}</p>
            )}
          </div>
          {specialty.is_featured && (
            <Badge variant="secondary">
              <Star className="h-3 w-3 mr-1" />
              {t("badges.featured")}
            </Badge>
          )}
        </div>

        <Badge variant="outline" className="mb-3 text-xs">
          {t(`specialtyTypes.${specialty.specialty_type}`)}
        </Badge>

        {specialty.description && (
          <p className="text-sm text-muted-foreground mb-3">{specialty.description}</p>
        )}

        {specialty.cultural_info && (
          <div className="text-sm mb-3">
            <p className="font-medium text-xs text-muted-foreground mb-1">
              {t("specialties.culturalInfo")}:
            </p>
            <p className="text-sm">{specialty.cultural_info}</p>
          </div>
        )}

        {specialty.how_to_use && (
          <div className="text-sm mb-3">
            <p className="font-medium text-xs text-muted-foreground mb-1">
              {t("specialties.howToUse")}:
            </p>
            <p className="text-sm">{specialty.how_to_use}</p>
          </div>
        )}

        {specialty.related_dishes && specialty.related_dishes.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {t("specialties.relatedDishes")}:
            </p>
            <div className="flex flex-wrap gap-1">
              {specialty.related_dishes.map((dish, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {dish}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SeasonalProduceByMonthProps {
  countryCode: string;
  month: number;
  t: ReturnType<typeof useTranslations>;
}

function SeasonalProduceByMonth({ countryCode, month, t }: SeasonalProduceByMonthProps) {
  const { data, isLoading } = useGetSeasonalProduceQuery({
    country_code: countryCode,
    month: month,
    in_season_only: true,
    per_page: 50,
  });

  if (isLoading) {
    return (
      <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <p className="text-muted-foreground text-center py-4">
        {t("calendar.noDataForMonth")}
      </p>
    );
  }

  // Group by category
  const byCategory = data.items.reduce((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, SeasonalProduce[]>);

  return (
    <div className="space-y-4">
      {Object.entries(byCategory).map(([category, items]) => (
        <div key={category}>
          <h4 className="font-medium mb-2 capitalize">{t(`categories.${category}`)}</h4>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <Badge
                key={item.id}
                variant={item.is_peak_season ? "default" : "secondary"}
                className="text-sm"
              >
                {item.name}
                {item.is_peak_season && " ⭐"}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
