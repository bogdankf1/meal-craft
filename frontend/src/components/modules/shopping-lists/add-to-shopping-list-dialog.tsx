"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Plus, ShoppingCart, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetShoppingListsQuery,
  useCreateShoppingListMutation,
  useAddItemsToListMutation,
  type CreateShoppingListItemInput,
  type ShoppingListItemCategory,
  SHOPPING_LIST_CATEGORIES,
} from "@/lib/api/shopping-lists-api";

// Valid categories set for quick lookup
const VALID_CATEGORIES = new Set<string>(
  SHOPPING_LIST_CATEGORIES.map((c) => c.value)
);

// Validate and normalize category - returns valid category or null
function normalizeCategory(category: string | null | undefined): ShoppingListItemCategory | null {
  if (!category) return null;
  const lower = category.toLowerCase();
  if (VALID_CATEGORIES.has(lower)) {
    return lower as ShoppingListItemCategory;
  }
  // Invalid category, return "other" as fallback
  return "other";
}

interface AddToShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: {
    name: string;
    quantity?: number | null;
    unit?: string | null;
    category?: string | null;
  }[];
  onSuccess?: () => void;
}

export function AddToShoppingListDialog({
  open,
  onOpenChange,
  items,
  onSuccess,
}: AddToShoppingListDialogProps) {
  const t = useTranslations("shoppingLists");
  const tCommon = useTranslations("common");

  const [selectedListId, setSelectedListId] = useState<string>("");
  const [createNewList, setCreateNewList] = useState(false);
  const [newListName, setNewListName] = useState("");

  const { data: listsData, isLoading: isLoadingLists } = useGetShoppingListsQuery({
    is_archived: false,
    status: "active",
    per_page: 50,
  });

  const [createList, { isLoading: isCreating }] = useCreateShoppingListMutation();
  const [addItems, { isLoading: isAdding }] = useAddItemsToListMutation();

  const isLoading = isCreating || isAdding;

  const activeLists = listsData?.items || [];

  // Handle dialog open/close with state reset
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      // Reset state when dialog opens
      setSelectedListId("");
      setCreateNewList(false);
      setNewListName("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    try {
      let targetListId = selectedListId;

      // Create new list if needed
      if (createNewList) {
        if (!newListName.trim()) {
          toast.error(t("addToList.enterListName"));
          return;
        }
        const newList = await createList({
          name: newListName.trim(),
        }).unwrap();
        targetListId = newList.id;
      }

      if (!targetListId) {
        toast.error(t("addToList.selectOrCreate"));
        return;
      }

      // Add items to the list
      const shoppingItems: CreateShoppingListItemInput[] = items.map((item) => ({
        ingredient_name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: normalizeCategory(item.category),
      }));

      await addItems({
        listId: targetListId,
        items: shoppingItems,
      }).unwrap();

      toast.success(
        t("addToList.success", { count: items.length })
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(t("addToList.error"));
      console.error("Error adding to shopping list:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t("addToList.title")}
          </DialogTitle>
          <DialogDescription>
            {t("addToList.description", { count: items.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Items preview */}
          <div className="rounded-md border p-3 bg-muted/50">
            <p className="text-sm font-medium mb-2">{t("addToList.itemsToAdd")}:</p>
            <div className="flex flex-wrap gap-1">
              {items.slice(0, 5).map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md bg-background text-xs"
                >
                  {item.name}
                  {item.quantity && ` (${item.quantity}${item.unit ? ` ${item.unit}` : ""})`}
                </span>
              ))}
              {items.length > 5 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-background text-xs text-muted-foreground">
                  +{items.length - 5} {t("addToList.more")}
                </span>
              )}
            </div>
          </div>

          {/* List selection */}
          <div className="space-y-3">
            <Label>{t("addToList.selectList")}</Label>

            {isLoadingLists ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                {tCommon("loading")}
              </div>
            ) : (
              <RadioGroup
                value={createNewList ? "new" : selectedListId}
                onValueChange={(value) => {
                  if (value === "new") {
                    setCreateNewList(true);
                    setSelectedListId("");
                  } else {
                    setCreateNewList(false);
                    setSelectedListId(value);
                  }
                }}
              >
                <ScrollArea className="h-[200px] rounded-md border p-2">
                  <div className="space-y-2">
                    {/* Create new list option */}
                    <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                      <RadioGroupItem value="new" id="new-list" />
                      <Label
                        htmlFor="new-list"
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <Plus className="h-4 w-4 text-primary" />
                        <span className="text-primary font-medium">
                          {t("addToList.createNew")}
                        </span>
                      </Label>
                    </div>

                    {activeLists.length > 0 && (
                      <div className="border-t my-2" />
                    )}

                    {/* Existing lists */}
                    {activeLists.map((list) => (
                      <div
                        key={list.id}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted"
                      >
                        <RadioGroupItem value={list.id} id={list.id} />
                        <Label
                          htmlFor={list.id}
                          className="flex items-center justify-between cursor-pointer flex-1"
                        >
                          <span>{list.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {list.total_items} {t("addToList.items")}
                          </span>
                        </Label>
                      </div>
                    ))}

                    {activeLists.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("addToList.noLists")}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </RadioGroup>
            )}
          </div>

          {/* New list name input */}
          {createNewList && (
            <div className="space-y-2">
              <Label htmlFor="new-list-name">{t("addToList.newListName")}</Label>
              <Input
                id="new-list-name"
                placeholder={t("form.namePlaceholder")}
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (!selectedListId && !createNewList) || (createNewList && !newListName.trim())}
          >
            {isLoading ? (
              t("addToList.adding")
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {t("addToList.addButton")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
