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
  useCreateRestaurantMealsMutation,
  MEAL_TYPES,
  ORDER_TYPES,
  type MealType,
  type OrderType,
} from "@/lib/api/restaurants-api";

const restaurantMealSchema = z.object({
  restaurant_name: z.string().min(1, "Required").max(255),
  meal_date: z.string().min(1, "Required"),
  meal_type: z.string().min(1, "Required"),
  order_type: z.string().min(1, "Required"),
  items_ordered: z.string().nullable().optional(),
  rating: z.number().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const bulkFormSchema = z.object({
  items: z.array(restaurantMealSchema).min(1, "At least one meal is required"),
});

type BulkFormData = z.infer<typeof bulkFormSchema>;

interface RestaurantMealBulkFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const emptyMeal = () => ({
  restaurant_name: "",
  meal_date: new Date().toISOString().split("T")[0],
  meal_type: "lunch" as string,
  order_type: "dine_in" as string,
  items_ordered: null as string | null,
  rating: null as number | null,
  notes: null as string | null,
});

export function RestaurantMealBulkForm({
  open,
  onOpenChange,
  onSuccess,
}: RestaurantMealBulkFormProps) {
  const t = useTranslations("restaurants");
  const tCommon = useTranslations("common");
  const [createMeals, { isLoading }] = useCreateRestaurantMealsMutation();

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
      items: [emptyMeal()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");

  const onSubmit = async (data: BulkFormData) => {
    try {
      const meals = data.items.map((item) => ({
        restaurant_name: item.restaurant_name,
        meal_date: item.meal_date,
        meal_type: item.meal_type as MealType,
        order_type: item.order_type as OrderType,
        items_ordered: item.items_ordered
          ? item.items_ordered.split(",").map((i) => i.trim()).filter(Boolean)
          : null,
        rating: item.rating,
        notes: item.notes,
      }));

      await createMeals(meals).unwrap();
      toast.success(t("messages.bulkMealsAdded", { count: meals.length }));
      handleClose();
      onSuccess?.();
    } catch (error) {
      toast.error(t("messages.errorAdding"));
      console.error("Error adding restaurant meals:", error);
    }
  };

  const handleClose = () => {
    reset({ items: [emptyMeal()] });
    onOpenChange(false);
  };

  const handleAddRow = () => {
    append(emptyMeal());
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
      <DialogContent className="!max-w-[95vw] w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("bulkForm.title")}</DialogTitle>
          <DialogDescription>{t("bulkForm.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">{t("form.restaurantName")} *</TableHead>
                  <TableHead className="min-w-[130px]">{t("form.date")} *</TableHead>
                  <TableHead className="min-w-[120px]">{t("form.mealType")} *</TableHead>
                  <TableHead className="min-w-[120px]">{t("form.orderType")} *</TableHead>
                  <TableHead className="min-w-[200px]">{t("form.itemsOrdered")}</TableHead>
                  <TableHead className="min-w-[100px]">{t("form.rating")}</TableHead>
                  <TableHead className="min-w-[90px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell className="p-1">
                      <Input
                        {...register(`items.${index}.restaurant_name`)}
                        placeholder={t("form.restaurantNamePlaceholder")}
                        className={errors.items?.[index]?.restaurant_name ? "border-destructive" : ""}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="date"
                        {...register(`items.${index}.meal_date`)}
                        className={errors.items?.[index]?.meal_date ? "border-destructive" : ""}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={watchedItems[index]?.meal_type || "lunch"}
                        onValueChange={(value) =>
                          setValue(`items.${index}.meal_type`, value)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEAL_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {t(`mealTypes.${type.value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={watchedItems[index]?.order_type || "dine_in"}
                        onValueChange={(value) =>
                          setValue(`items.${index}.order_type`, value)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {t(`orderTypes.${type.value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        {...register(`items.${index}.items_ordered`)}
                        placeholder={t("form.itemsPlaceholder")}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={watchedItems[index]?.rating?.toString() || ""}
                        onValueChange={(value) =>
                          setValue(`items.${index}.rating`, value ? parseInt(value) : null)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <SelectItem key={rating} value={rating.toString()}>
                              {rating} {rating === 1 ? t("form.star") : t("form.stars")}
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

          <div className="mt-4 flex items-center justify-between border-t pt-4">
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
                {t("bulkForm.mealCount", { count: fields.length })}
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
