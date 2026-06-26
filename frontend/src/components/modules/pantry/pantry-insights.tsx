"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Leaf,
  Sun,
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useGetSeasonalProduceQuery,
  useGetUserSeasonalPreferencesQuery,
} from "@/lib/api/seasonality-api";
import type { PantryItem, PantryAnalytics } from "@/lib/api/pantry-api";

interface PantryInsightsProps {
  pantryItems: PantryItem[];
  analytics: PantryAnalytics | undefined;
  onAddToShoppingList?: (itemName: string, quantity?: number, unit?: string) => void;
  onNavigateToSeasonality?: () => void;
}

// Normalize text for matching
function normalizeText(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

// Get significant words (skip common words)
const STOP_WORDS = new Set([
  "fresh", "dried", "ground", "chopped", "minced", "sliced", "diced",
  "whole", "large", "small", "medium", "extra", "virgin", "organic",
  "raw", "cooked", "frozen", "canned", "ripe", "unripe",
]);

function getSignificantWords(name: string): string[] {
  const normalized = normalizeText(name);
  return normalized
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

// Check if names match
function namesMatch(name1: string, name2: string): boolean {
  const normalized1 = normalizeText(name1);
  const normalized2 = normalizeText(name2);

  // Exact match
  if (normalized1 === normalized2) return true;

  const words1 = getSignificantWords(name1);
  const words2 = getSignificantWords(name2);

  if (words1.length === 0 || words2.length === 0) return false;

  // Check if all significant words from one appear in the other
  const allWords1InWords2 = words1.every((w1) =>
    words2.some(
      (w2) =>
        w2 === w1 ||
        w2 === w1 + "s" ||
        w2 === w1 + "es" ||
        w1 === w2 + "s" ||
        w1 === w2 + "es"
    )
  );

  const allWords2InWords1 = words2.every((w2) =>
    words1.some(
      (w1) =>
        w1 === w2 ||
        w1 === w2 + "s" ||
        w1 === w2 + "es" ||
        w2 === w1 + "s" ||
        w2 === w1 + "es"
    )
  );

  return allWords1InWords2 || allWords2InWords1;
}

export function PantryInsights({
  pantryItems,
  analytics,
  onAddToShoppingList,
  onNavigateToSeasonality,
}: PantryInsightsProps) {
  const t = useTranslations("pantry.insights");

  // Get user's seasonal preferences for country code
  const { data: preferences } = useGetUserSeasonalPreferencesQuery();
  const countryCode = preferences?.country_code || "US";

  // Get seasonal produce for current month
  const currentMonth = new Date().getMonth() + 1;
  const { data: seasonalData } = useGetSeasonalProduceQuery({
    country_code: countryCode,
    month: currentMonth,
    peak_only: true,
    per_page: 100,
  });

  // Find pantry items that are in peak season
  const inSeasonItems = useMemo(() => {
    if (!seasonalData?.items || !pantryItems.length) return [];

    const matches: Array<{
      pantryItem: PantryItem;
      produceName: string;
      category: string;
    }> = [];

    for (const pantryItem of pantryItems) {
      for (const produce of seasonalData.items) {
        if (produce.is_peak_season && namesMatch(pantryItem.item_name, produce.name)) {
          matches.push({
            pantryItem,
            produceName: produce.name,
            category: produce.category,
          });
          break;
        }
      }
    }

    return matches.slice(0, 5); // Show max 5
  }, [pantryItems, seasonalData]);

  // Get low stock items from analytics
  const lowStockItems = useMemo(() => {
    if (!analytics?.low_stock_list) return [];
    return analytics.low_stock_list.slice(0, 5);
  }, [analytics]);

  // Don't render if no insights to show
  if (inSeasonItems.length === 0 && lowStockItems.length === 0) {
    return null;
  }

  // Use full width if only one card, otherwise 50/50
  const hasBothCards = inSeasonItems.length > 0 && lowStockItems.length > 0;

  return (
    <div className={hasBothCards ? "grid gap-4 md:grid-cols-2" : "grid gap-4"}>
      {/* In Season Items */}
      {inSeasonItems.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
                <Sun className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  {t("inSeason.title")}
                </h3>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {t("inSeason.subtitle")}
                </p>
              </div>
            </div>
            {onNavigateToSeasonality && (
              <Button
                variant="ghost"
                size="sm"
                className="text-green-700 hover:text-green-800 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/50"
                onClick={onNavigateToSeasonality}
              >
                <Leaf className="h-4 w-4 mr-1" />
                {t("inSeason.viewAll")}
              </Button>
            )}
          </div>
          <ul className="space-y-2">
            {inSeasonItems.map(({ pantryItem, produceName, category }) => (
              <li
                key={pantryItem.id}
                className="flex items-center justify-between p-2 rounded-md bg-white/60 dark:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    {pantryItem.item_name}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs"
                >
                  {t("inSeason.peakSeason")}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <Leaf className="h-3 w-3" />
            {t("inSeason.tip")}
          </p>
        </div>
      )}

      {/* Low Stock Items */}
      {lowStockItems.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                  {t("lowStock.title")}
                </h3>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t("lowStock.subtitle")}
                </p>
              </div>
            </div>
          </div>
          <ul className="space-y-2">
            {lowStockItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between p-2 rounded-md bg-white/60 dark:bg-white/5"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {item.item_name}
                  </span>
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    {item.quantity} {item.unit}
                    {item.minimum_quantity && (
                      <span className="ml-1">
                        ({t("lowStock.minQuantity")}: {item.minimum_quantity})
                      </span>
                    )}
                  </span>
                </div>
                {onAddToShoppingList && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50"
                    onClick={() =>
                      onAddToShoppingList(
                        item.item_name,
                        item.minimum_quantity
                          ? item.minimum_quantity - (item.quantity || 0)
                          : undefined,
                        item.unit || undefined
                      )
                    }
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    {t("lowStock.addToList")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <ShoppingCart className="h-3 w-3" />
            {t("lowStock.tip")}
          </p>
        </div>
      )}
    </div>
  );
}
