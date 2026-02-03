"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { ChefHat, Check, AlertTriangle, X, Package } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMarkMealCookedMutation,
  useGetMealAvailabilityQuery,
  type Meal,
  type IngredientDeductionSummary,
} from "@/lib/api/meal-planner-api";

interface MarkCookedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: Meal | null;
  planId: string;
  onSuccess?: () => void;
}

export function MarkCookedDialog({
  open,
  onOpenChange,
  meal,
  planId,
  onSuccess,
}: MarkCookedDialogProps) {
  const t = useTranslations("mealPlanner");
  const tCommon = useTranslations("common");

  const [deductFromPantry, setDeductFromPantry] = useState(true);
  const [notes, setNotes] = useState("");

  const [markCooked, { isLoading: isMarking }] = useMarkMealCookedMutation();

  // Fetch availability to show what will be deducted
  const { data: availability, isLoading: isLoadingAvailability } = useGetMealAvailabilityQuery(
    { planId, mealId: meal?.id ?? "" },
    { skip: !open || !meal?.id || !meal?.recipe_id }
  );

  const hasRecipe = !!meal?.recipe_id;
  const mealName = meal?.recipe_name || meal?.custom_name || t("noMeal");

  const handleSubmit = async () => {
    if (!meal) return;

    try {
      const result = await markCooked({
        planId,
        mealId: meal.id,
        data: {
          deduct_from_pantry: deductFromPantry && hasRecipe,
          notes: notes || undefined,
        },
      }).unwrap();

      if (result.pantry_deducted) {
        const deductedMsg = result.total_deducted > 0
          ? t("markCooked.deductedIngredients", { count: result.total_deducted })
          : "";
        const missingMsg = result.total_missing > 0
          ? t("markCooked.missingIngredients", { count: result.total_missing })
          : "";

        toast.success(
          t("markCooked.success"),
          { description: [deductedMsg, missingMsg].filter(Boolean).join(". ") }
        );
      } else {
        toast.success(t("markCooked.successNoDeduct"));
      }

      setNotes("");
      setDeductFromPantry(true);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(t("markCooked.error"));
      console.error("Error marking meal as cooked:", error);
    }
  };

  const handleClose = () => {
    setNotes("");
    setDeductFromPantry(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            {t("markCooked.title")}
          </DialogTitle>
          <DialogDescription>
            {t("markCooked.description", { name: mealName })}
            {meal && (
              <span className="block mt-1 text-xs">
                {format(new Date(meal.date), "EEEE, MMMM d")} - {t(`mealTypes.${meal.meal_type}`)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Deduct from Pantry Option */}
          {hasRecipe && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="deduct-pantry" className="font-medium">
                  {t("markCooked.deductFromPantry")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("markCooked.deductDescription")}
                </p>
              </div>
              <Switch
                id="deduct-pantry"
                checked={deductFromPantry}
                onCheckedChange={setDeductFromPantry}
              />
            </div>
          )}

          {/* Ingredient Availability Preview */}
          {hasRecipe && deductFromPantry && (
            <div className="space-y-2">
              <Label>{t("markCooked.ingredientStatus")}</Label>
              {isLoadingAvailability ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : availability ? (
                <ScrollArea className="h-[200px] rounded-lg border">
                  <div className="p-3 space-y-2">
                    {/* Summary badges */}
                    <div className="flex flex-wrap gap-2 pb-2 border-b">
                      {availability.available_count > 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Check className="h-3 w-3 mr-1" />
                          {t("markCooked.available", { count: availability.available_count })}
                        </Badge>
                      )}
                      {availability.partial_count > 0 && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {t("markCooked.partial", { count: availability.partial_count })}
                        </Badge>
                      )}
                      {availability.missing_count > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <X className="h-3 w-3 mr-1" />
                          {t("markCooked.missing", { count: availability.missing_count })}
                        </Badge>
                      )}
                    </div>

                    {/* Ingredient list */}
                    {availability.ingredients.map((ingredient, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-1.5 text-sm"
                      >
                        <span className="flex-1 truncate">{ingredient.ingredient_name}</span>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-muted-foreground">
                            {ingredient.needed_quantity} {ingredient.needed_unit}
                          </span>
                          {ingredient.is_available ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : ingredient.is_partial ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-20 text-sm text-muted-foreground border rounded-lg">
                  <Package className="h-4 w-4 mr-2" />
                  {t("markCooked.noIngredients")}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("markCooked.notes")}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("markCooked.notesPlaceholder")}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isMarking}>
            {isMarking ? tCommon("saving") : t("markCooked.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
