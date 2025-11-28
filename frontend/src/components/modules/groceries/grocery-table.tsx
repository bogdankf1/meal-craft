"use client";

import { format, differenceInDays, parseISO } from "date-fns";
import {
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableColumn,
  BulkAction,
  RowAction,
} from "@/components/shared/DataTable";
import {
  useDeleteGroceryMutation,
  useBulkDeleteGroceriesMutation,
  useBulkArchiveGroceriesMutation,
  useBulkUnarchiveGroceriesMutation,
  type Grocery,
  type GroceryListResponse,
} from "@/lib/api/groceries-api";

interface GroceryTableProps {
  data: GroceryListResponse | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (grocery: Grocery) => void;
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
    pantry: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    beverages: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    snacks: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    condiments: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    spices: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
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
}: GroceryTableProps) {
  const [deleteGrocery, { isLoading: isDeleting }] = useDeleteGroceryMutation();
  const [bulkDelete, { isLoading: isBulkDeleting }] = useBulkDeleteGroceriesMutation();
  const [bulkArchive, { isLoading: isBulkArchiving }] = useBulkArchiveGroceriesMutation();
  const [bulkUnarchive, { isLoading: isBulkUnarchiving }] = useBulkUnarchiveGroceriesMutation();

  const items = data?.items || [];

  // Define columns
  const columns: DataTableColumn<Grocery>[] = [
    {
      key: "item_name",
      header: "Item",
      render: (grocery) => (
        <span className="font-medium">{grocery.item_name}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (grocery) =>
        grocery.category ? (
          <Badge
            variant="secondary"
            className={getCategoryBadgeColor(grocery.category)}
          >
            {grocery.category}
          </Badge>
        ) : null,
    },
    {
      key: "quantity",
      header: "Quantity",
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
      header: "Purchase Date",
      render: (grocery) =>
        format(parseISO(grocery.purchase_date), "MMM d, yyyy"),
    },
    {
      key: "expiry_date",
      header: "Expiry",
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
                ({daysUntil < 0 ? `${Math.abs(daysUntil)}d ago` : `${daysUntil}d`})
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "cost",
      header: "Cost",
      render: (grocery) =>
        grocery.cost !== null ? `$${grocery.cost.toFixed(2)}` : "-",
    },
    {
      key: "store",
      header: "Store",
      render: (grocery) => grocery.store || "-",
    },
  ];

  // Define bulk actions
  const bulkActions: BulkAction[] = [
    ...(isArchiveView
      ? [
          {
            label: "Unarchive",
            icon: <ArchiveRestore className="h-4 w-4 mr-1" />,
            variant: "outline" as const,
            isLoading: isBulkUnarchiving,
            onClick: async (ids: string[]) => {
              try {
                const result = await bulkUnarchive(ids).unwrap();
                toast.success(result.message);
              } catch {
                toast.error("Failed to unarchive selected items");
              }
            },
          },
        ]
      : [
          {
            label: "Archive",
            icon: <Archive className="h-4 w-4 mr-1" />,
            variant: "outline" as const,
            isLoading: isBulkArchiving,
            onClick: async (ids: string[]) => {
              try {
                const result = await bulkArchive(ids).unwrap();
                toast.success(result.message);
              } catch {
                toast.error("Failed to archive selected items");
              }
            },
          },
        ]),
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4 mr-1" />,
      variant: "destructive",
      isLoading: isBulkDeleting,
      onClick: async (ids: string[]) => {
        try {
          const result = await bulkDelete(ids).unwrap();
          toast.success(result.message);
        } catch {
          toast.error("Failed to delete selected items");
        }
      },
    },
  ];

  // Define row actions
  const rowActions: RowAction<Grocery>[] = [
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: onEdit,
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: "destructive",
      separator: true,
      onClick: () => {}, // Handled by deleteConfig
    },
  ];

  return (
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
        getItemName: (grocery) => grocery.item_name,
        onDelete: async (grocery) => {
          try {
            await deleteGrocery(grocery.id).unwrap();
            toast.success("Grocery item deleted");
          } catch {
            toast.error("Failed to delete grocery item");
          }
        },
        isDeleting,
        title: "Delete Grocery Item",
      }}
      texts={{
        loading: "Loading groceries...",
      }}
    />
  );
}
