"use client";

import { ReactNode } from "react";
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

// Filter option type
export interface FilterOption {
  value: string;
  label: string;
}

// Select filter definition
export interface SelectFilter {
  type: "select";
  key: string;
  placeholder: string;
  options: FilterOption[];
  allLabel?: string;
  width?: string;
}

// Search filter definition
export interface SearchFilter {
  type: "search";
  key: string;
  placeholder: string;
}

// Date range filter definition
export interface DateRangeFilter {
  type: "dateRange";
  fromKey: string;
  toKey: string;
  label?: string;
  fromLabel?: string;
  toLabel?: string;
  clearLabel?: string;
  width?: string;
}

// Sort filter definition
export interface SortFilter {
  type: "sort";
  sortByKey: string;
  sortOrderKey: string;
  options: { value: string; label: string }[];
  width?: string;
}

export type FilterDefinition = SelectFilter | SearchFilter | DateRangeFilter | SortFilter;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface FilterBarProps<T extends Record<string, any>> {
  filters: T;
  onFiltersChange: (filters: T) => void;
  filterDefinitions: FilterDefinition[];
  defaultFilters?: Partial<T>;
  preserveKeys?: (keyof T)[];
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FilterBar<T extends Record<string, any>>({
  filters,
  onFiltersChange,
  filterDefinitions,
  defaultFilters = {},
  preserveKeys = [],
  className = "",
}: FilterBarProps<T>) {
  const hasActiveFilters = filterDefinitions.some((def) => {
    if (def.type === "search") {
      return !!filters[def.key];
    }
    if (def.type === "select") {
      return !!filters[def.key];
    }
    if (def.type === "dateRange") {
      return !!filters[def.fromKey] || !!filters[def.toKey];
    }
    return false;
  });

  const handleChange = (key: string, value: unknown) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
      page: 1,
    } as T);
  };

  const handleSortChange = (sortByKey: string, sortOrderKey: string, value: string) => {
    const [sortBy, sortOrder] = value.split("-");
    onFiltersChange({
      ...filters,
      [sortByKey]: sortBy,
      [sortOrderKey]: sortOrder,
      page: 1,
    } as T);
  };

  const handleDateRangeClear = (fromKey: string, toKey: string) => {
    onFiltersChange({
      ...filters,
      [fromKey]: undefined,
      [toKey]: undefined,
      page: 1,
    } as T);
  };

  const clearFilters = () => {
    const preserved: Partial<T> = {};
    preserveKeys.forEach((key) => {
      if (filters[key] !== undefined) {
        (preserved as Record<string, unknown>)[key as string] = filters[key];
      }
    });

    onFiltersChange({
      ...defaultFilters,
      ...preserved,
      page: 1,
    } as unknown as T);
  };

  const formatDateLabel = (fromValue: unknown, toValue: unknown, defaultLabel: string) => {
    const from = fromValue as string | undefined;
    const to = toValue as string | undefined;

    if (from && to) {
      return `${from} - ${to}`;
    }
    if (from) {
      return `From ${from}`;
    }
    if (to) {
      return `Until ${to}`;
    }
    return defaultLabel;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-3">
        {filterDefinitions.map((def, index) => {
          if (def.type === "search") {
            return (
              <div key={index} className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={def.placeholder}
                  value={(filters[def.key] as string) || ""}
                  onChange={(e) => handleChange(def.key, e.target.value)}
                  className="pl-9"
                />
              </div>
            );
          }

          if (def.type === "select") {
            return (
              <Select
                key={index}
                value={(filters[def.key] as string) || "all"}
                onValueChange={(value) =>
                  handleChange(def.key, value === "all" ? undefined : value)
                }
              >
                <SelectTrigger className={`w-full ${def.width || "sm:w-[180px]"}`}>
                  <SelectValue placeholder={def.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{def.allLabel || "All"}</SelectItem>
                  {def.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }

          if (def.type === "dateRange") {
            const hasDateRange = !!filters[def.fromKey] || !!filters[def.toKey];
            return (
              <Popover key={index}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full ${def.width || "sm:w-[200px]"} justify-start text-left font-normal ${
                      hasDateRange ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {formatDateLabel(
                        filters[def.fromKey],
                        filters[def.toKey],
                        def.label || "Date Range"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`date-from-${index}`}>{def.fromLabel || "From"}</Label>
                      <Input
                        id={`date-from-${index}`}
                        type="date"
                        value={(filters[def.fromKey] as string) || ""}
                        onChange={(e) => handleChange(def.fromKey, e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`date-to-${index}`}>{def.toLabel || "To"}</Label>
                      <Input
                        id={`date-to-${index}`}
                        type="date"
                        value={(filters[def.toKey] as string) || ""}
                        onChange={(e) => handleChange(def.toKey, e.target.value)}
                      />
                    </div>
                    {hasDateRange && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDateRangeClear(def.fromKey, def.toKey)}
                      >
                        {def.clearLabel || "Clear dates"}
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            );
          }

          if (def.type === "sort") {
            const currentValue = `${filters[def.sortByKey] || "created_at"}-${
              filters[def.sortOrderKey] || "desc"
            }`;
            return (
              <Select
                key={index}
                value={currentValue}
                onValueChange={(value) =>
                  handleSortChange(def.sortByKey, def.sortOrderKey, value)
                }
              >
                <SelectTrigger className={`w-full ${def.width || "sm:w-[180px]"}`}>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {def.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }

          return null;
        })}

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
