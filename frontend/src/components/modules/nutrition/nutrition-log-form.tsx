"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Wand2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  useCreateNutritionLogMutation,
  useUpdateNutritionLogMutation,
  useCalculateFoodNutritionMutation,
  type NutritionLog,
  type MealType,
  NUTRITION_MEAL_TYPES,
} from "@/lib/api/nutrition-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Create a reusable optional nullable number schema
const optionalNullableNumber = z.union([z.number().min(0), z.null()]).optional();

const logSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date: z.date(),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).nullable(),
  calories: optionalNullableNumber,
  protein_g: optionalNullableNumber,
  carbs_g: optionalNullableNumber,
  fat_g: optionalNullableNumber,
  fiber_g: optionalNullableNumber,
  sugar_g: optionalNullableNumber,
  sodium_mg: optionalNullableNumber,
  notes: z.string().nullable().optional(),
});

type LogFormValues = z.infer<typeof logSchema>;

interface NutritionLogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLog?: NutritionLog | null;
  defaultDate?: Date;
  defaultMealType?: MealType;
  defaultProfileId?: string | null;
  onSuccess?: () => void;
}

export function NutritionLogForm({
  open,
  onOpenChange,
  editingLog,
  defaultDate,
  defaultMealType,
  defaultProfileId,
  onSuccess,
}: NutritionLogFormProps) {
  const t = useTranslations("nutrition");
  const tCommon = useTranslations("common");

  const [createLog, { isLoading: isCreating }] = useCreateNutritionLogMutation();
  const [updateLog, { isLoading: isUpdating }] = useUpdateNutritionLogMutation();
  const [calculateNutrition, { isLoading: isCalculating }] = useCalculateFoodNutritionMutation();

  const isLoading = isCreating || isUpdating;
  const isEditing = !!editingLog;

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      name: "",
      date: defaultDate || new Date(),
      meal_type: defaultMealType || null,
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      fiber_g: null,
      sugar_g: null,
      sodium_mg: null,
      notes: null,
    },
  });

  // Reset form when editing log changes
  useEffect(() => {
    if (editingLog) {
      form.reset({
        name: editingLog.name || "",
        date: new Date(editingLog.date),
        meal_type: editingLog.meal_type,
        calories: editingLog.calories,
        protein_g: editingLog.protein_g,
        carbs_g: editingLog.carbs_g,
        fat_g: editingLog.fat_g,
        fiber_g: editingLog.fiber_g,
        sugar_g: editingLog.sugar_g,
        sodium_mg: editingLog.sodium_mg,
        notes: editingLog.notes,
      });
    } else {
      form.reset({
        name: "",
        date: defaultDate || new Date(),
        meal_type: defaultMealType || null,
        calories: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        fiber_g: null,
        sugar_g: null,
        sodium_mg: null,
        notes: null,
      });
    }
  }, [editingLog, defaultDate, defaultMealType, form]);

  const handleEstimateNutrition = async () => {
    const name = form.getValues("name");
    if (!name) {
      toast.error(t("messages.enterFoodFirst"));
      return;
    }

    try {
      const result = await calculateNutrition(name).unwrap();
      if (result) {
        if (result.calories) form.setValue("calories", result.calories);
        if (result.protein_g) form.setValue("protein_g", result.protein_g);
        if (result.carbs_g) form.setValue("carbs_g", result.carbs_g);
        if (result.fat_g) form.setValue("fat_g", result.fat_g);
        if (result.fiber_g) form.setValue("fiber_g", result.fiber_g);
        if (result.sugar_g) form.setValue("sugar_g", result.sugar_g);
        if (result.sodium_mg) form.setValue("sodium_mg", result.sodium_mg);
        toast.success(t("messages.nutritionEstimated"));
      }
    } catch (error) {
      toast.error(t("messages.errorEstimating"));
      console.error("Error estimating nutrition:", error);
    }
  };

  const onSubmit = async (values: LogFormValues) => {
    try {
      const data = {
        ...values,
        date: format(values.date, "yyyy-MM-dd"),
        manual_entry: true,
      };

      if (isEditing && editingLog) {
        await updateLog({
          id: editingLog.id,
          data,
        }).unwrap();
        toast.success(t("messages.logUpdated"));
      } else {
        await createLog({
          ...data,
          profile_id: defaultProfileId,
        }).unwrap();
        toast.success(t("messages.logCreated"));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(isEditing ? t("messages.errorUpdatingLog") : t("messages.errorCreatingLog"));
      console.error("Error saving log:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("logs.editTitle") : t("logs.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("logs.editDescription") : t("logs.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Food Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("logs.foodName")}</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder={t("logs.foodNamePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleEstimateNutrition}
                      disabled={isCalculating || !field.value}
                      title={t("logs.estimateNutrition")}
                    >
                      <Wand2 className={cn("h-4 w-4", isCalculating && "animate-spin")} />
                    </Button>
                  </div>
                  <FormDescription>
                    {t("logs.foodNameHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Meal Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("logs.date")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "MMM d, yyyy")
                            ) : (
                              <span>{t("logs.pickDate")}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("2020-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meal_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("logs.mealType")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("logs.selectMealType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NUTRITION_MEAL_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {t(`mealTypes.${type.value}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Calories */}
            <FormField
              control={form.control}
              name="calories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("logs.calories")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="500"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Macros Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="protein_g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("macros.protein")} (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="25"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carbs_g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("macros.carbs")} (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="50"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fat_g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("macros.fat")} (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="15"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fiber_g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("macros.fiber")} (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="5"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sugar_g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("macros.sugar")} (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="10"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sodium_mg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("macros.sodium")} (mg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="500"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("logs.notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("logs.notesPlaceholder")}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? tCommon("saving") : tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
