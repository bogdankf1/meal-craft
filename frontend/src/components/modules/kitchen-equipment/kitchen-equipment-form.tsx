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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateKitchenEquipmentMutation,
  useUpdateKitchenEquipmentMutation,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_LOCATIONS,
  type KitchenEquipment,
  type CreateKitchenEquipmentInput,
  type EquipmentCategory,
  type EquipmentCondition,
  type EquipmentLocation,
} from "@/lib/api/kitchen-equipment-api";

const kitchenEquipmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  category: z.string().nullable().optional(),
  brand: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  condition: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  purchase_price: z.number().min(0).nullable().optional(),
  last_maintenance_date: z.string().nullable().optional(),
  maintenance_interval_days: z.number().min(1).nullable().optional(),
  maintenance_notes: z.string().max(500).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

type KitchenEquipmentFormData = z.infer<typeof kitchenEquipmentSchema>;

interface KitchenEquipmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: KitchenEquipment | null;
  onSuccess?: () => void;
}

export function KitchenEquipmentForm({
  open,
  onOpenChange,
  editingItem,
  onSuccess,
}: KitchenEquipmentFormProps) {
  const t = useTranslations("kitchenEquipment");
  const tCommon = useTranslations("common");

  const [createEquipment, { isLoading: isCreating }] =
    useCreateKitchenEquipmentMutation();
  const [updateEquipment, { isLoading: isUpdating }] =
    useUpdateKitchenEquipmentMutation();

  const isEditing = !!editingItem;
  const isLoading = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<KitchenEquipmentFormData>({
    resolver: zodResolver(kitchenEquipmentSchema),
    defaultValues: {
      name: "",
      category: null,
      brand: null,
      model: null,
      condition: "good",
      location: "cabinet",
      purchase_date: null,
      purchase_price: null,
      last_maintenance_date: null,
      maintenance_interval_days: null,
      maintenance_notes: null,
      notes: null,
    },
  });

  // Reset form when editingItem changes or dialog opens
  useEffect(() => {
    if (open) {
      if (editingItem) {
        reset({
          name: editingItem.name,
          category: editingItem.category,
          brand: editingItem.brand,
          model: editingItem.model,
          condition: editingItem.condition,
          location: editingItem.location,
          purchase_date: editingItem.purchase_date,
          purchase_price: editingItem.purchase_price,
          last_maintenance_date: editingItem.last_maintenance_date,
          maintenance_interval_days: editingItem.maintenance_interval_days,
          maintenance_notes: editingItem.maintenance_notes,
          notes: editingItem.notes,
        });
      } else {
        reset({
          name: "",
          category: null,
          brand: null,
          model: null,
          condition: "good",
          location: "cabinet",
          purchase_date: null,
          purchase_price: null,
          last_maintenance_date: null,
          maintenance_interval_days: null,
          maintenance_notes: null,
          notes: null,
        });
      }
    }
  }, [open, editingItem, reset]);

  const category = watch("category");
  const condition = watch("condition");
  const location = watch("location");

  const onSubmit = async (data: KitchenEquipmentFormData) => {
    try {
      if (isEditing && editingItem) {
        await updateEquipment({
          id: editingItem.id,
          data: {
            name: data.name,
            category: data.category as EquipmentCategory | null,
            brand: data.brand,
            model: data.model,
            condition: data.condition as EquipmentCondition | null,
            location: data.location as EquipmentLocation | null,
            purchase_date: data.purchase_date || null,
            purchase_price: data.purchase_price,
            last_maintenance_date: data.last_maintenance_date || null,
            maintenance_interval_days: data.maintenance_interval_days,
            maintenance_notes: data.maintenance_notes,
            notes: data.notes,
          },
        }).unwrap();
        toast.success(t("messages.itemUpdated"));
      } else {
        const equipmentInput: CreateKitchenEquipmentInput = {
          name: data.name,
          category: data.category as EquipmentCategory | null,
          brand: data.brand,
          model: data.model,
          condition: data.condition as EquipmentCondition,
          location: data.location as EquipmentLocation,
          purchase_date: data.purchase_date || null,
          purchase_price: data.purchase_price,
          last_maintenance_date: data.last_maintenance_date || null,
          maintenance_interval_days: data.maintenance_interval_days,
          maintenance_notes: data.maintenance_notes,
          notes: data.notes,
        };
        await createEquipment([equipmentInput]).unwrap();
        toast.success(t("messages.itemAdded"));
      }

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(isEditing ? t("messages.errorUpdating") : t("messages.errorAdding"));
      console.error("Error saving kitchen equipment:", error);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("form.editTitle") : t("form.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("form.editDescription") : t("form.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t("form.name")} *</Label>
            <Input
              id="name"
              placeholder={t("form.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Category and Condition */}
          <div className="grid grid-cols-2 gap-4">
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
                  {EQUIPMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {t(`categories.${cat.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="condition">{t("form.condition")}</Label>
              <Select
                value={condition || "good"}
                onValueChange={(value) => setValue("condition", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("form.selectCondition")} />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_CONDITIONS.map((cond) => (
                    <SelectItem key={cond.value} value={cond.value}>
                      {t(`conditions.${cond.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Brand and Model */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">{t("form.brand")}</Label>
              <Input
                id="brand"
                placeholder={t("form.brandPlaceholder")}
                {...register("brand")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">{t("form.model")}</Label>
              <Input
                id="model"
                placeholder={t("form.modelPlaceholder")}
                {...register("model")}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">{t("form.location")}</Label>
            <Select
              value={location || "cabinet"}
              onValueChange={(value) => setValue("location", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("form.selectLocation")} />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_LOCATIONS.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {t(`locations.${loc.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purchase Date and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_date">{t("form.purchaseDate")}</Label>
              <Input
                id="purchase_date"
                type="date"
                {...register("purchase_date")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_price">{t("form.purchasePrice")}</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("purchase_price", { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Maintenance Fields */}
          <div className="space-y-2">
            <Label className="text-base font-medium">{t("form.maintenanceSection")}</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="last_maintenance_date">{t("form.lastMaintenanceDate")}</Label>
                <Input
                  id="last_maintenance_date"
                  type="date"
                  {...register("last_maintenance_date")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance_interval_days">{t("form.maintenanceInterval")}</Label>
                <Input
                  id="maintenance_interval_days"
                  type="number"
                  min="1"
                  placeholder={t("form.maintenanceIntervalPlaceholder")}
                  {...register("maintenance_interval_days", { valueAsNumber: true })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("form.maintenanceHint")}
            </p>
          </div>

          {/* Maintenance Notes */}
          <div className="space-y-2">
            <Label htmlFor="maintenance_notes">{t("form.maintenanceNotes")}</Label>
            <Textarea
              id="maintenance_notes"
              placeholder={t("form.maintenanceNotesPlaceholder")}
              rows={2}
              {...register("maintenance_notes")}
            />
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
