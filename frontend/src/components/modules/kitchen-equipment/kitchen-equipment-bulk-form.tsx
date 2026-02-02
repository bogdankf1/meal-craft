"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateKitchenEquipmentMutation,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_LOCATIONS,
  type EquipmentCategory,
  type EquipmentCondition,
  type EquipmentLocation,
} from "@/lib/api/kitchen-equipment-api";

const equipmentItemSchema = z.object({
  name: z.string().min(1, "Required").max(255),
  category: z.string().nullable().optional(),
  brand: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  condition: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  purchase_price: z.number().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const bulkFormSchema = z.object({
  items: z.array(equipmentItemSchema).min(1, "At least one item is required"),
});

type BulkFormData = z.infer<typeof bulkFormSchema>;

interface KitchenEquipmentBulkFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const emptyItem = () => ({
  name: "",
  category: null as string | null,
  brand: null as string | null,
  model: null as string | null,
  condition: "good" as string | null,
  location: "cabinet" as string | null,
  purchase_date: null as string | null,
  purchase_price: null as number | null,
  notes: null as string | null,
});

export function KitchenEquipmentBulkForm({
  open,
  onOpenChange,
  onSuccess,
}: KitchenEquipmentBulkFormProps) {
  const t = useTranslations("kitchenEquipment");
  const tCommon = useTranslations("common");
  const [createEquipment, { isLoading }] = useCreateKitchenEquipmentMutation();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BulkFormData>({
    resolver: zodResolver(bulkFormSchema),
    defaultValues: {
      items: [emptyItem()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");

  const onSubmit = async (data: BulkFormData) => {
    try {
      const items = data.items.map((item) => ({
        name: item.name,
        category: item.category as EquipmentCategory | null,
        brand: item.brand || null,
        model: item.model || null,
        condition: (item.condition || "good") as EquipmentCondition,
        location: (item.location || "cabinet") as EquipmentLocation,
        purchase_date: item.purchase_date || null,
        purchase_price: item.purchase_price || null,
        notes: item.notes || null,
      }));

      await createEquipment(items).unwrap();
      toast.success(t("messages.bulkItemsAdded", { count: items.length }));
      handleClose();
      onSuccess?.();
    } catch (error) {
      toast.error(t("messages.errorAdding"));
      console.error("Error adding equipment:", error);
    }
  };

  const handleClose = () => {
    reset({ items: [emptyItem()] });
    onOpenChange(false);
  };

  const handleAddRow = () => {
    append(emptyItem());
  };

  const handleDuplicateRow = (index: number) => {
    const item = watchedItems[index];
    append({ ...item });
  };

  const handleRemoveRow = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("bulkForm.title")}</DialogTitle>
          <DialogDescription>{t("bulkForm.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">{t("form.name")} *</TableHead>
                  <TableHead className="min-w-[120px]">{t("form.category")}</TableHead>
                  <TableHead className="min-w-[110px]">{t("form.condition")}</TableHead>
                  <TableHead className="min-w-[110px]">{t("form.location")}</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell className="p-1">
                      <Input
                        {...register(`items.${index}.name`)}
                        placeholder={t("form.namePlaceholder")}
                        className={errors.items?.[index]?.name ? "border-destructive" : ""}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={watchedItems[index]?.category || ""}
                        onValueChange={(value) =>
                          setValue(`items.${index}.category`, value || null)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {EQUIPMENT_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {t(`categories.${cat.value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={watchedItems[index]?.condition || "good"}
                        onValueChange={(value) =>
                          setValue(`items.${index}.condition`, value || "good")
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EQUIPMENT_CONDITIONS.map((cond) => (
                            <SelectItem key={cond.value} value={cond.value}>
                              {t(`conditions.${cond.value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={watchedItems[index]?.location || "cabinet"}
                        onValueChange={(value) =>
                          setValue(`items.${index}.location`, value || "cabinet")
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EQUIPMENT_LOCATIONS.map((loc) => (
                            <SelectItem key={loc.value} value={loc.value}>
                              {t(`locations.${loc.value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDuplicateRow(index)}
                          title={tCommon("duplicate")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveRow(index)}
                          disabled={fields.length === 1}
                          title={tCommon("delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddRow}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("bulkForm.addRow")}
            </Button>

            <DialogFooter className="sm:justify-end gap-2">
              <span className="text-sm text-muted-foreground mr-4">
                {t("bulkForm.itemCount", { count: fields.length })}
              </span>
              <Button type="button" variant="outline" onClick={handleClose}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t("form.saving") : t("bulkForm.addAll")}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
