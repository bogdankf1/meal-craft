"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Plus, ShoppingCart, Check, Minus, Package, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { useGetPantryItemsQuery } from "@/lib/api/pantry-api";
import { useGetGroceriesQuery } from "@/lib/api/groceries-api";
import { type RecipeIngredient } from "@/lib/api/recipes-api";
import { cn } from "@/lib/utils";

// Common words to ignore when matching ingredients
const STOP_WORDS = new Set([
  "fresh", "dried", "ground", "chopped", "minced", "sliced", "diced",
  "whole", "large", "small", "medium", "extra", "virgin", "organic",
  "raw", "cooked", "frozen", "canned", "packed", "light", "dark",
  "unsalted", "salted", "sweet", "sour", "hot", "cold", "warm",
  "boneless", "skinless", "lean", "fat", "free", "low", "high",
  "fine", "coarse", "thick", "thin", "ripe", "unripe", "peeled",
  "pitted", "seeded", "seedless", "plain", "pure", "natural",
  "for", "of", "the", "a", "an", "to", "and", "or", "with",
]);

// Normalize text for comparison
function normalizeText(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

// Extract significant words from a name (excluding stop words)
function getSignificantWords(name: string): string[] {
  const normalized = normalizeText(name);
  return normalized
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

// Check if two ingredient names match
function ingredientsMatch(
  ingredientName: string,
  inventoryItemName: string
): boolean {
  const normalizedIngredient = normalizeText(ingredientName);
  const normalizedItem = normalizeText(inventoryItemName);

  // Exact match
  if (normalizedIngredient === normalizedItem) {
    return true;
  }

  const ingredientWords = getSignificantWords(ingredientName);
  const itemWords = getSignificantWords(inventoryItemName);

  // If item has no significant words, skip it
  if (itemWords.length === 0) {
    return false;
  }

  // All words from the inventory item must appear in the ingredient name
  const allItemWordsInIngredient = itemWords.every((itemWord) =>
    ingredientWords.some(
      (ingWord) =>
        ingWord === itemWord ||
        ingWord === itemWord + "s" ||
        ingWord === itemWord + "es" ||
        itemWord === ingWord + "s" ||
        itemWord === ingWord + "es"
    )
  );

  if (allItemWordsInIngredient) {
    return true;
  }

  // Check if single ingredient word matches last item word
  if (ingredientWords.length === 1 && itemWords.length > 0) {
    const singleWord = ingredientWords[0];
    const lastItemWord = itemWords[itemWords.length - 1];
    if (
      lastItemWord === singleWord ||
      lastItemWord === singleWord + "s" ||
      lastItemWord === singleWord + "es" ||
      singleWord === lastItemWord + "s" ||
      singleWord === lastItemWord + "es"
    ) {
      return true;
    }
  }

  return false;
}

interface InventoryItem {
  item_name: string;
  quantity: number | null;
  unit: string | null;
}

interface IngredientAvailability {
  source: "pantry" | "grocery" | null;
  availableQuantity: number | null;
  availableUnit: string | null;
  isSufficient: boolean;
  needsMore: number | null; // How much more is needed
}

// Find matching item in inventory and check quantity
function checkIngredientAvailability(
  ingredientName: string,
  requiredQuantity: number | null,
  requiredUnit: string | null,
  pantryItems: InventoryItem[],
  groceryItems: InventoryItem[]
): IngredientAvailability {
  // First check pantry
  for (const item of pantryItems) {
    if (ingredientsMatch(ingredientName, item.item_name)) {
      const isSufficient = checkQuantitySufficient(
        requiredQuantity,
        requiredUnit,
        item.quantity,
        item.unit
      );
      return {
        source: "pantry",
        availableQuantity: item.quantity,
        availableUnit: item.unit,
        isSufficient,
        needsMore: isSufficient ? null : calculateNeeded(requiredQuantity, item.quantity),
      };
    }
  }

  // Then check groceries
  for (const item of groceryItems) {
    if (ingredientsMatch(ingredientName, item.item_name)) {
      const isSufficient = checkQuantitySufficient(
        requiredQuantity,
        requiredUnit,
        item.quantity,
        item.unit
      );
      return {
        source: "grocery",
        availableQuantity: item.quantity,
        availableUnit: item.unit,
        isSufficient,
        needsMore: isSufficient ? null : calculateNeeded(requiredQuantity, item.quantity),
      };
    }
  }

  // Not found
  return {
    source: null,
    availableQuantity: null,
    availableUnit: null,
    isSufficient: false,
    needsMore: requiredQuantity,
  };
}

// Check if available quantity is sufficient
function checkQuantitySufficient(
  requiredQty: number | null,
  requiredUnit: string | null,
  availableQty: number | null,
  availableUnit: string | null
): boolean {
  // If no quantity required, just having the item is enough
  if (requiredQty === null) {
    return true;
  }

  // If we don't know how much we have, assume insufficient
  if (availableQty === null) {
    return false;
  }

  // If units match or are compatible, compare quantities
  // For simplicity, if units don't match, we assume the user needs to decide
  const unitsMatch =
    !requiredUnit ||
    !availableUnit ||
    normalizeUnit(requiredUnit) === normalizeUnit(availableUnit);

  if (unitsMatch) {
    return availableQty >= requiredQty;
  }

  // Units don't match - assume insufficient to be safe
  return false;
}

// Normalize unit names
function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim();
  const unitMap: Record<string, string> = {
    "piece": "pcs", "pieces": "pcs", "pcs": "pcs", "pc": "pcs",
    "gram": "g", "grams": "g", "g": "g",
    "kilogram": "kg", "kilograms": "kg", "kg": "kg",
    "liter": "l", "liters": "l", "l": "l", "litre": "l", "litres": "l",
    "milliliter": "ml", "milliliters": "ml", "ml": "ml",
    "tablespoon": "tbsp", "tablespoons": "tbsp", "tbsp": "tbsp",
    "teaspoon": "tsp", "teaspoons": "tsp", "tsp": "tsp",
    "cup": "cup", "cups": "cup",
    "ounce": "oz", "ounces": "oz", "oz": "oz",
    "pound": "lb", "pounds": "lb", "lb": "lb", "lbs": "lb",
  };
  return unitMap[normalized] || normalized;
}

// Calculate how much more is needed
function calculateNeeded(required: number | null, available: number | null): number | null {
  if (required === null) return null;
  if (available === null) return required;
  return Math.max(0, required - available);
}

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

  const initialListName = useMemo(
    () => `${recipeName} - ${new Date().toLocaleDateString()}`,
    [recipeName]
  );

  const [selectedListId, setSelectedListId] = useState<string>("");
  const [createNew, setCreateNew] = useState(false);
  const [newListName, setNewListName] = useState(initialListName);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string> | null>(null);
  const [scaleFactor, setScaleFactor] = useState(1);

  // Fetch inventory data
  const { data: pantryData } = useGetPantryItemsQuery(
    { page: 1, per_page: 100 },
    { skip: !open }
  );

  const { data: groceriesData } = useGetGroceriesQuery(
    { page: 1, per_page: 100 },
    { skip: !open }
  );

  const { data: shoppingLists, isLoading: isLoadingLists } = useGetShoppingListsQuery({
    is_archived: false,
    status: "active",
    per_page: 50,
  });

  // Compute ingredient availability
  const pantryItems = pantryData?.items;
  const groceryItems = groceriesData?.items;

  const ingredientAvailabilityMap = useMemo(() => {
    const map = new Map<string, IngredientAvailability>();
    const pantry: InventoryItem[] = (pantryItems || []).map((item) => ({
      item_name: item.item_name,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
    }));
    const grocery: InventoryItem[] = (groceryItems || []).map((item) => ({
      item_name: item.item_name,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
    }));

    for (const ingredient of ingredients) {
      const scaledQuantity = ingredient.quantity
        ? ingredient.quantity * scaleFactor
        : null;
      const availability = checkIngredientAvailability(
        ingredient.ingredient_name,
        scaledQuantity,
        ingredient.unit ?? null,
        pantry,
        grocery
      );
      map.set(ingredient.id, availability);
    }

    return map;
  }, [ingredients, pantryItems, groceryItems, scaleFactor]);

  // Compute which ingredients need to be purchased (missing or insufficient)
  const missingIngredientIds = useMemo(() => {
    const missing = new Set<string>();
    for (const ingredient of ingredients) {
      const availability = ingredientAvailabilityMap.get(ingredient.id);
      if (!availability || !availability.isSufficient) {
        missing.add(ingredient.id);
      }
    }
    return missing;
  }, [ingredients, ingredientAvailabilityMap]);

  const [createList, { isLoading: isCreating }] = useCreateShoppingListMutation();
  const [addItems, { isLoading: isAdding }] = useAddItemsToListMutation();

  const isLoading = isCreating || isAdding;

  // Check if inventory data has loaded
  const dataLoaded = pantryItems !== undefined && groceryItems !== undefined;

  // Reset state when dialog opens/closes via onOpenChange wrapper
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset state when opening
      setScaleFactor(1);
      setSelectedListId("");
      setCreateNew(false);
      setNewListName(`${recipeName} - ${new Date().toLocaleDateString()}`);
      // Set to null to indicate we need initialization
      setSelectedIngredients(null);
    }
    onOpenChange(newOpen);
  };

  // Initialize selection when data loads and selection is null
  // This is the single source of truth for initialization
  if (open && selectedIngredients === null && dataLoaded) {
    setSelectedIngredients(new Set(missingIngredientIds));
  }

  // Ensure we have a valid Set for rendering (use empty set while loading)
  const effectiveSelectedIngredients = selectedIngredients ?? new Set<string>();


  const handleToggleIngredient = (ingredientId: string) => {
    setSelectedIngredients((prev) => {
      const newSet = new Set(prev ?? []);
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
    if (effectiveSelectedIngredients.size === 0) {
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
        .filter((ing) => effectiveSelectedIngredients.has(ing.id))
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
                {ingredients.map((ingredient) => {
                  const availability = ingredientAvailabilityMap.get(ingredient.id);
                  const isSufficient = availability?.isSufficient ?? false;
                  const source = availability?.source;

                  return (
                    <div
                      key={ingredient.id}
                      className={cn(
                        "flex items-center space-x-3 p-2 rounded-md",
                        isSufficient
                          ? "bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50"
                          : "hover:bg-muted",
                        source && !isSufficient && "bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50"
                      )}
                    >
                      <Checkbox
                        id={ingredient.id}
                        checked={effectiveSelectedIngredients.has(ingredient.id)}
                        onCheckedChange={() => handleToggleIngredient(ingredient.id)}
                      />
                      <label
                        htmlFor={ingredient.id}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className={cn(
                              "font-medium",
                              isSufficient && "text-green-700 dark:text-green-300"
                            )}>
                              {ingredient.ingredient_name}
                            </span>
                            {ingredient.quantity && (
                              <span className="text-muted-foreground ml-2">
                                {getScaledQuantity(ingredient.quantity)}
                                {ingredient.unit && ` ${ingredient.unit}`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {isSufficient && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  source === "pantry"
                                    ? "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                                    : "border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300"
                                )}
                              >
                                {source === "pantry" ? (
                                  <>
                                    <Package className="h-3 w-3 mr-1" />
                                    {availability?.availableQuantity ?? "✓"}
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="h-3 w-3 mr-1" />
                                    {availability?.availableQuantity ?? "✓"}
                                  </>
                                )}
                              </Badge>
                            )}
                            {source && !isSufficient && availability?.needsMore && (
                              <Badge
                                variant="outline"
                                className="text-xs border-yellow-400 text-yellow-700 dark:border-yellow-600 dark:text-yellow-300"
                              >
                                {t("addToShoppingList.needMore", { count: availability.needsMore })}
                              </Badge>
                            )}
                            {!source && (
                              <Badge
                                variant="outline"
                                className="text-xs border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"
                              >
                                {t("addToShoppingList.missing")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {t("addToShoppingList.selectedCount", { count: effectiveSelectedIngredients.size, total: ingredients.length })}
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
            disabled={isLoading || effectiveSelectedIngredients.size === 0 || (!selectedListId && !createNew) || (createNew && !newListName.trim())}
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
