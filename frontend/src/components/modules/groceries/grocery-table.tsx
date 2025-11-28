"use client";

import { useState, useMemo } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Grocery | null>(null);

  const [deleteGrocery, { isLoading: isDeleting }] = useDeleteGroceryMutation();
  const [bulkDelete, { isLoading: isBulkDeleting }] =
    useBulkDeleteGroceriesMutation();
  const [bulkArchive, { isLoading: isBulkArchiving }] =
    useBulkArchiveGroceriesMutation();
  const [bulkUnarchive, { isLoading: isBulkUnarchiving }] =
    useBulkUnarchiveGroceriesMutation();

  const items = data?.items || [];
  const totalPages = data?.total_pages || 1;

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

  const handleDelete = async (grocery: Grocery) => {
    setItemToDelete(grocery);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteGrocery(itemToDelete.id).unwrap();
      toast.success("Grocery item deleted");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error("Failed to delete grocery item");
    }
  };

  const handleBulkDelete = async () => {
    if (validSelectedIds.length === 0) return;

    try {
      const result = await bulkDelete(validSelectedIds).unwrap();
      toast.success(result.message);
      setSelectedIds([]);
    } catch (error) {
      toast.error("Failed to delete selected items");
    }
  };

  const handleBulkArchive = async () => {
    if (validSelectedIds.length === 0) return;

    try {
      const result = await bulkArchive(validSelectedIds).unwrap();
      toast.success(result.message);
      setSelectedIds([]);
    } catch (error) {
      toast.error("Failed to archive selected items");
    }
  };

  const handleBulkUnarchive = async () => {
    if (validSelectedIds.length === 0) return;

    try {
      const result = await bulkUnarchive(validSelectedIds).unwrap();
      toast.success(result.message);
      setSelectedIds([]);
    } catch (error) {
      toast.error("Failed to unarchive selected items");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading groceries...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Will show empty state instead
  }

  const hasSelection = validSelectedIds.length > 0;

  return (
    <div className="space-y-4">
      {/* Selection bar - shows count when nothing selected, actions when items selected */}
      <div className="flex items-center gap-2 px-3 h-12 bg-muted/50 rounded-lg">
        {hasSelection ? (
          <>
            <span className="text-sm font-medium">
              {validSelectedIds.length} item(s) selected
            </span>
            <div className="flex-1" />
            {isArchiveView ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkUnarchive}
                disabled={isBulkUnarchiving}
              >
                <ArchiveRestore className="h-4 w-4 mr-1" />
                Unarchive
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkArchive}
                disabled={isBulkArchiving}
              >
                <Archive className="h-4 w-4 mr-1" />
                Archive
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"} on this page
            </span>
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground">
              Select items to archive or delete
            </span>
          </>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    items.length > 0 && validSelectedIds.length === items.length
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Store</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((grocery) => {
              const { status: expiryStatus, daysUntil } = getExpiryStatus(
                grocery.expiry_date
              );

              return (
                <TableRow key={grocery.id}>
                  <TableCell>
                    <Checkbox
                      checked={validSelectedIds.includes(grocery.id)}
                      onCheckedChange={(checked) =>
                        handleSelectItem(grocery.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {grocery.item_name}
                  </TableCell>
                  <TableCell>
                    {grocery.category && (
                      <Badge
                        variant="secondary"
                        className={getCategoryBadgeColor(grocery.category)}
                      >
                        {grocery.category}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {grocery.quantity !== null && (
                      <span>
                        {grocery.quantity}
                        {grocery.unit && ` ${grocery.unit}`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(parseISO(grocery.purchase_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {grocery.expiry_date ? (
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
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {grocery.cost !== null ? `$${grocery.cost.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>{grocery.store || "-"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(grocery)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(grocery)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({data?.total} items)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Grocery Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{itemToDelete?.item_name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
