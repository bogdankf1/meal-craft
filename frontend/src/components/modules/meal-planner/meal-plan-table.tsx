"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Archive,
  ArchiveRestore,
  Copy,
  ShoppingCart,
  Calendar,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { type MealPlanListItem } from "@/lib/api/meal-planner-api";
import { ColumnVisibilitySelector, type ColumnConfig } from "@/components/shared";
import { useUserStore, defaultColumnVisibility } from "@/lib/store/user-store";

interface MealPlanTableProps {
  items: MealPlanListItem[];
  isLoading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit?: (item: MealPlanListItem) => void;
  onDelete?: (item: MealPlanListItem) => void;
  onArchive?: (item: MealPlanListItem) => void;
  onUnarchive?: (item: MealPlanListItem) => void;
  onRepeat?: (item: MealPlanListItem) => void;
  onGenerateShoppingList?: (item: MealPlanListItem) => void;
  onView?: (item: MealPlanListItem) => void;
  onBulkAction?: (action: string, ids: string[]) => void;
  showArchived?: boolean;
}

export function MealPlanTable({
  items,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  onRepeat,
  onGenerateShoppingList,
  onView,
  onBulkAction,
  showArchived = false,
}: MealPlanTableProps) {
  const t = useTranslations("mealPlanner");
  const tCommon = useTranslations("common");

  const { preferences } = useUserStore();
  const columnVisibility = preferences.columnVisibility?.mealPlans ?? defaultColumnVisibility.mealPlans;
  const showColumnSelector = preferences.uiVisibility?.showColumnSelector ?? true;

  // Column configuration for visibility selector
  const columnConfig: ColumnConfig[] = [
    { key: "name", label: t("fields.name"), mandatory: true },
    { key: "date_range", label: t("fields.dateRange") },
    { key: "meals", label: t("fields.meals") },
    { key: "servings", label: t("fields.servings") },
    { key: "status", label: t("fields.status") },
  ];

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = (action: string) => {
    if (selectedIds.size > 0 && onBulkAction) {
      onBulkAction(action, Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Column visibility selector */}
      {showColumnSelector && (
        <div className="flex justify-end">
          <ColumnVisibilitySelector module="mealPlans" columns={columnConfig} />
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {tCommon("selectedCount", { count: selectedIds.size })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction(showArchived ? "unarchive" : "archive")}
          >
            {showArchived ? <ArchiveRestore className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
            {showArchived ? tCommon("unarchive") : tCommon("archive")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction("delete")}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {tCommon("delete")}
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.size === items.length && items.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            {columnVisibility.name && <TableHead>{t("fields.name")}</TableHead>}
            {columnVisibility.date_range && <TableHead>{t("fields.dateRange")}</TableHead>}
            {columnVisibility.meals && <TableHead className="text-center">{t("fields.meals")}</TableHead>}
            {columnVisibility.servings && <TableHead className="text-center">{t("fields.servings")}</TableHead>}
            {columnVisibility.status && <TableHead>{t("fields.status")}</TableHead>}
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onView?.(item)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={() => handleSelectItem(item.id)}
                />
              </TableCell>
              {columnVisibility.name && (
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {item.name}
                    {item.is_template && (
                      <Badge variant="secondary">{t("template")}</Badge>
                    )}
                  </div>
                </TableCell>
              )}
              {columnVisibility.date_range && (
                <TableCell>
                  <span className="text-muted-foreground">
                    {format(parseISO(item.date_start), "MMM d")} -{" "}
                    {format(parseISO(item.date_end), "MMM d, yyyy")}
                  </span>
                </TableCell>
              )}
              {columnVisibility.meals && (
                <TableCell className="text-center">
                  <Badge variant="outline">{item.meal_count}</Badge>
                </TableCell>
              )}
              {columnVisibility.servings && (
                <TableCell className="text-center">{item.servings}</TableCell>
              )}
              {columnVisibility.status && (
                <TableCell>
                  {item.is_archived ? (
                    <Badge variant="secondary">{tCommon("archived")}</Badge>
                  ) : (
                    <Badge variant="default">{tCommon("active")}</Badge>
                  )}
                </TableCell>
              )}
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView?.(item)}>
                      <Calendar className="h-4 w-4 mr-2" />
                      {t("actions.view")}
                    </DropdownMenuItem>
                    {!showArchived && (
                      <>
                        <DropdownMenuItem onClick={() => onEdit?.(item)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {tCommon("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRepeat?.(item)}>
                          <Copy className="h-4 w-4 mr-2" />
                          {t("actions.repeat")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onGenerateShoppingList?.(item)}>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {t("actions.generateShoppingList")}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    {showArchived ? (
                      <DropdownMenuItem onClick={() => onUnarchive?.(item)}>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        {tCommon("unarchive")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => onArchive?.(item)}>
                        <Archive className="h-4 w-4 mr-2" />
                        {tCommon("archive")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onDelete?.(item)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {tCommon("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, page - 1))}
                className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => onPageChange(pageNum)}
                    isActive={page === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
