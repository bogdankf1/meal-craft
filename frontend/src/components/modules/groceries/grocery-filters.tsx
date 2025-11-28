"use client";

import { Search, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GROCERY_CATEGORIES, type GroceryFilters } from "@/lib/api/groceries-api";

interface GroceryFiltersProps {
  filters: GroceryFilters;
  onFiltersChange: (filters: GroceryFilters) => void;
}

export function GroceryFiltersBar({
  filters,
  onFiltersChange,
}: GroceryFiltersProps) {
  const hasActiveFilters =
    filters.search ||
    filters.category ||
    filters.store ||
    filters.expiring_within_days ||
    filters.date_from ||
    filters.date_to;

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined, page: 1 });
  };

  const handleCategoryChange = (value: string) => {
    onFiltersChange({
      ...filters,
      category: value === "all" ? undefined : value,
      page: 1,
    });
  };

  const handleExpiringChange = (value: string) => {
    onFiltersChange({
      ...filters,
      expiring_within_days: value === "all" ? undefined : parseInt(value),
      page: 1,
    });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split("-");
    onFiltersChange({
      ...filters,
      sort_by: sortBy,
      sort_order: sortOrder as "asc" | "desc",
      page: 1,
    });
  };

  const handleDateFromChange = (value: string) => {
    onFiltersChange({
      ...filters,
      date_from: value || undefined,
      page: 1,
    });
  };

  const handleDateToChange = (value: string) => {
    onFiltersChange({
      ...filters,
      date_to: value || undefined,
      page: 1,
    });
  };

  const clearDateRange = () => {
    onFiltersChange({
      ...filters,
      date_from: undefined,
      date_to: undefined,
      page: 1,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      page: 1,
      per_page: filters.per_page,
      sort_by: "created_at",
      sort_order: "desc",
      is_archived: filters.is_archived,
    });
  };

  const hasDateRange = filters.date_from || filters.date_to;

  const formatDateLabel = () => {
    if (filters.date_from && filters.date_to) {
      return `${filters.date_from} - ${filters.date_to}`;
    }
    if (filters.date_from) {
      return `From ${filters.date_from}`;
    }
    if (filters.date_to) {
      return `Until ${filters.date_to}`;
    }
    return "Date Range";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groceries..."
            value={filters.search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <Select
          value={filters.category || "all"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {GROCERY_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Expiring Soon Filter */}
        <Select
          value={filters.expiring_within_days?.toString() || "all"}
          onValueChange={handleExpiringChange}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Expiry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="3">Expiring in 3 days</SelectItem>
            <SelectItem value="7">Expiring in 7 days</SelectItem>
            <SelectItem value="14">Expiring in 14 days</SelectItem>
            <SelectItem value="30">Expiring in 30 days</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`w-full sm:w-[200px] justify-start text-left font-normal ${
                hasDateRange ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Calendar className="mr-2 h-4 w-4" />
              <span className="truncate">{formatDateLabel()}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date-from">From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.date_from || ""}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to">To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.date_to || ""}
                  onChange={(e) => handleDateToChange(e.target.value)}
                />
              </div>
              {hasDateRange && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={clearDateRange}
                >
                  Clear dates
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <Select
          value={`${filters.sort_by || "created_at"}-${filters.sort_order || "desc"}`}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at-desc">Newest First</SelectItem>
            <SelectItem value="created_at-asc">Oldest First</SelectItem>
            <SelectItem value="item_name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="item_name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="purchase_date-desc">Purchase (Newest)</SelectItem>
            <SelectItem value="purchase_date-asc">Purchase (Oldest)</SelectItem>
            <SelectItem value="expiry_date-asc">Expiry (Soonest)</SelectItem>
            <SelectItem value="cost-desc">Cost (High to Low)</SelectItem>
            <SelectItem value="cost-asc">Cost (Low to High)</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
