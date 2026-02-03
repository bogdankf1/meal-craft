"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Plus, ShoppingCart, Check, Package, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetShoppingListsQuery } from "@/lib/api/shopping-lists-api";
import {
  useGenerateShoppingListMutation,
  useLazyGetShoppingListPreviewQuery,
  type MealPlanListItem,
} from "@/lib/api/meal-planner-api";

interface GenerateShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlan: MealPlanListItem | null;
  onSuccess?: () => void;
}

export function GenerateShoppingListDialog({
  open,
  onOpenChange,
  mealPlan,
  onSuccess,
}: GenerateShoppingListDialogProps) {
  const t = useTranslations("mealPlanner");
  const tCommon = useTranslations("common");

  // Generate default list name based on meal plan
  const getDefaultListName = (plan: MealPlanListItem | null) => {
    if (!plan) return "";
    return `${plan.name} - ${new Date().toLocaleDateString()}`;
  };

  const [selectedListId, setSelectedListId] = useState<string>("");
  const [createNew, setCreateNew] = useState(true);
  const [newListName, setNewListName] = useState(getDefaultListName(mealPlan));
  const [checkPantry, setCheckPantry] = useState(true);
  const [includeLowStock, setIncludeLowStock] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch preview when dialog opens
  const [fetchPreview, { data: previewData, isLoading: isLoadingPreview }] = useLazyGetShoppingListPreviewQuery();

  // Handle dialog open/close with state reset
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen && mealPlan) {
      // Reset state when dialog opens
      setSelectedListId("");
      setCreateNew(true);
      setNewListName(getDefaultListName(mealPlan));
      setCheckPantry(true);
      setIncludeLowStock(false);
      setPreviewOpen(false);
      // Fetch preview
      fetchPreview({ planId: mealPlan.id });
    }
    onOpenChange(newOpen);
  }, [mealPlan, onOpenChange, fetchPreview]);

  const { data: shoppingLists, isLoading: isLoadingLists } = useGetShoppingListsQuery({
    is_archived: false,
    status: "active",
    per_page: 50,
  });

  const [generateShoppingList, { isLoading: isGenerating }] = useGenerateShoppingListMutation();

  const isLoading = isGenerating;

  const handleSubmit = async () => {
    if (!mealPlan) return;

    try {
      const targetListId = selectedListId;

      // Create new list if needed
      if (createNew) {
        if (!newListName.trim()) {
          toast.error(t("generateShoppingList.enterListName"));
          return;
        }
      } else if (!targetListId) {
        toast.error(t("generateShoppingList.selectOrCreate"));
        return;
      }

      const targetListName = createNew ? newListName.trim() : undefined;

      // Generate shopping list from meal plan
      const result = await generateShoppingList({
        meal_plan_id: mealPlan.id,
        shopping_list_id: targetListId || undefined,
        shopping_list_name: targetListName,
        check_pantry: checkPantry,
        include_low_stock: includeLowStock,
      }).unwrap();

      // Build success message with details
      let message = t("generateShoppingList.success", { count: result.items_added });
      if (checkPantry && (result.items_skipped > 0 || result.items_reduced > 0)) {
        const details: string[] = [];
        if (result.items_skipped > 0) {
          details.push(t("generateShoppingList.skippedFromPantry", { count: result.items_skipped }));
        }
        if (result.items_reduced > 0) {
          details.push(t("generateShoppingList.reducedFromPantry", { count: result.items_reduced }));
        }
        message = details.length > 0 ? `${message}. ${details.join(", ")}` : message;
      }

      toast.success(message);
      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(t("generateShoppingList.error"));
      console.error("Error generating shopping list:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t("generateShoppingList.title")}
          </DialogTitle>
          <DialogDescription>
            {t("generateShoppingList.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Meal plan info */}
          {mealPlan && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{t("generateShoppingList.mealPlan")}:</p>
              <p className="text-muted-foreground">{mealPlan.name}</p>
              <p className="text-muted-foreground">
                {t("fields.meals")}: {mealPlan.meal_count} | {t("fields.servings")}: {mealPlan.servings}
              </p>
            </div>
          )}

          {/* Pantry awareness options */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="check-pantry" className="font-medium">
                  {t("generateShoppingList.checkPantry")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("generateShoppingList.checkPantryDescription")}
                </p>
              </div>
              <Switch
                id="check-pantry"
                checked={checkPantry}
                onCheckedChange={setCheckPantry}
              />
            </div>

            {checkPantry && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="include-low-stock" className="font-medium">
                    {t("generateShoppingList.includeLowStock")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("generateShoppingList.includeLowStockDescription")}
                  </p>
                </div>
                <Switch
                  id="include-low-stock"
                  checked={includeLowStock}
                  onCheckedChange={setIncludeLowStock}
                />
              </div>
            )}
          </div>

          {/* Preview section */}
          {checkPantry && (
            <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">{t("generateShoppingList.preview")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {previewData && (
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {previewData.items_to_buy} {t("generateShoppingList.toBuy")}
                        </Badge>
                        {previewData.items_from_pantry > 0 && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            {previewData.items_from_pantry} {t("generateShoppingList.inPantry")}
                          </Badge>
                        )}
                      </div>
                    )}
                    {previewOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3">
                {isLoadingPreview ? (
                  <div className="space-y-2 py-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                  </div>
                ) : previewData && previewData.items.length > 0 ? (
                  <ScrollArea className="h-[150px] border rounded-md">
                    <div className="p-2 space-y-1">
                      {previewData.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1.5 text-sm"
                        >
                          <span className="truncate flex-1">{item.ingredient_name}</span>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            {item.in_pantry > 0 && (
                              <span className="text-xs text-green-600">
                                {item.in_pantry} {item.unit} {t("generateShoppingList.have")}
                              </span>
                            )}
                            {item.to_buy > 0 ? (
                              <Badge variant="outline" className="text-xs">
                                {item.to_buy} {item.unit}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                <Check className="h-3 w-3 mr-0.5" />
                                {t("generateShoppingList.haveEnough")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    {t("generateShoppingList.noIngredients")}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Shopping list selection */}
          <div className="space-y-2">
            <Label>{t("generateShoppingList.selectList")}</Label>

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
                          {t("generateShoppingList.createNew")}
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
                            {list.total_items} {t("generateShoppingList.items")}
                          </span>
                        </Label>
                      </div>
                    ))}

                    {(!shoppingLists || shoppingLists.items.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        {t("generateShoppingList.noLists")}
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
              <Label htmlFor="new-list-name">{t("generateShoppingList.newListName")}</Label>
              <Input
                id="new-list-name"
                placeholder={t("generateShoppingList.listNamePlaceholder")}
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
            onClick={() => handleOpenChange(false)}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (!selectedListId && !createNew) || (createNew && !newListName.trim())}
          >
            {isLoading ? (
              t("generateShoppingList.generating")
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {t("generateShoppingList.generateButton")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
