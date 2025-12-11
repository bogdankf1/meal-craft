"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  Wrench,
  ChefHat,
  Utensils,
  Plug,
  Scissors,
  Package,
  Hammer,
  Star,
  HelpCircle,
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
  useDeleteKitchenEquipmentMutation,
  useBulkDeleteKitchenEquipmentMutation,
  useBulkArchiveKitchenEquipmentMutation,
  useBulkUnarchiveKitchenEquipmentMutation,
  type KitchenEquipment,
  type KitchenEquipmentListResponse,
} from "@/lib/api/kitchen-equipment-api";
import { RecordMaintenanceDialog } from "./record-maintenance-dialog";

interface KitchenEquipmentTableProps {
  data: KitchenEquipmentListResponse | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (item: KitchenEquipment) => void;
  isArchiveView?: boolean;
}

function getCategoryIcon(category: string | null) {
  const icons: Record<string, typeof ChefHat> = {
    cookware: ChefHat,
    bakeware: Package,
    appliances: Plug,
    knives_cutting: Scissors,
    utensils: Utensils,
    storage: Package,
    small_tools: Hammer,
    specialty: Star,
    other: HelpCircle,
  };
  const Icon = icons[category || "other"] || HelpCircle;
  return <Icon className="h-4 w-4" />;
}

function getCategoryBadgeColor(category: string | null): string {
  const colors: Record<string, string> = {
    cookware: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    bakeware: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    appliances: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    knives_cutting: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    utensils: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    storage: "bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-300",
    small_tools: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    specialty: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };
  return colors[category || "other"] || colors.other;
}

function getConditionBadge(condition: string | null, t: (key: string) => string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    excellent: "default",
    good: "secondary",
    fair: "outline",
    needs_repair: "destructive",
    replace_soon: "destructive",
  };
  const variant = variants[condition || "good"] || "secondary";

  return (
    <Badge variant={variant}>
      {t(`conditions.${condition || "good"}`)}
    </Badge>
  );
}

export function KitchenEquipmentTable({
  data,
  isLoading,
  page,
  onPageChange,
  onEdit,
  isArchiveView = false,
}: KitchenEquipmentTableProps) {
  const t = useTranslations("kitchenEquipment");
  const tCommon = useTranslations("common");

  const [deleteEquipment, { isLoading: isDeleting }] = useDeleteKitchenEquipmentMutation();
  const [bulkDelete, { isLoading: isBulkDeleting }] = useBulkDeleteKitchenEquipmentMutation();
  const [bulkArchive, { isLoading: isBulkArchiving }] = useBulkArchiveKitchenEquipmentMutation();
  const [bulkUnarchive, { isLoading: isBulkUnarchiving }] = useBulkUnarchiveKitchenEquipmentMutation();

  // State for Record Maintenance dialog
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [itemsForMaintenance, setItemsForMaintenance] = useState<{
    id: string;
    name: string;
  }[]>([]);

  const items = data?.items || [];

  // Define columns
  const columns: DataTableColumn<KitchenEquipment>[] = [
    {
      key: "name",
      header: t("table.name"),
      render: (item) => (
        <div className="flex items-center gap-2">
          {getCategoryIcon(item.category)}
          <span className="font-medium">{item.name}</span>
          {item.needs_maintenance && (
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          )}
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
      key: "brand",
      header: t("table.brand"),
      render: (item) => (
        <span>
          {item.brand}
          {item.model && <span className="text-muted-foreground"> / {item.model}</span>}
        </span>
      ),
    },
    {
      key: "condition",
      header: t("table.condition"),
      render: (item) => getConditionBadge(item.condition, t),
    },
    {
      key: "location",
      header: t("table.location"),
      render: (item) => item.location ? t(`locations.${item.location}`) : "-",
    },
    {
      key: "maintenance",
      header: t("table.maintenance"),
      render: (item) => {
        if (!item.maintenance_interval_days) {
          return <span className="text-muted-foreground">-</span>;
        }

        if (item.needs_maintenance) {
          return (
            <div className="flex items-center gap-1 text-orange-500">
              <AlertTriangle className="h-4 w-4" />
              <span>{t("table.needsMaintenance")}</span>
            </div>
          );
        }

        if (item.days_until_maintenance !== null) {
          return (
            <span className="text-muted-foreground">
              {t("table.daysUntilMaintenance", { days: item.days_until_maintenance })}
            </span>
          );
        }

        return <span className="text-muted-foreground">-</span>;
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
    // Record Maintenance action
    {
      label: t("maintenance.record"),
      icon: <Wrench className="h-4 w-4 mr-1" />,
      variant: "outline" as const,
      onClick: async (ids: string[]) => {
        const selectedItems = items
          .filter((item) => ids.includes(item.id))
          .map((item) => ({ id: item.id, name: item.name }));
        setItemsForMaintenance(selectedItems);
        setMaintenanceDialogOpen(true);
      },
    },
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
  const rowActions: RowAction<KitchenEquipment>[] = [
    {
      label: tCommon("edit"),
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: onEdit,
    },
    {
      label: t("maintenance.record"),
      icon: <Wrench className="h-4 w-4 mr-2" />,
      onClick: (item: KitchenEquipment) => {
        setItemsForMaintenance([{ id: item.id, name: item.name }]);
        setMaintenanceDialogOpen(true);
      },
    },
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
          getItemName: (item) => item.name,
          onDelete: async (item) => {
            try {
              await deleteEquipment(item.id).unwrap();
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

      <RecordMaintenanceDialog
        open={maintenanceDialogOpen}
        onOpenChange={setMaintenanceDialogOpen}
        items={itemsForMaintenance}
      />
    </>
  );
}
