"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  CheckCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DataTable,
  DataTableColumn,
  BulkAction,
  RowAction,
  ColumnVisibilitySelector,
  type ColumnConfig,
} from "@/components/shared";
import {
  useDeleteShoppingListMutation,
  useBulkDeleteShoppingListsMutation,
  useBulkArchiveShoppingListsMutation,
  useBulkUnarchiveShoppingListsMutation,
  useBulkCompleteShoppingListsMutation,
  type ShoppingListSummary,
  type ShoppingListListResponse,
} from "@/lib/api/shopping-lists-api";
import { useCurrency } from "@/components/providers/currency-provider";
import { useUserStore, defaultColumnVisibility } from "@/lib/store/user-store";

interface ShoppingListTableProps {
  data: ShoppingListListResponse | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (list: ShoppingListSummary) => void;
  onView: (list: ShoppingListSummary) => void;
  isArchiveView?: boolean;
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "active":
      return "secondary";
    default:
      return "outline";
  }
}

export function ShoppingListTable({
  data,
  isLoading,
  page,
  onPageChange,
  onEdit,
  onView,
  isArchiveView = false,
}: ShoppingListTableProps) {
  const t = useTranslations("shoppingLists");
  const tCommon = useTranslations("common");
  const { formatPriceFromUAH } = useCurrency();

  const { preferences } = useUserStore();
  const columnVisibility = preferences.columnVisibility?.shoppingLists ?? defaultColumnVisibility.shoppingLists;
  const showColumnSelector = preferences.uiVisibility?.showColumnSelector ?? true;

  const [deleteList, { isLoading: isDeleting }] = useDeleteShoppingListMutation();
  const [bulkDelete, { isLoading: isBulkDeleting }] = useBulkDeleteShoppingListsMutation();
  const [bulkArchive, { isLoading: isBulkArchiving }] = useBulkArchiveShoppingListsMutation();
  const [bulkUnarchive, { isLoading: isBulkUnarchiving }] = useBulkUnarchiveShoppingListsMutation();
  const [bulkComplete, { isLoading: isBulkCompleting }] = useBulkCompleteShoppingListsMutation();

  const items = data?.items || [];

  // Column configuration for visibility selector
  const columnConfig: ColumnConfig[] = [
    { key: "name", label: t("table.name"), mandatory: true },
    { key: "status", label: t("table.status") },
    { key: "progress", label: t("table.progress") },
    { key: "estimated_cost", label: t("table.estimatedCost") },
    { key: "created_at", label: t("table.createdAt") },
    { key: "completed_at", label: t("table.completedAt") },
  ];

  const allColumns: DataTableColumn<ShoppingListSummary>[] = [
    {
      key: "name",
      header: t("table.name"),
      render: (list) => (
        <span className="font-medium">{list.name}</span>
      ),
    },
    {
      key: "status",
      header: t("table.status"),
      render: (list) => (
        <Badge variant={getStatusBadgeVariant(list.status)}>
          {t(`status.${list.status}`)}
        </Badge>
      ),
    },
    {
      key: "progress",
      header: t("table.progress"),
      render: (list) => {
        const progress = list.total_items > 0
          ? Math.round((list.purchased_items / list.total_items) * 100)
          : 0;
        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {list.purchased_items}/{list.total_items}
            </span>
          </div>
        );
      },
    },
    {
      key: "estimated_cost",
      header: t("table.estimatedCost"),
      render: (list) =>
        list.estimated_cost !== null ? formatPriceFromUAH(list.estimated_cost) : "-",
    },
    {
      key: "created_at",
      header: t("table.createdAt"),
      render: (list) => format(parseISO(list.created_at), "MMM d, yyyy"),
    },
    {
      key: "completed_at",
      header: t("table.completedAt"),
      render: (list) =>
        list.completed_at
          ? format(parseISO(list.completed_at), "MMM d, yyyy")
          : "-",
    },
  ];

  // Filter columns based on visibility
  const columns = useMemo(
    () => allColumns.filter((col) => columnVisibility[col.key as keyof typeof columnVisibility]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnVisibility]
  );

  const bulkActions: BulkAction[] = [
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
                toast.success(t("messages.listsUnarchived"));
              } catch {
                toast.error(t("messages.errorUnarchiving"));
              }
            },
          },
        ]
      : [
          {
            label: t("actions.complete"),
            icon: <CheckCircle className="h-4 w-4 mr-1" />,
            variant: "default" as const,
            isLoading: isBulkCompleting,
            onClick: async (ids: string[]) => {
              try {
                await bulkComplete(ids).unwrap();
                toast.success(t("messages.listsCompleted"));
              } catch {
                toast.error(t("messages.errorCompleting"));
              }
            },
          },
          {
            label: tCommon("archive"),
            icon: <Archive className="h-4 w-4 mr-1" />,
            variant: "outline" as const,
            isLoading: isBulkArchiving,
            onClick: async (ids: string[]) => {
              try {
                await bulkArchive(ids).unwrap();
                toast.success(t("messages.listsArchived"));
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
          toast.success(t("messages.listsDeleted"));
        } catch {
          toast.error(t("messages.errorBulkDeleting"));
        }
      },
    },
  ];

  const rowActions: RowAction<ShoppingListSummary>[] = [
    {
      label: t("actions.view"),
      icon: <Eye className="h-4 w-4 mr-2" />,
      onClick: onView,
    },
    {
      label: tCommon("edit"),
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: onEdit,
    },
    {
      label: tCommon("delete"),
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: "destructive",
      separator: true,
      onClick: () => {},
    },
  ];

  return (
    <div className="space-y-4">
      {showColumnSelector && (
        <div className="flex justify-end">
          <ColumnVisibilitySelector module="shoppingLists" columns={columnConfig} />
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
          getItemName: (list) => list.name,
          onDelete: async (list) => {
            try {
              await deleteList(list.id).unwrap();
              toast.success(t("messages.listDeleted"));
            } catch {
              toast.error(t("messages.errorDeleting"));
            }
          },
          isDeleting,
          title: t("confirmDelete.title"),
        }}
        texts={{
          loading: tCommon("loading"),
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
