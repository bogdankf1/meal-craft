"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterDefinition } from "@/components/shared/FilterBar";
import { GROCERY_CATEGORIES, type GroceryFilters } from "@/lib/api/groceries-api";

interface GroceryFiltersProps {
  filters: GroceryFilters;
  onFiltersChange: (filters: GroceryFilters) => void;
}

// Default filter values
const defaultFilters: Partial<GroceryFilters> = {
  sort_by: "created_at",
  sort_order: "desc",
};

// Keys to preserve when clearing filters
const preserveKeys: (keyof GroceryFilters)[] = ["per_page", "is_archived"];

export function GroceryFiltersBar({
  filters,
  onFiltersChange,
}: GroceryFiltersProps) {
  const t = useTranslations("groceries");

  // Convert grocery categories to filter options with translations
  const categoryOptions = GROCERY_CATEGORIES.map((cat) => ({
    value: cat.value,
    label: t(`categories.${cat.value}`),
  }));

  // Define filter configuration with translations
  const filterDefinitions: FilterDefinition[] = [
    {
      type: "search",
      key: "search",
      placeholder: t("filters.search"),
    },
    {
      type: "select",
      key: "category",
      placeholder: t("filters.category"),
      options: categoryOptions,
      allLabel: t("filters.allCategories"),
    },
    {
      type: "select",
      key: "expiring_within_days",
      placeholder: t("filters.expiry"),
      options: [
        { value: "3", label: t("filters.expiringIn3Days") },
        { value: "7", label: t("filters.expiringIn7Days") },
        { value: "14", label: t("filters.expiringIn14Days") },
        { value: "30", label: t("filters.expiringIn30Days") },
      ],
      allLabel: t("filters.allItems"),
    },
    {
      type: "dateRange",
      fromKey: "date_from",
      toKey: "date_to",
      label: t("filters.dateRange"),
      fromLabel: t("filters.from"),
      toLabel: t("filters.to"),
      clearLabel: t("filters.clearDates"),
    },
    {
      type: "sort",
      sortByKey: "sort_by",
      sortOrderKey: "sort_order",
      options: [
        { value: "created_at-desc", label: t("filters.newestFirst") },
        { value: "created_at-asc", label: t("filters.oldestFirst") },
        { value: "item_name-asc", label: t("filters.nameAZ") },
        { value: "item_name-desc", label: t("filters.nameZA") },
        { value: "purchase_date-desc", label: t("filters.purchaseNewest") },
        { value: "purchase_date-asc", label: t("filters.purchaseOldest") },
        { value: "expiry_date-asc", label: t("filters.expirySoonest") },
        { value: "cost-desc", label: t("filters.costHighToLow") },
        { value: "cost-asc", label: t("filters.costLowToHigh") },
      ],
    },
  ];

  return (
    <FilterBar<GroceryFilters>
      filters={filters}
      onFiltersChange={onFiltersChange}
      filterDefinitions={filterDefinitions}
      defaultFilters={defaultFilters}
      preserveKeys={preserveKeys}
    />
  );
}
