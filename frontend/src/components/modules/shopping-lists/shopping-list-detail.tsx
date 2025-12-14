"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Plus,
  CheckCircle,
  Circle,
  Pencil,
  Trash2,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useGetShoppingListQuery,
  useUpdateShoppingListMutation,
  useToggleItemsPurchasedMutation,
  useDeleteShoppingListItemMutation,
  type ShoppingListItem,
} from "@/lib/api/shopping-lists-api";
import { ShoppingListItemForm } from "./shopping-list-item-form";
import { useCurrency } from "@/components/providers/currency-provider";

interface ShoppingListDetailProps {
  listId: string;
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

export function ShoppingListDetail({ listId }: ShoppingListDetailProps) {
  const router = useRouter();
  const t = useTranslations("shoppingLists");
  const tGroceries = useTranslations("groceries");
  const tCommon = useTranslations("common");
  const { formatPriceFromUAH } = useCurrency();

  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ShoppingListItem | null>(null);

  const { data: list, isLoading, refetch } = useGetShoppingListQuery(listId);
  const [updateList, { isLoading: isUpdating }] = useUpdateShoppingListMutation();
  const [toggleItems] = useToggleItemsPurchasedMutation();
  const [deleteItem, { isLoading: isDeleting }] = useDeleteShoppingListItemMutation();

  const handleToggleItem = async (item: ShoppingListItem) => {
    try {
      await toggleItems({
        listId,
        data: {
          item_ids: [item.id],
          is_purchased: !item.is_purchased,
        },
      }).unwrap();
    } catch {
      toast.error(t("messages.errorTogglingItem"));
    }
  };

  const handleMarkAllPurchased = async () => {
    if (!list) return;
    const unpurchasedIds = list.items
      .filter((item) => !item.is_purchased)
      .map((item) => item.id);

    if (unpurchasedIds.length === 0) return;

    try {
      await toggleItems({
        listId,
        data: {
          item_ids: unpurchasedIds,
          is_purchased: true,
        },
      }).unwrap();
      toast.success(t("messages.allItemsMarked"));
    } catch {
      toast.error(t("messages.errorMarkingAll"));
    }
  };

  const handleCompleteList = async () => {
    try {
      await updateList({
        id: listId,
        data: { status: "completed" },
      }).unwrap();
      toast.success(t("messages.listCompleted"));
    } catch {
      toast.error(t("messages.errorCompleting"));
    }
  };

  const handleEditItem = (item: ShoppingListItem) => {
    setEditingItem(item);
    setItemFormOpen(true);
  };

  const handleDeleteItem = (item: ShoppingListItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      await deleteItem({
        listId,
        itemId: itemToDelete.id,
      }).unwrap();
      toast.success(t("messages.itemDeleted"));
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch {
      toast.error(t("messages.errorDeletingItem"));
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setItemFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{tCommon("loading")}</div>
      </div>
    );
  }

  const handleBack = () => {
    router.push("/shopping-lists");
  };

  if (!list) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-muted-foreground">{t("detail.notFound")}</p>
        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("detail.backToLists")}
        </Button>
      </div>
    );
  }

  const progress = list.total_items > 0
    ? Math.round((list.purchased_items / list.total_items) * 100)
    : 0;

  const unpurchasedItems = list.items.filter((item) => !item.is_purchased);
  const purchasedItems = list.items.filter((item) => item.is_purchased);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{list.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={list.status === "completed" ? "default" : "secondary"}
              >
                {t(`status.${list.status}`)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {t("detail.createdOn", {
                  date: format(parseISO(list.created_at), "MMM d, yyyy"),
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {list.status === "active" && unpurchasedItems.length > 0 && (
            <Button variant="outline" onClick={handleMarkAllPurchased}>
              <CheckSquare className="h-4 w-4 mr-2" />
              {t("detail.markAllPurchased")}
            </Button>
          )}
          {list.status === "active" && (
            <Button onClick={handleCompleteList} disabled={isUpdating}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {t("detail.completeList")}
            </Button>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {t("detail.progress")}
            </span>
            <span className="text-sm text-muted-foreground">
              {list.purchased_items} / {list.total_items} {t("detail.items")}
            </span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{progress}% {t("detail.complete")}</span>
            {list.estimated_cost && (
              <span>
                {t("detail.estimatedCost")}: {formatPriceFromUAH(list.estimated_cost)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("detail.itemsSection")}</h2>
          <Button onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            {t("detail.addItem")}
          </Button>
        </div>

        {list.items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">{t("detail.noItems")}</p>
              <Button onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-2" />
                {t("detail.addFirstItem")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Unpurchased Items */}
            {unpurchasedItems.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Circle className="h-4 w-4" />
                    {t("detail.toPurchase")} ({unpurchasedItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {unpurchasedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={item.is_purchased}
                        onCheckedChange={() => handleToggleItem(item)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {item.ingredient_name}
                          </span>
                          {item.category && (
                            <Badge
                              variant="secondary"
                              className={getCategoryBadgeColor(item.category)}
                            >
                              {tGroceries(`categories.${item.category}`)}
                            </Badge>
                          )}
                        </div>
                        {(item.quantity || item.unit) && (
                          <span className="text-sm text-muted-foreground">
                            {item.quantity}
                            {item.unit && ` ${item.unit}`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditItem(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Purchased Items */}
            {purchasedItems.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    {t("detail.purchased")} ({purchasedItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {purchasedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                    >
                      <Checkbox
                        checked={item.is_purchased}
                        onCheckedChange={() => handleToggleItem(item)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate line-through text-muted-foreground">
                            {item.ingredient_name}
                          </span>
                          {item.category && (
                            <Badge
                              variant="secondary"
                              className="opacity-60"
                            >
                              {tGroceries(`categories.${item.category}`)}
                            </Badge>
                          )}
                        </div>
                        {(item.quantity || item.unit) && (
                          <span className="text-sm text-muted-foreground">
                            {item.quantity}
                            {item.unit && ` ${item.unit}`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditItem(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Item Form Dialog */}
      <ShoppingListItemForm
        open={itemFormOpen}
        onOpenChange={setItemFormOpen}
        listId={listId}
        editingItem={editingItem}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteItem.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteItem.description", {
                name: itemToDelete?.ingredient_name || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteItem}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("table.deleting") : tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
