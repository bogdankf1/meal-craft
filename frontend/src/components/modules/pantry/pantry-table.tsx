"use client";

import { useState } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  Ban,
  Refrigerator,
  ThermometerSnowflake,
  Package,
  Cookie,
  HelpCircle,
  Home,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableColumn,
  BulkAction,
  RowAction,
} from "@/components/shared/DataTable";
import {
  useDeletePantryItemMutation,
  useBulkDeletePantryItemsMutation,
  useBulkArchivePantryItemsMutation,
  useBulkUnarchivePantryItemsMutation,
  type PantryItem,
  type PantryListResponse,
  type StorageLocation,
} from "@/lib/api/pantry-api";
import { MarkAsWastedPantryDialog } from "./mark-as-wasted-pantry-dialog";
import { AddToShoppingListDialog } from "@/components/modules/shopping-lists";

interface PantryTableProps {
  data: PantryListResponse | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (item: PantryItem) => void;
  isArchiveView?: boolean;
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
    canned: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    dry_goods: "bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-300",
    beverages: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    snacks: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    condiments: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    spices: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
    oils: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300",
    grains: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    pasta: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    cereals: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    baking: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };
  return colors[category || "other"] || colors.other;
}

function getStorageIcon(location: StorageLocation) {
  const icons: Record<StorageLocation, typeof Refrigerator> = {
    pantry: Home,
    fridge: Refrigerator,
    freezer: ThermometerSnowflake,
    cabinet: Package,
    spice_rack: Cookie,
    other: HelpCircle,
  };
  const Icon = icons[location] || HelpCircle;
  return <Icon className="h-4 w-4" />;
}

export function PantryTable({
  data,
  isLoading,
  page,
  onPageChange,
  onEdit,
  isArchiveView = false,
}: PantryTableProps) {
  const t = useTranslations("pantry");
  const tCommon = useTranslations("common");
  const tShoppingLists = useTranslations("shoppingLists");

  const [deletePantryItem, { isLoading: isDeleting }] = useDeletePantryItemMutation();
  const [bulkDelete, { isLoading: isBulkDeleting }] = useBulkDeletePantryItemsMutation();
  const [bulkArchive, { isLoading: isBulkArchiving }] = useBulkArchivePantryItemsMutation();
  const [bulkUnarchive, { isLoading: isBulkUnarchiving }] = useBulkUnarchivePantryItemsMutation();

  // State for Mark as Wasted dialog
  const [markAsWastedOpen, setMarkAsWastedOpen] = useState(false);
  const [itemsToMarkAsWasted, setItemsToMarkAsWasted] = useState<{
    id: string;
    name: string;
  }[]>([]);

  // State for Add to Shopping List dialog
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [itemsToAddToList, setItemsToAddToList] = useState<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    category?: string | null;
  }[]>([]);

  const items = data?.items || [];

  // Helper to convert pantry item to waste item format
  const pantryToWasteItem = (item: PantryItem) => ({
    id: item.id,
    name: item.item_name,
  });

  // Helper to convert pantry item to shopping list item format
  const pantryToShoppingItem = (item: PantryItem) => ({
    name: item.item_name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
  });

  // Define columns
  const columns: DataTableColumn<PantryItem>[] = [
    {
      key: "item_name",
      header: t("table.item"),
      render: (item) => (
        <span className="font-medium">{item.item_name}</span>
      ),
    },
    {
      key: "storage_location",
      header: t("table.location"),
      render: (item) => (
        <div className="flex items-center gap-2">
          {getStorageIcon(item.storage_location)}
          <span>{t(`storageLocations.${item.storage_location}`)}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: t("table.category"),
      render: (item) =>
        item.category ? (
          <Badge
            variant="secondary"
            className={getCategoryBadgeColor(item.category)}
          >
            {t(`categories.${item.category}`)}
          </Badge>
        ) : null,
    },
    {
      key: "quantity",
      header: t("table.quantity"),
      render: (item) => {
        if (item.quantity === null) return null;

        const isLowStock = item.minimum_quantity !== null &&
          item.quantity <= item.minimum_quantity;

        return (
          <span className={isLowStock ? "text-orange-500 font-medium" : ""}>
            {item.quantity}
            {item.unit && ` ${item.unit}`}
            {isLowStock && (
              <AlertTriangle className="h-3 w-3 inline ml-1 text-orange-500" />
            )}
          </span>
        );
      },
    },
    {
      key: "expiry_date",
      header: t("table.expiry"),
      render: (item) => {
        if (!item.expiry_date) {
          return <span className="text-muted-foreground">-</span>;
        }

        const { status: expiryStatus, daysUntil } = getExpiryStatus(item.expiry_date);

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
              {format(parseISO(item.expiry_date), "MMM d, yyyy")}
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
      key: "created_at",
      header: t("table.addedOn"),
      render: (item) =>
        format(parseISO(item.created_at), "MMM d, yyyy"),
    },
  ];

  // Define bulk actions
  const bulkActions: BulkAction[] = [
    // Add to Shopping List action
    {
      label: tShoppingLists("addToList.title"),
      icon: <ShoppingCart className="h-4 w-4 mr-1" />,
      variant: "outline" as const,
      onClick: async (ids: string[]) => {
        const selectedItems = items
          .filter((item) => ids.includes(item.id))
          .map(pantryToShoppingItem);
        setItemsToAddToList(selectedItems);
        setAddToListOpen(true);
      },
    },
    // Mark as Wasted action - only show on Overview (not Archive)
    ...(!isArchiveView
      ? [
          {
            label: t("waste.markAsWasted"),
            icon: <Ban className="h-4 w-4 mr-1" />,
            variant: "outline" as const,
            onClick: async (ids: string[]) => {
              const selectedItems = items
                .filter((item) => ids.includes(item.id))
                .map(pantryToWasteItem);
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
  const rowActions: RowAction<PantryItem>[] = [
    {
      label: tCommon("edit"),
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: onEdit,
    },
    // Add to Shopping List action
    {
      label: tShoppingLists("addToList.title"),
      icon: <ShoppingCart className="h-4 w-4 mr-2" />,
      onClick: (item: PantryItem) => {
        setItemsToAddToList([pantryToShoppingItem(item)]);
        setAddToListOpen(true);
      },
    },
    // Mark as Wasted action - only show on Overview (not Archive) and for non-wasted items
    ...(!isArchiveView
      ? [
          {
            label: t("waste.markAsWasted"),
            icon: <Ban className="h-4 w-4 mr-2" />,
            onClick: (item: PantryItem) => {
              if (!item.is_wasted) {
                setItemsToMarkAsWasted([pantryToWasteItem(item)]);
                setMarkAsWastedOpen(true);
              }
            },
          } as RowAction<PantryItem>,
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
          getItemName: (item) => item.item_name,
          onDelete: async (item) => {
            try {
              await deletePantryItem(item.id).unwrap();
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

      <MarkAsWastedPantryDialog
        open={markAsWastedOpen}
        onOpenChange={setMarkAsWastedOpen}
        items={itemsToMarkAsWasted}
      />

      <AddToShoppingListDialog
        open={addToListOpen}
        onOpenChange={setAddToListOpen}
        items={itemsToAddToList}
      />
    </>
  );
}
