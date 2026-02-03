"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  Heart,
  Clock,
  Users,
  ChefHat,
  UtensilsCrossed,
  Star,
  ShoppingCart,
  CalendarCheck,
  Copy,
  FolderPlus,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableColumn,
  BulkAction,
  RowAction,
  ColumnVisibilitySelector,
  type ColumnConfig,
} from "@/components/shared";
import {
  useDeleteRecipeMutation,
  useBulkDeleteRecipesMutation,
  useBulkArchiveRecipesMutation,
  useBulkUnarchiveRecipesMutation,
  useBulkFavoriteRecipesMutation,
  useToggleFavoriteMutation,
  useLazyGetRecipeAvailabilityQuery,
  type RecipeListItem,
  type RecipeListResponse,
  type RecipeAvailabilityStatus,
} from "@/lib/api/recipes-api";
import { AvailabilityBadge, getAvailabilityStatus, type AvailabilityStatus } from "@/components/shared";
import { useUserStore, defaultColumnVisibility } from "@/lib/store/user-store";

interface RecipeTableProps {
  data: RecipeListResponse | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (item: RecipeListItem) => void;
  onView?: (item: RecipeListItem) => void;
  onCook?: (item: RecipeListItem) => void;
  onAddToShoppingList?: (item: RecipeListItem) => void;
  onAddToCollection?: (items: RecipeListItem[]) => void;
  isArchiveView?: boolean;
}

function getCategoryIcon(category: string | null) {
  const icons: Record<string, typeof ChefHat> = {
    breakfast: UtensilsCrossed,
    lunch: UtensilsCrossed,
    dinner: UtensilsCrossed,
    dessert: ChefHat,
    snack: ChefHat,
    appetizer: ChefHat,
    side: ChefHat,
    beverage: ChefHat,
    other: ChefHat,
  };
  const Icon = icons[category || "other"] || ChefHat;
  return <Icon className="h-4 w-4" />;
}

function getCategoryBadgeColor(category: string | null): string {
  const colors: Record<string, string> = {
    breakfast: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    lunch: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    dinner: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    dessert: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    snack: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    appetizer: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    side: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    beverage: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };
  return colors[category || "other"] || colors.other;
}

function getDifficultyBadge(difficulty: string | null, t: (key: string) => string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    easy: "secondary",
    medium: "default",
    hard: "destructive",
  };
  const variant = variants[difficulty || "medium"] || "secondary";

  return difficulty ? (
    <Badge variant={variant}>{t(`difficulties.${difficulty}`)}</Badge>
  ) : null;
}

function getRatingStars(rating: number | null) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/40"
          }`}
        />
      ))}
    </div>
  );
}

// Availability cell component with lazy loading
function AvailabilityCell({ recipeId, servings }: { recipeId: string; servings: number }) {
  const [fetchAvailability, { data, isLoading, isFetching }] = useLazyGetRecipeAvailabilityQuery();
  const [hasChecked, setHasChecked] = useState(false);

  const handleCheck = () => {
    if (!hasChecked) {
      fetchAvailability({ recipeId, servings });
      setHasChecked(true);
    }
  };

  if (!hasChecked) {
    return (
      <button
        onClick={handleCheck}
        className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
      >
        Check
      </button>
    );
  }

  if (isLoading || isFetching) {
    return (
      <span className="text-xs text-muted-foreground animate-pulse">
        Checking...
      </span>
    );
  }

  if (!data) {
    return <span className="text-muted-foreground">-</span>;
  }

  const status: AvailabilityStatus = getAvailabilityStatus(
    data.can_make,
    data.missing_count,
    data.partial_count,
    data.total_ingredients
  );

  return (
    <AvailabilityBadge
      status={status}
      missingCount={data.missing_count}
      partialCount={data.partial_count}
      availableServings={data.available_servings}
      totalIngredients={data.total_ingredients}
      compact
    />
  );
}

export function RecipeTable({
  data,
  isLoading,
  page,
  onPageChange,
  onEdit,
  onView,
  onCook,
  onAddToShoppingList,
  onAddToCollection,
  isArchiveView = false,
}: RecipeTableProps) {
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");

  const { preferences } = useUserStore();
  const columnVisibility = preferences.columnVisibility?.recipes ?? defaultColumnVisibility.recipes;
  const showColumnSelector = preferences.uiVisibility?.showColumnSelector ?? true;
  const showCollectionsTab = preferences.uiVisibility?.showCollectionsTab ?? true;

  const [deleteRecipe, { isLoading: isDeleting }] = useDeleteRecipeMutation();
  const [bulkDelete, { isLoading: isBulkDeleting }] = useBulkDeleteRecipesMutation();
  const [bulkArchive, { isLoading: isBulkArchiving }] = useBulkArchiveRecipesMutation();
  const [bulkUnarchive, { isLoading: isBulkUnarchiving }] = useBulkUnarchiveRecipesMutation();
  const [bulkFavorite, { isLoading: isBulkFavoriting }] = useBulkFavoriteRecipesMutation();
  const [toggleFavorite] = useToggleFavoriteMutation();

  const items = data?.items || [];

  // Column configuration for visibility selector
  const columnConfig: ColumnConfig[] = [
    { key: "name", label: t("table.name"), mandatory: true },
    { key: "category", label: t("table.category") },
    { key: "cuisine_type", label: t("table.cuisine") },
    { key: "time", label: t("table.time") },
    { key: "servings", label: t("table.servings") },
    { key: "difficulty", label: t("table.difficulty") },
    { key: "availability", label: t("table.availability") },
    { key: "rating", label: t("table.rating") },
    { key: "times_cooked", label: t("table.cooked") },
    { key: "created_at", label: t("table.addedOn") },
  ];

  // Define all columns
  const allColumns: DataTableColumn<RecipeListItem>[] = [
    {
      key: "name",
      header: t("table.name"),
      render: (item) => (
        <div className="flex items-center gap-2">
          {getCategoryIcon(item.category)}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.name}</span>
              {item.is_favorite && (
                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              )}
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: t("table.category"),
      render: (item) =>
        item.category ? (
          <Badge variant="secondary" className={getCategoryBadgeColor(item.category)}>
            {t(`categories.${item.category}`)}
          </Badge>
        ) : null,
    },
    {
      key: "cuisine_type",
      header: t("table.cuisine"),
      render: (item) =>
        item.cuisine_type ? (
          <span className="text-sm">{item.cuisine_type}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "time",
      header: t("table.time"),
      render: (item) => {
        const totalTime = item.total_time || (item.prep_time || 0) + (item.cook_time || 0);
        return totalTime ? (
          <div className="flex items-center gap-1 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{totalTime} min</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: "servings",
      header: t("table.servings"),
      render: (item) => (
        <div className="flex items-center gap-1 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{item.servings}</span>
        </div>
      ),
    },
    {
      key: "difficulty",
      header: t("table.difficulty"),
      render: (item) => getDifficultyBadge(item.difficulty, t),
    },
    {
      key: "availability",
      header: t("table.availability"),
      render: (item) => <AvailabilityCell recipeId={item.id} servings={item.servings} />,
    },
    {
      key: "rating",
      header: t("table.rating"),
      render: (item) => getRatingStars(item.rating),
    },
    {
      key: "times_cooked",
      header: t("table.cooked"),
      render: (item) =>
        item.times_cooked > 0 ? (
          <span className="text-sm">{item.times_cooked}x</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "created_at",
      header: t("table.addedOn"),
      render: (item) => format(parseISO(item.created_at), "MMM d, yyyy"),
    },
  ];

  // Filter columns based on visibility
  const columns = useMemo(
    () => allColumns.filter((col) => columnVisibility[col.key as keyof typeof columnVisibility]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnVisibility]
  );

  // Define bulk actions
  const bulkActions: BulkAction[] = [
    {
      label: t("actions.favorite"),
      icon: <Heart className="h-4 w-4 mr-1" />,
      variant: "outline" as const,
      isLoading: isBulkFavoriting,
      onClick: async (ids: string[]) => {
        try {
          await bulkFavorite({ ids, favorite: true }).unwrap();
          toast.success(t("messages.itemsFavorited"));
        } catch {
          toast.error(t("messages.errorFavoriting"));
        }
      },
    },
    ...(onAddToCollection && showCollectionsTab
      ? [
          {
            label: t("actions.addToCollection"),
            icon: <FolderPlus className="h-4 w-4 mr-1" />,
            variant: "outline" as const,
            onClick: async (ids: string[]) => {
              const selectedItems = items.filter((item) => ids.includes(item.id));
              onAddToCollection(selectedItems);
            },
          },
        ]
      : []),
    ...(isArchiveView
      ? [
          {
            label: tCommon("unarchive"),
            icon: <ArchiveRestore className="h-4 w-4 mr-1" />,
            variant: "outline" as const,
            isLoading: isBulkUnarchiving,
            onClick: async (ids: string[]) => {
              try {
                await bulkUnarchive(ids).unwrap();
                toast.success(t("messages.itemsUnarchived"));
              } catch {
                toast.error(t("messages.errorUnarchiving"));
              }
            },
          },
        ]
      : [
          {
            label: tCommon("archive"),
            icon: <Archive className="h-4 w-4 mr-1" />,
            variant: "outline" as const,
            isLoading: isBulkArchiving,
            onClick: async (ids: string[]) => {
              try {
                await bulkArchive(ids).unwrap();
                toast.success(t("messages.itemsArchived"));
              } catch {
                toast.error(t("messages.errorArchiving"));
              }
            },
          },
        ]),
    {
      label: tCommon("delete"),
      icon: <Trash2 className="h-4 w-4 mr-1" />,
      variant: "destructive",
      isLoading: isBulkDeleting,
      onClick: async (ids: string[]) => {
        try {
          await bulkDelete(ids).unwrap();
          toast.success(t("messages.itemsDeleted"));
        } catch {
          toast.error(t("messages.errorBulkDeleting"));
        }
      },
    },
  ];

  // Define row actions
  const rowActions: RowAction<RecipeListItem>[] = [
    ...(onView
      ? [
          {
            label: t("viewRecipe.view"),
            icon: <Eye className="h-4 w-4 mr-2" />,
            onClick: onView,
          },
        ]
      : []),
    {
      label: tCommon("edit"),
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: onEdit,
    },
    {
      label: t("actions.toggleFavorite"),
      icon: <Heart className="h-4 w-4 mr-2" />,
      onClick: async (item: RecipeListItem) => {
        try {
          await toggleFavorite(item.id).unwrap();
          toast.success(
            item.is_favorite ? t("messages.removedFromFavorites") : t("messages.addedToFavorites")
          );
        } catch {
          toast.error(t("messages.errorTogglingFavorite"));
        }
      },
    },
    ...(onCook
      ? [
          {
            label: t("actions.markCooked"),
            icon: <CalendarCheck className="h-4 w-4 mr-2" />,
            onClick: onCook,
          },
        ]
      : []),
    ...(onAddToShoppingList
      ? [
          {
            label: t("actions.addToShoppingList"),
            icon: <ShoppingCart className="h-4 w-4 mr-2" />,
            onClick: onAddToShoppingList,
          },
        ]
      : []),
    ...(onAddToCollection && showCollectionsTab
      ? [
          {
            label: t("actions.addToCollection"),
            icon: <FolderPlus className="h-4 w-4 mr-2" />,
            onClick: (item: RecipeListItem) => onAddToCollection([item]),
          },
        ]
      : []),
    {
      label: tCommon("delete"),
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: "destructive",
      separator: true,
      onClick: () => {}, // Handled by deleteConfig
    },
  ];

  return (
    <div className="space-y-4">
      {showColumnSelector && (
        <div className="flex justify-end">
          <ColumnVisibilitySelector module="recipes" columns={columnConfig} />
        </div>
      )}
      <DataTable
        items={items}
        columns={columns}
        isLoading={isLoading}
        pagination={
          data
            ? {
                page,
                totalPages: data.total_pages,
                total: data.total,
              }
            : undefined
        }
        onPageChange={onPageChange}
        selectable
        bulkActions={bulkActions}
        rowActions={rowActions}
        deleteConfig={{
          getItemName: (item) => item.name,
          onDelete: async (item) => {
            try {
              await deleteRecipe(item.id).unwrap();
              toast.success(t("messages.itemDeleted"));
            } catch {
              toast.error(t("messages.errorDeleting"));
            }
          },
          isDeleting,
          title: t("confirmDelete.title"),
        }}
        texts={{
          loading: t("filters.loading"),
          selectedCount: (count: number) => t("table.selectedCount", { count }),
          itemsOnPage: (count: number) => t("table.itemsOnPage", { count }),
          selectToAction: t("table.selectToAction"),
          pageInfo: (page: number, totalPages: number, total: number) =>
            t("table.pageInfo", { page, totalPages, total }),
          previous: tCommon("previous"),
          next: tCommon("next"),
          deleteTitle: t("confirmDelete.title"),
          deleteDescription: (name: string) => t("confirmDelete.description", { name }),
          cancel: tCommon("cancel"),
          delete: tCommon("delete"),
          deleting: t("table.deleting"),
        }}
      />
    </div>
  );
}
