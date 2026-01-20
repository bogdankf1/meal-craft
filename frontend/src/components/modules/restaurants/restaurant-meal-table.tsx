"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Archive,
  ArchiveRestore,
  Star,
  Heart,
  UtensilsCrossed,
  Truck,
} from "lucide-react";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTablePagination, ColumnVisibilitySelector, type ColumnConfig } from "@/components/shared";
import {
  useDeleteRestaurantMealMutation,
  useBulkArchiveRestaurantMealsMutation,
  useBulkUnarchiveRestaurantMealsMutation,
  useBulkDeleteRestaurantMealsMutation,
  type RestaurantMeal,
  type RestaurantMealListResponse,
} from "@/lib/api/restaurants-api";
import { cn } from "@/lib/utils";
import { useUserStore, defaultColumnVisibility } from "@/lib/store/user-store";

interface RestaurantMealTableProps {
  data?: RestaurantMealListResponse;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (meal: RestaurantMeal) => void;
  isArchiveView?: boolean;
  cardView?: boolean;
}

export function RestaurantMealTable({
  data,
  isLoading,
  page,
  onPageChange,
  onEdit,
  isArchiveView = false,
  cardView = false,
}: RestaurantMealTableProps) {
  const t = useTranslations("restaurants");
  const tCommon = useTranslations("common");

  const { preferences } = useUserStore();
  const columnVisibility = preferences.columnVisibility?.restaurantMeals ?? defaultColumnVisibility.restaurantMeals;
  const showColumnSelector = preferences.uiVisibility?.showColumnSelector ?? true;

  // Column configuration for visibility selector
  const columnConfig: ColumnConfig[] = [
    { key: "restaurant", label: t("table.restaurant"), mandatory: true },
    { key: "date", label: t("table.date") },
    { key: "meal_type", label: t("table.mealType") },
    { key: "order_type", label: t("table.orderType") },
    { key: "items", label: t("table.items") },
    { key: "rating", label: t("table.rating") },
    { key: "feeling", label: t("table.feeling") },
  ];

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [deleteMeal] = useDeleteRestaurantMealMutation();
  const [bulkArchive] = useBulkArchiveRestaurantMealsMutation();
  const [bulkUnarchive] = useBulkUnarchiveRestaurantMealsMutation();
  const [bulkDelete] = useBulkDeleteRestaurantMealsMutation();

  const meals = data?.items || [];
  const hasSelected = selectedIds.length > 0;
  const allSelected = meals.length > 0 && selectedIds.length === meals.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(meals.map((m) => m.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMeal(id).unwrap();
      toast.success(t("messages.mealDeleted"));
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } catch (error) {
      toast.error(t("messages.errorDeleting"));
    }
  };

  const handleBulkArchive = async () => {
    try {
      await bulkArchive(selectedIds).unwrap();
      toast.success(t("messages.mealsArchived", { count: selectedIds.length }));
      setSelectedIds([]);
    } catch (error) {
      toast.error(t("messages.errorArchiving"));
    }
  };

  const handleBulkUnarchive = async () => {
    try {
      await bulkUnarchive(selectedIds).unwrap();
      toast.success(t("messages.mealsUnarchived", { count: selectedIds.length }));
      setSelectedIds([]);
    } catch (error) {
      toast.error(t("messages.errorUnarchiving"));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDelete(selectedIds).unwrap();
      toast.success(t("messages.mealsDeleted", { count: selectedIds.length }));
      setSelectedIds([]);
    } catch (error) {
      toast.error(t("messages.errorDeleting"));
    }
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case "delivery":
        return <Truck className="h-3 w-3" />;
      case "takeout":
        return <UtensilsCrossed className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const renderRating = (value: number | null, icon: "star" | "heart") => {
    if (!value) return "-";
    const Icon = icon === "star" ? Star : Heart;
    return (
      <div className="flex items-center gap-1">
        <Icon className={cn(
          "h-4 w-4",
          icon === "star" ? "text-yellow-500 fill-yellow-500" : "text-red-500 fill-red-500"
        )} />
        <span>{value}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{tCommon("loading")}</div>
      </div>
    );
  }

  if (cardView) {
    return (
      <div className="space-y-4">
        {hasSelected && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <span className="text-sm">{t("table.selected", { count: selectedIds.length })}</span>
            <div className="flex-1" />
            {isArchiveView ? (
              <Button size="sm" variant="outline" onClick={handleBulkUnarchive}>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                {t("actions.unarchive")}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleBulkArchive}>
                <Archive className="h-4 w-4 mr-2" />
                {t("actions.archive")}
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t("actions.delete")}
            </Button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meals.map((meal) => (
            <Card
              key={meal.id}
              className={cn(
                "cursor-pointer hover:border-primary/50 transition-colors",
                selectedIds.includes(meal.id) && "border-primary"
              )}
              onClick={() => onEdit(meal)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{meal.restaurant_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(meal.meal_date), "MMM d, yyyy")}
                      {meal.meal_time && ` at ${meal.meal_time}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.includes(meal.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOne(meal.id);
                      }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {t(`mealTypes.${meal.meal_type}`)}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getOrderTypeIcon(meal.order_type)}
                    {t(`orderTypes.${meal.order_type}`)}
                  </Badge>
                </div>
                {meal.items_ordered && meal.items_ordered.length > 0 && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {meal.items_ordered.join(", ")}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-4">
                  {renderRating(meal.rating, "star")}
                  {renderRating(meal.feeling_after, "heart")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {data && data.total_pages > 1 && (
          <DataTablePagination
            page={page}
            totalPages={data.total_pages}
            total={data.total}
            perPage={data.per_page}
            onPageChange={onPageChange}
          />
        )}
      </div>
    );
  }

  // Count visible columns for colSpan
  const visibleColumnCount = Object.values(columnVisibility).filter(Boolean).length + 2; // +2 for checkbox and actions

  return (
    <div className="space-y-4">
      {/* Column visibility selector */}
      {showColumnSelector && (
        <div className="flex justify-end">
          <ColumnVisibilitySelector module="restaurantMeals" columns={columnConfig} />
        </div>
      )}

      {/* Selection bar - always visible */}
      <div className="flex items-center gap-2 px-3 h-12 bg-muted/50 rounded-lg">
        {hasSelected ? (
          <>
            <span className="text-sm font-medium">{t("table.selected", { count: selectedIds.length })}</span>
            <div className="flex-1" />
            {isArchiveView ? (
              <Button size="sm" variant="outline" onClick={handleBulkUnarchive}>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                {t("actions.unarchive")}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleBulkArchive}>
                <Archive className="h-4 w-4 mr-2" />
                {t("actions.archive")}
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t("actions.delete")}
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">
              {t("table.itemsOnPage", { count: meals.length })}
            </span>
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground">
              {t("table.selectToAction")}
            </span>
          </>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              {columnVisibility.restaurant && <TableHead>{t("table.restaurant")}</TableHead>}
              {columnVisibility.date && <TableHead>{t("table.date")}</TableHead>}
              {columnVisibility.meal_type && <TableHead>{t("table.mealType")}</TableHead>}
              {columnVisibility.order_type && <TableHead>{t("table.orderType")}</TableHead>}
              {columnVisibility.items && <TableHead>{t("table.items")}</TableHead>}
              {columnVisibility.rating && <TableHead>{t("table.rating")}</TableHead>}
              {columnVisibility.feeling && <TableHead>{t("table.feeling")}</TableHead>}
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="text-center py-8 text-muted-foreground">
                  {t("table.noMeals")}
                </TableCell>
              </TableRow>
            ) : (
              meals.map((meal) => (
                <TableRow
                  key={meal.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    selectedIds.includes(meal.id) && "bg-muted/50"
                  )}
                  onClick={() => onEdit(meal)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(meal.id)}
                      onCheckedChange={() => toggleOne(meal.id)}
                    />
                  </TableCell>
                  {columnVisibility.restaurant && (
                    <TableCell className="font-medium">{meal.restaurant_name}</TableCell>
                  )}
                  {columnVisibility.date && (
                    <TableCell>
                      {format(parseISO(meal.meal_date), "MMM d, yyyy")}
                      {meal.meal_time && (
                        <span className="text-muted-foreground text-xs block">
                          {meal.meal_time}
                        </span>
                      )}
                    </TableCell>
                  )}
                  {columnVisibility.meal_type && (
                    <TableCell>
                      <Badge variant="secondary">
                        {t(`mealTypes.${meal.meal_type}`)}
                      </Badge>
                    </TableCell>
                  )}
                  {columnVisibility.order_type && (
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getOrderTypeIcon(meal.order_type)}
                        {t(`orderTypes.${meal.order_type}`)}
                      </Badge>
                    </TableCell>
                  )}
                  {columnVisibility.items && (
                    <TableCell className="max-w-[200px]">
                      {meal.items_ordered && meal.items_ordered.length > 0 ? (
                        <span className="truncate block">
                          {meal.items_ordered.join(", ")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  {columnVisibility.rating && (
                    <TableCell>{renderRating(meal.rating, "star")}</TableCell>
                  )}
                  {columnVisibility.feeling && (
                    <TableCell>{renderRating(meal.feeling_after, "heart")}</TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(meal)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t("actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {isArchiveView ? (
                          <DropdownMenuItem onClick={() => bulkUnarchive([meal.id])}>
                            <ArchiveRestore className="h-4 w-4 mr-2" />
                            {t("actions.unarchive")}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => bulkArchive([meal.id])}>
                            <Archive className="h-4 w-4 mr-2" />
                            {t("actions.archive")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(meal.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("actions.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.total_pages > 1 && (
        <DataTablePagination
          page={page}
          totalPages={data.total_pages}
          total={data.total}
          perPage={data.per_page}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
