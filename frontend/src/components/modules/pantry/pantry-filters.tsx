"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterDefinition, FilterBarVisibility } from "@/components/shared/FilterBar";
import {
  PANTRY_CATEGORIES,
  STORAGE_LOCATIONS,
  type PantryFilters,
} from "@/lib/api/pantry-api";

interface PantryFiltersProps {
  filters: PantryFilters;
  onFiltersChange: (filters: PantryFilters) => void;
  visibility?: FilterBarVisibility;
}

// Default filter values
const defaultFilters: Partial<PantryFilters> = {
  sort_by: "created_at",
  sort_order: "desc",
};

// Keys to preserve when clearing filters
const preserveKeys: (keyof PantryFilters)[] = ["per_page", "is_archived"];

export function PantryFiltersBar({
  filters,
  onFiltersChange,
  visibility,
}: PantryFiltersProps) {
  const t = useTranslations("pantry");

  // Convert pantry categories to filter options with translations
  const categoryOptions = PANTRY_CATEGORIES.map((cat) => ({
    value: cat.value,
    label: t(`categories.${cat.value}`),
  }));

  // Convert storage locations to filter options with translations
  const locationOptions = STORAGE_LOCATIONS.map((loc) => ({
    value: loc.value,
    label: t(`storageLocations.${loc.value}`),
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
      key: "storage_location",
      placeholder: t("filters.storageLocation"),
      options: locationOptions,
      allLabel: t("filters.allLocations"),
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
      type: "select",
      key: "low_stock",
      placeholder: t("filters.stock"),
      options: [
        { value: "true", label: t("filters.lowStockOnly") },
      ],
      allLabel: t("filters.allStock"),
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
        { value: "expiry_date-asc", label: t("filters.expirySoonest") },
        { value: "storage_location-asc", label: t("filters.byLocation") },
        { value: "quantity-asc", label: t("filters.quantityLowToHigh") },
        { value: "quantity-desc", label: t("filters.quantityHighToLow") },
      ],
    },
  ];

  return (
    <FilterBar<PantryFilters>
      filters={filters}
      onFiltersChange={onFiltersChange}
      filterDefinitions={filterDefinitions}
      defaultFilters={defaultFilters}
      preserveKeys={preserveKeys}
      visibility={visibility}
    />
  );
}
