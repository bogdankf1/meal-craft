"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreatePantryItemsMutation,
  useUpdatePantryItemMutation,
  PANTRY_CATEGORIES,
  STORAGE_LOCATIONS,
  type PantryItem,
  type CreatePantryItemInput,
  type PantryCategory,
  type StorageLocation,
} from "@/lib/api/pantry-api";

const pantryItemSchema = z.object({
  item_name: z.string().min(1, "Item name is required").max(255),
  quantity: z.number().min(0).nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  category: z.string().nullable().optional(),
  storage_location: z.string().min(1, "Storage location is required"),
  expiry_date: z.string().nullable().optional(),
  opened_date: z.string().nullable().optional(),
  minimum_quantity: z.number().min(0).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

type PantryItemFormData = z.infer<typeof pantryItemSchema>;

interface PantryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: PantryItem | null;
  onSuccess?: () => void;
}

const UNIT_KEYS = ["pcs", "kg", "g", "l", "ml", "pack", "box", "bag", "bottle", "can"] as const;

export function PantryForm({
  open,
  onOpenChange,
  editingItem,
  onSuccess,
}: PantryFormProps) {
  const t = useTranslations("pantry");
  const tCommon = useTranslations("common");
  const tUnits = useTranslations("groceries");

  const [createPantryItems, { isLoading: isCreating }] =
    useCreatePantryItemsMutation();
  const [updatePantryItem, { isLoading: isUpdating }] = useUpdatePantryItemMutation();

  const isEditing = !!editingItem;
  const isLoading = isCreating || isUpdating;

  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PantryItemFormData>({
    resolver: zodResolver(pantryItemSchema),
    defaultValues: {
      item_name: "",
      quantity: null,
      unit: null,
      category: null,
      storage_location: "pantry",
      expiry_date: null,
      opened_date: null,
      minimum_quantity: null,
      notes: null,
    },
  });

  // Track previous open state to detect when dialog opens
  const prevOpenRef = useRef(open);

  useEffect(() => {
    // Only reset moreOptionsOpen when dialog opens (transition from closed to open)
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (justOpened) {
      setMoreOptionsOpen(false);
    }

    if (open) {
      if (editingItem) {
        reset({
          item_name: editingItem.item_name,
          quantity: editingItem.quantity,
          unit: editingItem.unit,
          category: editingItem.category,
          storage_location: editingItem.storage_location,
          expiry_date: editingItem.expiry_date,
          opened_date: editingItem.opened_date,
          minimum_quantity: editingItem.minimum_quantity,
          notes: editingItem.notes,
        });
      } else {
        reset({
          item_name: "",
          quantity: null,
          unit: null,
          category: null,
          storage_location: "pantry",
          expiry_date: null,
          opened_date: null,
          minimum_quantity: null,
          notes: null,
        });
      }
    }
  }, [open, editingItem, reset]);

  const category = watch("category");
  const unit = watch("unit");
  const storageLocation = watch("storage_location");

  const onSubmit = async (data: PantryItemFormData) => {
    try {
      if (isEditing && editingItem) {
        await updatePantryItem({
          id: editingItem.id,
          data: {
            item_name: data.item_name,
            quantity: data.quantity,
            unit: data.unit,
            category: data.category as PantryCategory | null,
            storage_location: data.storage_location as StorageLocation,
            expiry_date: data.expiry_date || null,
            opened_date: data.opened_date || null,
            minimum_quantity: data.minimum_quantity,
            notes: data.notes,
          },
        }).unwrap();
        toast.success(t("messages.itemUpdated"));
      } else {
        const pantryInput: CreatePantryItemInput = {
          item_name: data.item_name,
          quantity: data.quantity,
          unit: data.unit,
          category: data.category as PantryCategory | null,
          storage_location: data.storage_location as StorageLocation,
          expiry_date: data.expiry_date || null,
          opened_date: data.opened_date || null,
          minimum_quantity: data.minimum_quantity,
          notes: data.notes,
        };
        await createPantryItems([pantryInput]).unwrap();
        toast.success(t("messages.itemAdded"));
      }

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(isEditing ? t("messages.errorUpdating") : t("messages.errorAdding"));
      console.error("Error saving pantry item:", error);
    }
  };

  const handleClose = () => {
    reset();
    setMoreOptionsOpen(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("form.editTitle") : t("form.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="item_name">{t("form.itemName")}</Label>
            <Input
              id="item_name"
              placeholder={t("form.itemNamePlaceholder")}
              autoFocus
              {...register("item_name")}
            />
            {errors.item_name && (
              <p className="text-sm text-destructive">{errors.item_name.message}</p>
            )}
          </div>

          {/* Storage Location */}
          <div className="space-y-2">
            <Label htmlFor="storage_location">{t("form.storageLocation")}</Label>
            <Select
              value={storageLocation || "pantry"}
              onValueChange={(value) => setValue("storage_location", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("form.selectLocation")} />
              </SelectTrigger>
              <SelectContent>
                {STORAGE_LOCATIONS.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {t(`storageLocations.${loc.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">{t("form.quantity")}</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                placeholder="1"
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
                      {tUnits(`units.${unitKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* More Options Toggle */}
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
          >
            {moreOptionsOpen ? (
              <>
                <ChevronUp className="h-3 w-3" />
                {t("form.fewerOptions")}
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                {t("form.moreOptions")}
              </>
            )}
          </button>

          {/* More Options Content */}
          {moreOptionsOpen && (
            <div className="space-y-4">
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
                    {PANTRY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {t(`categories.${cat.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry Date and Opened Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="expiry_date">{t("form.expiryDate")}</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    {...register("expiry_date")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opened_date">{t("form.openedDate")}</Label>
                  <Input
                    id="opened_date"
                    type="date"
                    {...register("opened_date")}
                  />
                </div>
              </div>

              {/* Minimum Quantity */}
              <div className="space-y-2">
                <Label htmlFor="minimum_quantity">{t("form.minimumQuantity")}</Label>
                <Input
                  id="minimum_quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t("form.minimumQuantityPlaceholder")}
                  {...register("minimum_quantity", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  {t("form.minimumQuantityHint")}
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">{t("form.notes")}</Label>
                <Textarea
                  id="notes"
                  placeholder={t("form.notesPlaceholder")}
                  rows={2}
                  {...register("notes")}
                />
              </div>
            </div>
          )}

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
