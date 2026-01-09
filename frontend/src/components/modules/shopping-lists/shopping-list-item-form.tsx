"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAddItemsToListMutation,
  useUpdateShoppingListItemMutation,
  SHOPPING_LIST_CATEGORIES,
  type ShoppingListItem,
  type ShoppingListItemCategory,
} from "@/lib/api/shopping-lists-api";

const itemSchema = z.object({
  ingredient_name: z.string().min(1, "Item name is required").max(255),
  quantity: z.number().min(0).nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  category: z.string().nullable().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ShoppingListItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  editingItem?: ShoppingListItem | null;
  onSuccess?: () => void;
}

const UNIT_KEYS = ["pcs", "kg", "g", "l", "ml", "pack", "box", "bag", "bottle", "can"] as const;

export function ShoppingListItemForm({
  open,
  onOpenChange,
  listId,
  editingItem,
  onSuccess,
}: ShoppingListItemFormProps) {
  const t = useTranslations("shoppingLists");
  const tGroceries = useTranslations("groceries");
  const tCommon = useTranslations("common");

  const [addItems, { isLoading: isAdding }] = useAddItemsToListMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateShoppingListItemMutation();

  const isEditing = !!editingItem;
  const isLoading = isAdding || isUpdating;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      ingredient_name: "",
      quantity: null,
      unit: null,
      category: null,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        reset({
          ingredient_name: editingItem.ingredient_name,
          quantity: editingItem.quantity,
          unit: editingItem.unit,
          category: editingItem.category,
        });
      } else {
        reset({
          ingredient_name: "",
          quantity: null,
          unit: null,
          category: null,
        });
      }
    }
  }, [open, editingItem, reset]);

  const category = watch("category");
  const unit = watch("unit");

  const onSubmit = async (data: ItemFormData) => {
    try {
      if (isEditing && editingItem) {
        await updateItem({
          listId,
          itemId: editingItem.id,
          data: {
            ingredient_name: data.ingredient_name,
            quantity: data.quantity,
            unit: data.unit,
            category: data.category as ShoppingListItemCategory | null,
          },
        }).unwrap();
        toast.success(t("messages.itemUpdated"));
      } else {
        await addItems({
          listId,
          items: [{
            ingredient_name: data.ingredient_name,
            quantity: data.quantity,
            unit: data.unit,
            category: data.category as ShoppingListItemCategory | null,
          }],
        }).unwrap();
        toast.success(t("messages.itemAdded"));
      }

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(isEditing ? t("messages.errorUpdatingItem") : t("messages.errorAddingItem"));
      console.error("Error saving item:", error);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("itemForm.editTitle") : t("itemForm.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("itemForm.editDescription") : t("itemForm.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ingredient_name">{t("itemForm.itemName")} *</Label>
            <Input
              id="ingredient_name"
              placeholder={t("itemForm.itemNamePlaceholder")}
              {...register("ingredient_name")}
            />
            {errors.ingredient_name && (
              <p className="text-sm text-destructive">{errors.ingredient_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">{t("itemForm.quantity")}</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                {...register("quantity", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">{t("itemForm.unit")}</Label>
              <Select
                value={unit || ""}
                onValueChange={(value) => setValue("unit", value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tGroceries("form.selectUnit")} />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_KEYS.map((unitKey) => (
                    <SelectItem key={unitKey} value={unitKey}>
                      {tGroceries(`units.${unitKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t("itemForm.category")}</Label>
            <Select
              value={category || ""}
              onValueChange={(value) => setValue("category", value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder={tGroceries("form.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {SHOPPING_LIST_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {tGroceries(`categories.${cat.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("form.saving") : isEditing ? tCommon("save") : t("itemForm.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
