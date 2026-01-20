"use client";

import { Columns, Lock, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useUserStore, defaultColumnVisibility, type ColumnVisibility } from "@/lib/store/user-store";
import { useUpdateUIPreferencesMutation } from "@/lib/api/preferences-api";

export interface ColumnConfig {
  key: string;
  label: string;
  mandatory?: boolean;
}

interface ColumnVisibilitySelectorProps<T extends keyof ColumnVisibility> {
  module: T;
  columns: ColumnConfig[];
}

export function ColumnVisibilitySelector<T extends keyof ColumnVisibility>({
  module,
  columns,
}: ColumnVisibilitySelectorProps<T>) {
  const t = useTranslations();
  const { preferences, setColumnVisibility } = useUserStore();
  const [updatePreferences] = useUpdateUIPreferencesMutation();

  const columnVisibility = preferences.columnVisibility?.[module] ?? defaultColumnVisibility[module];

  const handleToggleColumn = async (columnKey: string, checked: boolean) => {
    const newVisibility = { [columnKey]: checked } as Partial<ColumnVisibility[T]>;

    // Update local state
    setColumnVisibility(module, newVisibility);

    // Sync with backend
    try {
      await updatePreferences({
        columnVisibility: {
          [module]: {
            ...columnVisibility,
            ...newVisibility,
          },
        },
      }).unwrap();
    } catch {
      // Revert on error
      setColumnVisibility(module, { [columnKey]: !checked } as Partial<ColumnVisibility[T]>);
    }
  };

  const handleResetToDefault = async () => {
    // Create default visibility object with all columns visible
    const defaultVisibility = columns.reduce((acc, col) => {
      acc[col.key] = true;
      return acc;
    }, {} as Record<string, boolean>);

    // Update local state
    setColumnVisibility(module, defaultVisibility as unknown as Partial<ColumnVisibility[T]>);

    // Sync with backend
    try {
      await updatePreferences({
        columnVisibility: {
          [module]: defaultVisibility as unknown as ColumnVisibility[T],
        },
      }).unwrap();
    } catch {
      // Error will be handled by RTK Query
    }
  };

  // Check if any column is hidden (for showing reset button)
  const hasHiddenColumns = columns.some(
    (col) => !col.mandatory && !(columnVisibility as unknown as Record<string, boolean>)[col.key]
  );

  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Columns className="h-4 w-4 mr-2" />
          {t("columns")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="space-y-1">
          {columns.map((column) => {
            const isVisible = (columnVisibility as unknown as Record<string, boolean>)[column.key] ?? true;
            const isMandatory = column.mandatory ?? false;

            return (
              <div
                key={column.key}
                className="flex items-center justify-between px-2 py-1.5 rounded-sm hover:bg-muted"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`column-${column.key}`}
                    checked={isVisible}
                    onCheckedChange={(checked) => {
                      handleToggleColumn(column.key, checked === true);
                    }}
                    disabled={isMandatory}
                  />
                  <label
                    htmlFor={`column-${column.key}`}
                    className={`text-sm cursor-pointer ${
                      isMandatory ? "text-muted-foreground" : ""
                    }`}
                  >
                    {column.label}
                  </label>
                </div>
                {isMandatory && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>

        {hasHiddenColumns && (
          <>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm"
              onClick={handleResetToDefault}
            >
              <RotateCcw className="h-3 w-3 mr-2" />
              {t("resetToDefault")}
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
