"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Plus, ShoppingCart, Check, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/lib/api/shopping-lists-api";
import { type RecipeIngredient } from "@/lib/api/recipes-api";

interface AddToShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeName: string;
  ingredients: RecipeIngredient[];
  servings?: number;
  onSuccess?: () => void;
}

export function AddToShoppingListDialog({
  open,
  onOpenChange,
  recipeName,
  ingredients,
  servings,
  onSuccess,
}: AddToShoppingListDialogProps) {
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");

  // Compute initial values based on current props
  const initialIngredientIds = useMemo(
    () => new Set(ingredients.map((ing) => ing.id)),
    [ingredients]
  );
  const initialListName = useMemo(
    () => `${recipeName} - ${new Date().toLocaleDateString()}`,
    [recipeName]
  );

  const [selectedListId, setSelectedListId] = useState<string>("");
  const [createNew, setCreateNew] = useState(false);
  const [newListName, setNewListName] = useState(initialListName);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(initialIngredientIds);
  const [scaleFactor, setScaleFactor] = useState(1);

  const { data: shoppingLists, isLoading: isLoadingLists } = useGetShoppingListsQuery({
    is_archived: false,
    status: "active",
    per_page: 50,
  });

  const [createList, { isLoading: isCreating }] = useCreateShoppingListMutation();
  const [addItems, { isLoading: isAdding }] = useAddItemsToListMutation();

  const isLoading = isCreating || isAdding;

  // Reset state when dialog opens/closes via onOpenChange wrapper
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset state when opening
      setSelectedIngredients(new Set(ingredients.map((ing) => ing.id)));
      setScaleFactor(1);
      setSelectedListId("");
      setCreateNew(false);
      setNewListName(`${recipeName} - ${new Date().toLocaleDateString()}`);
    }
    onOpenChange(newOpen);
  };

  const handleToggleIngredient = (ingredientId: string) => {
    setSelectedIngredients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedIngredients(new Set(ingredients.map((ing) => ing.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIngredients(new Set());
  };

  const handleSubmit = async () => {
    if (selectedIngredients.size === 0) {
      toast.error(t("addToShoppingList.selectIngredients"));
      return;
    }

    try {
      let targetListId = selectedListId;

      // Create new list if needed
      if (createNew) {
        if (!newListName.trim()) {
          toast.error(t("addToShoppingList.enterListName"));
          return;
        }
        const newList = await createList({
          name: newListName.trim(),
        }).unwrap();
        targetListId = newList.id;
      }

      if (!targetListId) {
        toast.error(t("addToShoppingList.selectOrCreate"));
        return;
      }

      // Prepare items to add
      const itemsToAdd: CreateShoppingListItemInput[] = ingredients
        .filter((ing) => selectedIngredients.has(ing.id))
        .map((ing) => ({
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity ? ing.quantity * scaleFactor : null,
          unit: ing.unit,
          category: ing.category as ShoppingListItemCategory | null,
        }));

      // Add items to the list
      await addItems({
        listId: targetListId,
        items: itemsToAdd,
      }).unwrap();

      toast.success(t("addToShoppingList.success", { count: itemsToAdd.length }));
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(t("addToShoppingList.error"));
      console.error("Error adding to shopping list:", error);
    }
  };

  const getScaledQuantity = (quantity: number | null) => {
    if (!quantity) return null;
    const scaled = quantity * scaleFactor;
    return scaled % 1 === 0 ? scaled : scaled.toFixed(2);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t("addToShoppingList.title")}
          </DialogTitle>
          <DialogDescription>
            {t("addToShoppingList.description", { name: recipeName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Scale selector */}
          {servings && (
            <div className="space-y-2">
              <Label>{t("addToShoppingList.scale")}</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setScaleFactor(Math.max(0.5, scaleFactor - 0.5))}
                  disabled={scaleFactor <= 0.5}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">
                  <span className="text-lg font-medium">{scaleFactor}x</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({Math.round(servings * scaleFactor)} {t("addToShoppingList.servings")})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setScaleFactor(scaleFactor + 0.5)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Ingredients selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("addToShoppingList.ingredients")}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {tCommon("selectAll")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                >
                  {tCommon("deselectAll")}
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[200px] rounded-md border p-3">
              <div className="space-y-2">
                {ingredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted"
                  >
                    <Checkbox
                      id={ingredient.id}
                      checked={selectedIngredients.has(ingredient.id)}
                      onCheckedChange={() => handleToggleIngredient(ingredient.id)}
                    />
                    <label
                      htmlFor={ingredient.id}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <span className="font-medium">{ingredient.ingredient_name}</span>
                      {ingredient.quantity && (
                        <span className="text-muted-foreground ml-2">
                          {getScaledQuantity(ingredient.quantity)}
                          {ingredient.unit && ` ${ingredient.unit}`}
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {t("addToShoppingList.selectedCount", { count: selectedIngredients.size, total: ingredients.length })}
            </p>
          </div>

          {/* Shopping list selection */}
          <div className="space-y-2">
            <Label>{t("addToShoppingList.selectList")}</Label>

            {isLoadingLists ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                {tCommon("loading")}
              </div>
            ) : (
              <RadioGroup
                value={createNew ? "new" : selectedListId}
                onValueChange={(value) => {
                  if (value === "new") {
                    setCreateNew(true);
                    setSelectedListId("");
                  } else {
                    setCreateNew(false);
                    setSelectedListId(value);
                  }
                }}
              >
                <ScrollArea className="h-[150px] rounded-md border p-2">
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
                          {t("addToShoppingList.createNew")}
                        </span>
                      </Label>
                    </div>

                    {shoppingLists && shoppingLists.items.length > 0 && (
                      <div className="border-t my-2" />
                    )}

                    {/* Existing lists */}
                    {shoppingLists?.items.map((list) => (
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
                            {list.total_items} {t("addToShoppingList.items")}
                          </span>
                        </Label>
                      </div>
                    ))}

                    {(!shoppingLists || shoppingLists.items.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        {t("addToShoppingList.noLists")}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </RadioGroup>
            )}
          </div>

          {/* New list name input */}
          {createNew && (
            <div className="space-y-2">
              <Label htmlFor="new-list-name">{t("addToShoppingList.newListName")}</Label>
              <Input
                id="new-list-name"
                placeholder={t("addToShoppingList.listNamePlaceholder")}
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
            disabled={isLoading || selectedIngredients.size === 0 || (!selectedListId && !createNew) || (createNew && !newListName.trim())}
          >
            {isLoading ? (
              t("addToShoppingList.adding")
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {t("addToShoppingList.addButton")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
