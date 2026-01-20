"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterDefinition, FilterBarVisibility } from "@/components/shared/FilterBar";
import {
  MEAL_TYPES,
  ORDER_TYPES,
  type RestaurantMealFilters,
} from "@/lib/api/restaurants-api";

interface RestaurantMealFiltersBarProps {
  filters: RestaurantMealFilters;
  onFiltersChange: (filters: RestaurantMealFilters) => void;
  visibility?: FilterBarVisibility;
}

// Default filter values
const defaultFilters: Partial<RestaurantMealFilters> = {
  sort_by: "meal_date",
  sort_order: "desc",
};

// Keys to preserve when clearing filters
const preserveKeys: (keyof RestaurantMealFilters)[] = ["per_page", "is_archived"];

export function RestaurantMealFiltersBar({
  filters,
  onFiltersChange,
  visibility,
}: RestaurantMealFiltersBarProps) {
  const t = useTranslations("restaurants");

  // Convert meal types to filter options with translations
  const mealTypeOptions = MEAL_TYPES.map((type) => ({
    value: type.value,
    label: t(`mealTypes.${type.value}`),
  }));

  // Convert order types to filter options with translations
  const orderTypeOptions = ORDER_TYPES.map((type) => ({
    value: type.value,
    label: t(`orderTypes.${type.value}`),
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
      key: "meal_type",
      placeholder: t("filters.mealType"),
      options: mealTypeOptions,
      allLabel: t("filters.allMealTypes"),
    },
    {
      type: "select",
      key: "order_type",
      placeholder: t("filters.orderType"),
      options: orderTypeOptions,
      allLabel: t("filters.allOrderTypes"),
    },
    {
      type: "dateRange",
      fromKey: "date_from",
      toKey: "date_to",
      label: t("filters.dateRange"),
      fromLabel: t("filters.dateFrom"),
      toLabel: t("filters.dateTo"),
      clearLabel: t("filters.clearDates"),
    },
  ];

  return (
    <FilterBar<RestaurantMealFilters>
      filters={filters}
      onFiltersChange={onFiltersChange}
      filterDefinitions={filterDefinitions}
      defaultFilters={defaultFilters}
      preserveKeys={preserveKeys}
      visibility={visibility}
    />
  );
}
