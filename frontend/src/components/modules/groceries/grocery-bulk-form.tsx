"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
  useCreateGroceriesMutation,
  GROCERY_CATEGORIES,
  type GroceryCategory,
} from "@/lib/api/groceries-api";

const UNIT_KEYS = ["pcs", "kg", "g", "l", "ml", "pack", "box", "bag", "bottle", "can"] as const;

const groceryItemSchema = z.object({
  item_name: z.string().min(1, "Required").max(255),
  quantity: z.number().min(0).nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  category: z.string().nullable().optional(),
  purchase_date: z.string().min(1, "Required"),
  expiry_date: z.string().nullable().optional(),
  cost: z.number().min(0).nullable().optional(),
  store: z.string().max(255).nullable().optional(),
});

const bulkFormSchema = z.object({
  items: z.array(groceryItemSchema).min(1, "At least one item is required"),
});

type BulkFormData = z.infer<typeof bulkFormSchema>;

interface GroceryBulkFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const emptyItem = () => ({
  item_name: "",
  quantity: null as number | null,
  unit: null as string | null,
  category: null as string | null,
  purchase_date: format(new Date(), "yyyy-MM-dd"),
  expiry_date: null as string | null,
  cost: null as number | null,
  store: null as string | null,
});

export function GroceryBulkForm({
  open,
  onOpenChange,
  onSuccess,
}: GroceryBulkFormProps) {
  const t = useTranslations("groceries");
  const tCommon = useTranslations("common");
  const [createGroceries, { isLoading }] = useCreateGroceriesMutation();

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
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category as GroceryCategory | null,
        purchase_date: item.purchase_date,
        expiry_date: item.expiry_date || null,
        cost: item.cost,
        store: item.store,
      }));

      await createGroceries(items).unwrap();
      toast.success(t("messages.bulkItemsAdded", { count: items.length }));
      handleClose();
      onSuccess?.();
    } catch (error) {
      toast.error(t("messages.errorAdding"));
      console.error("Error adding groceries:", error);
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
                  <TableHead className="min-w-[180px]">{t("form.itemName")} *</TableHead>
                  <TableHead className="min-w-[80px]">{t("form.quantity")}</TableHead>
                  <TableHead className="min-w-[100px]">{t("form.unit")}</TableHead>
                  <TableHead className="min-w-[130px]">{t("form.purchaseDate")} *</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell className="p-1">
                      <Input
                        {...register(`items.${index}.item_name`)}
                        placeholder={t("form.itemNamePlaceholder")}
                        className={errors.items?.[index]?.item_name ? "border-destructive" : ""}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        placeholder="1"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={watchedItems[index]?.unit || ""}
                        onValueChange={(value) =>
                          setValue(`items.${index}.unit`, value || null)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_KEYS.map((unitKey) => (
                            <SelectItem key={unitKey} value={unitKey}>
                              {t(`units.${unitKey}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="date"
                        {...register(`items.${index}.purchase_date`)}
                        className={errors.items?.[index]?.purchase_date ? "border-destructive" : ""}
                      />
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
