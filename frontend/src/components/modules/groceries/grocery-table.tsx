"use client";

import { useState, useMemo } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  ShoppingCart,
  Ban,
  Package,
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
  useDeleteGroceryMutation,
  useBulkDeleteGroceriesMutation,
  useBulkArchiveGroceriesMutation,
  useBulkUnarchiveGroceriesMutation,
  type Grocery,
  type GroceryListResponse,
} from "@/lib/api/groceries-api";
import { AddToShoppingListDialog } from "@/components/modules/shopping-lists";
import { MarkAsWastedDialog } from "./mark-as-wasted-dialog";
import { MoveToPantryDialog } from "./move-to-pantry-dialog";
import { useCurrency } from "@/components/providers/currency-provider";
import { useUserStore, defaultColumnVisibility } from "@/lib/store/user-store";

interface GroceryTableProps {
  data: GroceryListResponse | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (grocery: Grocery) => void;
  isArchiveView?: boolean;
  defaultSelectAll?: boolean;
}

function getExpiryStatus(expiryDate: string | null): {
  status: "expired" | "expiring" | "ok" | null;
  daysUntil: number | null;
} {
  if (!expiryDate) return { status: null, daysUntil: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = parseISO(expiryDate);
  const daysUntil = differenceInDays(expiry, today);

  if (daysUntil < 0) return { status: "expired", daysUntil };
  if (daysUntil <= 7) return { status: "expiring", daysUntil };
  return { status: "ok", daysUntil };
}

function getCategoryBadgeColor(category: string | null): string {
  const colors: Record<string, string> = {
    produce: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    meat: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    seafood: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    dairy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    bakery: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    frozen: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    pantry: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    beverages: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    snacks: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    condiments: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    spices: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };
  return colors[category || "other"] || colors.other;
}

export function GroceryTable({
  data,
  isLoading,
  page,
  onPageChange,
  onEdit,
  isArchiveView = false,
  defaultSelectAll = false,
}: GroceryTableProps) {
  const t = useTranslations("groceries");
  const tCommon = useTranslations("common");
  const tShoppingLists = useTranslations("shoppingLists");
  const { formatPriceFromUAH } = useCurrency();

  const { preferences } = useUserStore();
  const columnVisibility = preferences.columnVisibility?.groceries ?? defaultColumnVisibility.groceries;
  const showColumnSelector = preferences.uiVisibility?.showColumnSelector ?? true;
  const showWasteTab = preferences.uiVisibility?.showWasteTab ?? true;

  const [deleteGrocery, { isLoading: isDeleting }] = useDeleteGroceryMutation();
  const [bulkDelete, { isLoading: isBulkDeleting }] = useBulkDeleteGroceriesMutation();
  const [bulkArchive, { isLoading: isBulkArchiving }] = useBulkArchiveGroceriesMutation();
  const [bulkUnarchive, { isLoading: isBulkUnarchiving }] = useBulkUnarchiveGroceriesMutation();

  // State for Add to Shopping List dialog
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [itemsToAddToList, setItemsToAddToList] = useState<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    category?: string | null;
  }[]>([]);

  // State for Mark as Wasted dialog
  const [markAsWastedOpen, setMarkAsWastedOpen] = useState(false);
  const [itemsToMarkAsWasted, setItemsToMarkAsWasted] = useState<{
    id: string;
    name: string;
  }[]>([]);

  // State for Move to Pantry dialog
  const [moveToPantryOpen, setMoveToPantryOpen] = useState(false);
  const [itemsToMoveToPantry, setItemsToMoveToPantry] = useState<{
    id: string;
    name: string;
    category: string | null;
  }[]>([]);

  const items = data?.items || [];

  // Column configuration for visibility selector
  const columnConfig: ColumnConfig[] = [
    { key: "item_name", label: t("table.item"), mandatory: true },
    { key: "category", label: t("table.category") },
    { key: "quantity", label: t("table.quantity") },
    { key: "purchase_date", label: t("table.purchaseDate") },
    { key: "expiry_date", label: t("table.expiry") },
    { key: "cost", label: t("table.cost") },
    { key: "store", label: t("table.store") },
  ];

  // Helper to convert grocery to shopping list item format
  const groceryToShoppingItem = (grocery: Grocery) => ({
    name: grocery.item_name,
    quantity: grocery.quantity,
    unit: grocery.unit,
    category: grocery.category,
  });

  // Helper to convert grocery to waste item format
  const groceryToWasteItem = (grocery: Grocery) => ({
    id: grocery.id,
    name: grocery.item_name,
  });

  // Define all columns
  const allColumns: DataTableColumn<Grocery>[] = [
    {
      key: "item_name",
      header: t("table.item"),
      render: (grocery) => (
        <span className="font-medium">{grocery.item_name}</span>
      ),
    },
    {
      key: "category",
      header: t("table.category"),
      render: (grocery) =>
        grocery.category ? (
          <Badge
            variant="secondary"
            className={getCategoryBadgeColor(grocery.category)}
          >
            {t(`categories.${grocery.category}`)}
          </Badge>
        ) : null,
    },
    {
      key: "quantity",
      header: t("table.quantity"),
      render: (grocery) =>
        grocery.quantity !== null ? (
          <span>
            {grocery.quantity}
            {grocery.unit && ` ${grocery.unit}`}
          </span>
        ) : null,
    },
    {
      key: "purchase_date",
      header: t("table.purchaseDate"),
      render: (grocery) =>
        format(parseISO(grocery.purchase_date), "MMM d, yyyy"),
    },
    {
      key: "expiry_date",
      header: t("table.expiry"),
      render: (grocery) => {
        if (!grocery.expiry_date) {
          return <span className="text-muted-foreground">-</span>;
        }

        const { status: expiryStatus, daysUntil } = getExpiryStatus(grocery.expiry_date);

        return (
          <div className="flex items-center gap-1">
            {expiryStatus === "expired" && (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
            {expiryStatus === "expiring" && (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
            <span
              className={
                expiryStatus === "expired"
                  ? "text-destructive"
                  : expiryStatus === "expiring"
                  ? "text-orange-500"
                  : ""
              }
            >
              {format(parseISO(grocery.expiry_date), "MMM d, yyyy")}
            </span>
            {daysUntil !== null && expiryStatus !== "ok" && (
              <span className="text-xs text-muted-foreground">
                ({daysUntil < 0
                  ? t("filters.daysAgo", { days: Math.abs(daysUntil) })
                  : t("filters.daysLeft", { days: daysUntil })})
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "cost",
      header: t("table.cost"),
      render: (grocery) =>
        grocery.cost !== null ? formatPriceFromUAH(grocery.cost) : "-",
    },
    {
      key: "store",
      header: t("table.store"),
      render: (grocery) => grocery.store || "-",
    },
  ];

  // Filter columns based on visibility
  const columns = useMemo(
    () => allColumns.filter((col) => columnVisibility[col.key as keyof typeof columnVisibility]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnVisibility]
  );

  // Helper to convert grocery to move to pantry item format
  const groceryToMoveItem = (grocery: Grocery) => ({
    id: grocery.id,
    name: grocery.item_name,
    category: grocery.category,
  });

  // Define bulk actions
  const bulkActions: BulkAction[] = [
    {
      label: tShoppingLists("addToList.title"),
      icon: <ShoppingCart className="h-4 w-4 mr-1" />,
      variant: "outline" as const,
      onClick: async (ids: string[]) => {
        const selectedItems = items
          .filter((item) => ids.includes(item.id))
          .map(groceryToShoppingItem);
        setItemsToAddToList(selectedItems);
        setAddToListOpen(true);
      },
    },
    // Move to Pantry action - only show on Overview (not Archive)
    ...(!isArchiveView
      ? [
          {
            label: t("moveToPantry.title"),
            icon: <Package className="h-4 w-4 mr-1" />,
            variant: "outline" as const,
            spotlightId: "move-to-pantry-button",
            onClick: async (ids: string[]) => {
              const selectedItems = items
                .filter((item) => ids.includes(item.id))
                .map(groceryToMoveItem);
              setItemsToMoveToPantry(selectedItems);
              setMoveToPantryOpen(true);
            },
          },
        ]
      : []),
    // Mark as Wasted action - only show on Overview (not Archive) and when waste tab is visible
    ...(!isArchiveView && showWasteTab
      ? [
          {
            label: t("waste.markAsWasted"),
            icon: <Ban className="h-4 w-4 mr-1" />,
            variant: "outline" as const,
            onClick: async (ids: string[]) => {
              const selectedItems = items
                .filter((item) => ids.includes(item.id))
                .map(groceryToWasteItem);
              setItemsToMarkAsWasted(selectedItems);
              setMarkAsWastedOpen(true);
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
  const rowActions: RowAction<Grocery>[] = [
    {
      label: tCommon("edit"),
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: onEdit,
    },
    {
      label: tShoppingLists("addToList.title"),
      icon: <ShoppingCart className="h-4 w-4 mr-2" />,
      onClick: (grocery) => {
        setItemsToAddToList([groceryToShoppingItem(grocery)]);
        setAddToListOpen(true);
      },
    },
    // Move to Pantry action - only show on Overview (not Archive)
    ...(!isArchiveView
      ? [
          {
            label: t("moveToPantry.title"),
            icon: <Package className="h-4 w-4 mr-2" />,
            onClick: (grocery: Grocery) => {
              setItemsToMoveToPantry([groceryToMoveItem(grocery)]);
              setMoveToPantryOpen(true);
            },
          } as RowAction<Grocery>,
        ]
      : []),
    // Mark as Wasted action - only show on Overview (not Archive), for non-wasted items, and when waste tab is visible
    ...(!isArchiveView && showWasteTab
      ? [
          {
            label: t("waste.markAsWasted"),
            icon: <Ban className="h-4 w-4 mr-2" />,
            onClick: (grocery: Grocery) => {
              if (!grocery.is_wasted) {
                setItemsToMarkAsWasted([groceryToWasteItem(grocery)]);
                setMarkAsWastedOpen(true);
              }
            },
          } as RowAction<Grocery>,
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
    <>
    <div className="space-y-4">
      {showColumnSelector && (
        <div className="flex justify-end">
          <ColumnVisibilitySelector module="groceries" columns={columnConfig} />
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
        defaultSelectAll={defaultSelectAll}
        bulkActions={bulkActions}
        rowActions={rowActions}
        deleteConfig={{
          getItemName: (grocery) => grocery.item_name,
          onDelete: async (grocery) => {
            try {
              await deleteGrocery(grocery.id).unwrap();
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

    <AddToShoppingListDialog
      open={addToListOpen}
      onOpenChange={setAddToListOpen}
      items={itemsToAddToList}
    />

    <MarkAsWastedDialog
      open={markAsWastedOpen}
      onOpenChange={setMarkAsWastedOpen}
      items={itemsToMarkAsWasted}
    />

    <MoveToPantryDialog
      open={moveToPantryOpen}
      onOpenChange={setMoveToPantryOpen}
      items={itemsToMoveToPantry}
    />
    </>
  );
}
