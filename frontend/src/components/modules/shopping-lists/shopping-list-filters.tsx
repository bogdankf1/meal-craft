"use client";

import { useTranslations } from "next-intl";
import { FilterBar, FilterDefinition, type FilterBarVisibility } from "@/components/shared/FilterBar";
import { type ShoppingListFilters } from "@/lib/api/shopping-lists-api";

interface ShoppingListFiltersProps {
  filters: ShoppingListFilters;
  onFiltersChange: (filters: ShoppingListFilters) => void;
  visibility?: FilterBarVisibility;
}

const defaultFilters: Partial<ShoppingListFilters> = {
  sort_by: "created_at",
  sort_order: "desc",
};

const preserveKeys: (keyof ShoppingListFilters)[] = ["per_page", "is_archived"];

export function ShoppingListFiltersBar({
  filters,
  onFiltersChange,
  visibility,
}: ShoppingListFiltersProps) {
  const t = useTranslations("shoppingLists");

  const filterDefinitions: FilterDefinition[] = [
    {
      type: "search",
      key: "search",
      placeholder: t("filters.search"),
    },
    {
      type: "select",
      key: "status",
      placeholder: t("filters.status"),
      options: [
        { value: "active", label: t("status.active") },
        { value: "completed", label: t("status.completed") },
      ],
      allLabel: t("filters.allStatuses"),
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
        { value: "name-asc", label: t("filters.nameAZ") },
        { value: "name-desc", label: t("filters.nameZA") },
        { value: "updated_at-desc", label: t("filters.recentlyUpdated") },
      ],
    },
  ];

  return (
    <FilterBar<ShoppingListFilters>
      filters={filters}
      onFiltersChange={onFiltersChange}
      filterDefinitions={filterDefinitions}
      defaultFilters={defaultFilters}
      preserveKeys={preserveKeys}
      visibility={visibility}
    />
  );
}
