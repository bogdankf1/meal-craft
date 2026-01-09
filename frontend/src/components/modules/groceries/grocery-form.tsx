"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
  useCreateGroceriesMutation,
  useUpdateGroceryMutation,
  GROCERY_CATEGORIES,
  type Grocery,
  type CreateGroceryInput,
  type GroceryCategory,
} from "@/lib/api/groceries-api";

const grocerySchema = z.object({
  item_name: z.string().min(1, "Item name is required").max(255),
  quantity: z.number().min(0).nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  category: z.string().nullable().optional(),
  purchase_date: z.string().min(1, "Purchase date is required"),
  expiry_date: z.string().nullable().optional(),
  cost: z.number().min(0).nullable().optional(),
  store: z.string().max(255).nullable().optional(),
});

type GroceryFormData = z.infer<typeof grocerySchema>;

interface GroceryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGrocery?: Grocery | null;
  onSuccess?: () => void;
}

const UNIT_KEYS = ["pcs", "kg", "g", "l", "ml", "pack", "box", "bag", "bottle", "can"] as const;

export function GroceryForm({
  open,
  onOpenChange,
  editingGrocery,
  onSuccess,
}: GroceryFormProps) {
  const t = useTranslations("groceries");
  const tCommon = useTranslations("common");

  const [createGroceries, { isLoading: isCreating }] =
    useCreateGroceriesMutation();
  const [updateGrocery, { isLoading: isUpdating }] = useUpdateGroceryMutation();

  const isEditing = !!editingGrocery;
  const isLoading = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<GroceryFormData>({
    resolver: zodResolver(grocerySchema),
    defaultValues: {
      item_name: "",
      quantity: null,
      unit: null,
      category: null,
      purchase_date: format(new Date(), "yyyy-MM-dd"),
      expiry_date: null,
      cost: null,
      store: null,
    },
  });

  // Reset form when editingGrocery changes or dialog opens
  useEffect(() => {
    if (open) {
      if (editingGrocery) {
        reset({
          item_name: editingGrocery.item_name,
          quantity: editingGrocery.quantity,
          unit: editingGrocery.unit,
          category: editingGrocery.category,
          purchase_date: editingGrocery.purchase_date,
          expiry_date: editingGrocery.expiry_date,
          cost: editingGrocery.cost,
          store: editingGrocery.store,
        });
      } else {
        reset({
          item_name: "",
          quantity: null,
          unit: null,
          category: null,
          purchase_date: format(new Date(), "yyyy-MM-dd"),
          expiry_date: null,
          cost: null,
          store: null,
        });
      }
    }
  }, [open, editingGrocery, reset]);

  const category = watch("category");
  const unit = watch("unit");

  const onSubmit = async (data: GroceryFormData) => {
    try {
      if (isEditing && editingGrocery) {
        await updateGrocery({
          id: editingGrocery.id,
          data: {
            item_name: data.item_name,
            quantity: data.quantity,
            unit: data.unit,
            category: data.category as GroceryCategory | null,
            purchase_date: data.purchase_date,
            expiry_date: data.expiry_date || null,
            cost: data.cost,
            store: data.store,
          },
        }).unwrap();
        toast.success(t("messages.itemUpdated"));
      } else {
        const groceryInput: CreateGroceryInput = {
          item_name: data.item_name,
          quantity: data.quantity,
          unit: data.unit,
          category: data.category as GroceryCategory | null,
          purchase_date: data.purchase_date,
          expiry_date: data.expiry_date || null,
          cost: data.cost,
          store: data.store,
        };
        await createGroceries([groceryInput]).unwrap();
        toast.success(t("messages.itemAdded"));
      }

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(isEditing ? t("messages.errorUpdating") : t("messages.errorAdding"));
      console.error("Error saving grocery:", error);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("form.editTitle") : t("form.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("form.editDescription")
              : t("form.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="item_name">{t("form.itemName")} *</Label>
            <Input
              id="item_name"
              placeholder={t("form.itemNamePlaceholder")}
              {...register("item_name")}
            />
            {errors.item_name && (
              <p className="text-sm text-destructive">{errors.item_name.message}</p>
            )}
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">{t("form.quantity")}</Label>
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
              <Label htmlFor="unit">{t("form.unit")}</Label>
              <Select
                value={unit || ""}
                onValueChange={(value) => setValue("unit", value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("form.selectUnit")} />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_KEYS.map((unitKey) => (
                    <SelectItem key={unitKey} value={unitKey}>
                      {t(`units.${unitKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">{t("form.category")}</Label>
            <Select
              value={category || ""}
              onValueChange={(value) => setValue("category", value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("form.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {GROCERY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {t(`categories.${cat.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purchase Date and Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_date">{t("form.purchaseDate")} *</Label>
              <Input
                id="purchase_date"
                type="date"
                {...register("purchase_date")}
              />
              {errors.purchase_date && (
                <p className="text-sm text-destructive">
                  {errors.purchase_date.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">{t("form.expiryDate")}</Label>
              <Input
                id="expiry_date"
                type="date"
                {...register("expiry_date")}
              />
            </div>
          </div>

          {/* Cost and Store */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">{t("form.cost")}</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("cost", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store">{t("form.store")}</Label>
              <Input
                id="store"
                placeholder={t("form.storePlaceholder")}
                {...register("store")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("form.saving") : isEditing ? tCommon("save") : t("addItem")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
