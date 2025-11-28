"use client";

import { useState, useMemo, ReactNode } from "react";
import {
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Generic type for items with an ID
export interface DataTableItem {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Column definition
export interface DataTableColumn<T extends DataTableItem> {
  key: string;
  header: string;
  width?: string;
  render: (item: T) => ReactNode;
}

// Bulk action definition
export interface BulkAction {
  label: string;
  icon?: ReactNode;
  variant?: "default" | "outline" | "destructive";
  onClick: (ids: string[]) => Promise<void>;
  isLoading?: boolean;
}

// Row action definition
export interface RowAction<T extends DataTableItem> {
  label: string;
  icon?: ReactNode;
  onClick: (item: T) => void;
  variant?: "default" | "destructive";
  separator?: boolean;
}

// Pagination info
export interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
}

// Props for the DataTable component
export interface DataTableProps<T extends DataTableItem> {
  items: T[];
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;

  // Selection
  selectable?: boolean;

  // Bulk actions
  bulkActions?: BulkAction[];
  emptySelectionText?: string;

  // Row actions
  rowActions?: RowAction<T>[];

  // Delete confirmation
  deleteConfig?: {
    getItemName: (item: T) => string;
    onDelete: (item: T) => Promise<void>;
    isDeleting?: boolean;
    title?: string;
    description?: string;
  };

  // Translations/text
  texts?: {
    loading?: string;
    selectedCount?: (count: number) => string;
    itemsOnPage?: (count: number) => string;
    selectToAction?: string;
    pageInfo?: (page: number, totalPages: number, total: number) => string;
    previous?: string;
    next?: string;
    deleteTitle?: string;
    deleteDescription?: (name: string) => string;
    cancel?: string;
    delete?: string;
    deleting?: string;
  };
}

const defaultTexts = {
  loading: "Loading...",
  selectedCount: (count: number) => `${count} item(s) selected`,
  itemsOnPage: (count: number) => `${count} ${count === 1 ? "item" : "items"} on this page`,
  selectToAction: "Select items to archive or delete",
  pageInfo: (page: number, totalPages: number, total: number) =>
    `Page ${page} of ${totalPages} (${total} items)`,
  previous: "Previous",
  next: "Next",
  deleteTitle: "Delete Item",
  deleteDescription: (name: string) => `Are you sure you want to delete "${name}"? This action cannot be undone.`,
  cancel: "Cancel",
  delete: "Delete",
  deleting: "Deleting...",
};

export function DataTable<T extends DataTableItem>({
  items,
  columns,
  isLoading = false,
  pagination,
  onPageChange,
  selectable = true,
  bulkActions = [],
  emptySelectionText,
  rowActions = [],
  deleteConfig,
  texts: customTexts = {},
}: DataTableProps<T>) {
  const texts = { ...defaultTexts, ...customTexts };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  // Get the set of valid item IDs for filtering selection
  const validItemIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);

  // Filter selected IDs to only include valid ones (items still in the list)
  const validSelectedIds = useMemo(
    () => selectedIds.filter((id) => validItemIds.has(id)),
    [selectedIds, validItemIds]
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(items.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...validSelectedIds, id]);
    } else {
      setSelectedIds(validSelectedIds.filter((i) => i !== id));
    }
  };

  const handleBulkAction = async (action: BulkAction) => {
    if (validSelectedIds.length === 0) return;
    await action.onClick(validSelectedIds);
    setSelectedIds([]);
  };

  const handleDeleteClick = (item: T) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !deleteConfig) return;
    await deleteConfig.onDelete(itemToDelete);
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{texts.loading}</div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const hasSelection = validSelectedIds.length > 0;
  const showBulkActions = selectable && bulkActions.length > 0;

  return (
    <div className="space-y-4">
      {/* Selection bar */}
      {showBulkActions && (
        <div className="flex items-center gap-2 px-3 h-12 bg-muted/50 rounded-lg">
          {hasSelection ? (
            <>
              <span className="text-sm font-medium">
                {texts.selectedCount(validSelectedIds.length)}
              </span>
              <div className="flex-1" />
              {bulkActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || "outline"}
                  size="sm"
                  onClick={() => handleBulkAction(action)}
                  disabled={action.isLoading}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                {texts.itemsOnPage(items.length)}
              </span>
              <div className="flex-1" />
              <span className="text-sm text-muted-foreground">
                {emptySelectionText || texts.selectToAction}
              </span>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={items.length > 0 && validSelectedIds.length === items.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={column.key} className={column.width}>
                  {column.header}
                </TableHead>
              ))}
              {rowActions.length > 0 && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                {selectable && (
                  <TableCell>
                    <Checkbox
                      checked={validSelectedIds.includes(item.id)}
                      onCheckedChange={(checked) =>
                        handleSelectItem(item.id, checked as boolean)
                      }
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.key}>{column.render(item)}</TableCell>
                ))}
                {rowActions.length > 0 && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {rowActions.map((action, index) => (
                          <div key={index}>
                            {action.separator && index > 0 && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              className={action.variant === "destructive" ? "text-destructive" : ""}
                              onClick={() => {
                                if (action.variant === "destructive" && deleteConfig) {
                                  handleDeleteClick(item);
                                } else {
                                  action.onClick(item);
                                }
                              }}
                            >
                              {action.icon}
                              {action.label}
                            </DropdownMenuItem>
                          </div>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {texts.pageInfo(pagination.page, pagination.totalPages, pagination.total)}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              {texts.previous}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              {texts.next}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfig && (
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{deleteConfig.title || texts.deleteTitle}</DialogTitle>
              <DialogDescription>
                {itemToDelete
                  ? (deleteConfig.description || texts.deleteDescription(deleteConfig.getItemName(itemToDelete)))
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                {texts.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteConfig.isDeleting}
              >
                {deleteConfig.isDeleting ? texts.deleting : texts.delete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
