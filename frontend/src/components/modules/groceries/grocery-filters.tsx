"use client";

import { FilterBar, FilterDefinition } from "@/components/shared/FilterBar";
import { GROCERY_CATEGORIES, type GroceryFilters } from "@/lib/api/groceries-api";

interface GroceryFiltersProps {
  filters: GroceryFilters;
  onFiltersChange: (filters: GroceryFilters) => void;
}

// Convert grocery categories to filter options
const categoryOptions = GROCERY_CATEGORIES.map((cat) => ({
  value: cat.value,
  label: cat.label,
}));

// Define filter configuration
const filterDefinitions: FilterDefinition[] = [
  {
    type: "search",
    key: "search",
    placeholder: "Search groceries...",
  },
  {
    type: "select",
    key: "category",
    placeholder: "Category",
    options: categoryOptions,
    allLabel: "All Categories",
  },
  {
    type: "select",
    key: "expiring_within_days",
    placeholder: "Expiry",
    options: [
      { value: "3", label: "Expiring in 3 days" },
      { value: "7", label: "Expiring in 7 days" },
      { value: "14", label: "Expiring in 14 days" },
      { value: "30", label: "Expiring in 30 days" },
    ],
    allLabel: "All Items",
  },
  {
    type: "dateRange",
    fromKey: "date_from",
    toKey: "date_to",
    label: "Date Range",
    fromLabel: "From",
    toLabel: "To",
    clearLabel: "Clear dates",
  },
  {
    type: "sort",
    sortByKey: "sort_by",
    sortOrderKey: "sort_order",
    options: [
      { value: "created_at-desc", label: "Newest First" },
      { value: "created_at-asc", label: "Oldest First" },
      { value: "item_name-asc", label: "Name (A-Z)" },
      { value: "item_name-desc", label: "Name (Z-A)" },
      { value: "purchase_date-desc", label: "Purchase (Newest)" },
      { value: "purchase_date-asc", label: "Purchase (Oldest)" },
      { value: "expiry_date-asc", label: "Expiry (Soonest)" },
      { value: "cost-desc", label: "Cost (High to Low)" },
      { value: "cost-asc", label: "Cost (Low to High)" },
    ],
  },
];

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
