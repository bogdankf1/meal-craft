"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import {
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  ChefHat,
  ShoppingCart,
  Package,
  ArrowDownToLine,
  Filter,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, DataTableColumn, EmptyState } from "@/components/shared";
import {
  useGetPantryTransactionsQuery,
  type PantryTransaction,
  type PantryTransactionType,
  type PantryTransactionFilters,
} from "@/lib/api/pantry-api";

interface PantryTransactionsProps {
  itemId?: string; // If provided, show transactions for specific item only
}

const TRANSACTION_TYPE_CONFIG: Record<
  PantryTransactionType,
  { icon: React.ReactNode; color: string; label: string }
> = {
  add: {
    icon: <Plus className="h-3.5 w-3.5" />,
    color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    label: "Added",
  },
  deduct: {
    icon: <Minus className="h-3.5 w-3.5" />,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    label: "Deducted",
  },
  waste: {
    icon: <Trash2 className="h-3.5 w-3.5" />,
    color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
    label: "Wasted",
  },
  adjust: {
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    label: "Adjusted",
  },
  expire: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
    label: "Expired",
  },
};

const SOURCE_TYPE_ICONS: Record<string, React.ReactNode> = {
  grocery: <ShoppingCart className="h-3.5 w-3.5" />,
  meal: <ChefHat className="h-3.5 w-3.5" />,
  manual: <Package className="h-3.5 w-3.5" />,
  waste: <Trash2 className="h-3.5 w-3.5" />,
  expiry: <AlertTriangle className="h-3.5 w-3.5" />,
  import: <ArrowDownToLine className="h-3.5 w-3.5" />,
};

export function PantryTransactions({ itemId }: PantryTransactionsProps) {
  const t = useTranslations("pantry");
  const tCommon = useTranslations("common");

  const [filters, setFilters] = useState<PantryTransactionFilters>({
    page: 1,
    per_page: 20,
  });

  const [typeFilter, setTypeFilter] = useState<PantryTransactionType | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  // Build query filters
  const queryFilters: PantryTransactionFilters = {
    ...filters,
    transaction_type: typeFilter !== "all" ? typeFilter : undefined,
    source_type: sourceFilter !== "all" ? sourceFilter : undefined,
  };

  const { data, isLoading } = useGetPantryTransactionsQuery(queryFilters);

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const columns: DataTableColumn<PantryTransaction>[] = [
    {
      key: "transaction_date",
      header: t("transactions.date"),
      render: (item) => (
        <div className="space-y-0.5">
          <div className="font-medium text-sm">
            {format(parseISO(item.transaction_date), "MMM d, yyyy")}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(parseISO(item.transaction_date), "h:mm a")}
          </div>
        </div>
      ),
    },
    {
      key: "item_name",
      header: t("transactions.item"),
      render: (item) => (
        <span className="font-medium">{item.item_name || t("transactions.unknownItem")}</span>
      ),
    },
    {
      key: "transaction_type",
      header: t("transactions.type"),
      render: (item) => {
        const config = TRANSACTION_TYPE_CONFIG[item.transaction_type];
        return (
          <Badge variant="outline" className={config.color}>
            {config.icon}
            <span className="ml-1">{t(`transactions.types.${item.transaction_type}`)}</span>
          </Badge>
        );
      },
    },
    {
      key: "quantity_change",
      header: t("transactions.change"),
      render: (item) => {
        const isPositive = item.quantity_change > 0;
        return (
          <span
            className={`font-mono font-medium ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? "+" : ""}
            {item.quantity_change} {item.unit}
          </span>
        );
      },
    },
    {
      key: "quantity_after",
      header: t("transactions.balance"),
      render: (item) => (
        <span className="text-muted-foreground">
          {item.quantity_after} {item.unit}
        </span>
      ),
    },
    {
      key: "source_type",
      header: t("transactions.source"),
      render: (item) => {
        if (!item.source_type) return <span className="text-muted-foreground">-</span>;
        const icon = SOURCE_TYPE_ICONS[item.source_type] || <Package className="h-3.5 w-3.5" />;
        return (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {icon}
            <span>{t(`transactions.sources.${item.source_type}`)}</span>
          </div>
        );
      },
    },
    {
      key: "notes",
      header: t("transactions.notes"),
      render: (item) =>
        item.notes ? (
          <span className="text-sm text-muted-foreground truncate max-w-[200px]" title={item.notes}>
            {item.notes}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as PantryTransactionType | "all")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("transactions.allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("transactions.allTypes")}</SelectItem>
              <SelectItem value="add">{t("transactions.types.add")}</SelectItem>
              <SelectItem value="deduct">{t("transactions.types.deduct")}</SelectItem>
              <SelectItem value="adjust">{t("transactions.types.adjust")}</SelectItem>
              <SelectItem value="waste">{t("transactions.types.waste")}</SelectItem>
              <SelectItem value="expire">{t("transactions.types.expire")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("transactions.allSources")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("transactions.allSources")}</SelectItem>
            <SelectItem value="manual">{t("transactions.sources.manual")}</SelectItem>
            <SelectItem value="meal">{t("transactions.sources.meal")}</SelectItem>
            <SelectItem value="grocery">{t("transactions.sources.grocery")}</SelectItem>
            <SelectItem value="waste">{t("transactions.sources.waste")}</SelectItem>
            <SelectItem value="expiry">{t("transactions.sources.expiry")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : data && data.items.length > 0 ? (
        <DataTable
          items={data.items}
          columns={columns}
          isLoading={isLoading}
          pagination={{
            page: filters.page || 1,
            totalPages: data.total_pages,
            total: data.total,
          }}
          onPageChange={handlePageChange}
          texts={{
            loading: tCommon("loading"),
            pageInfo: (page, totalPages, total) =>
              t("transactions.pageInfo", { page, totalPages, total }),
            previous: tCommon("previous"),
            next: tCommon("next"),
          }}
        />
      ) : (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title={t("transactions.empty.title")}
          description={t("transactions.empty.description")}
        />
      )}
    </div>
  );
}
