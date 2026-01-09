"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useCreateNutritionGoalMutation,
  useUpdateNutritionGoalMutation,
  type NutritionGoal,
  type GoalType,
  GOAL_TYPES,
} from "@/lib/api/nutrition-api";
import { toast } from "sonner";

// Create a reusable nullable number schema
const nullableNumber = z.union([z.number().min(0), z.null()]);

const goalSchema = z.object({
  goal_type: z.enum(["weight_loss", "muscle_gain", "maintenance", "custom"]),
  daily_calories: nullableNumber,
  daily_protein_g: nullableNumber,
  daily_carbs_g: nullableNumber,
  daily_fat_g: nullableNumber,
  daily_fiber_g: nullableNumber,
  daily_sugar_g: nullableNumber,
  daily_sodium_mg: nullableNumber,
  is_active: z.boolean().optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface NutritionGoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGoal?: NutritionGoal | null;
  defaultProfileId?: string | null;
  onSuccess?: () => void;
}

// Preset values for different goal types
const GOAL_PRESETS: Record<GoalType, Partial<GoalFormValues>> = {
  weight_loss: {
    daily_calories: 1800,
    daily_protein_g: 120,
    daily_carbs_g: 150,
    daily_fat_g: 60,
    daily_fiber_g: 30,
    daily_sugar_g: 40,
    daily_sodium_mg: 2000,
  },
  muscle_gain: {
    daily_calories: 2800,
    daily_protein_g: 180,
    daily_carbs_g: 300,
    daily_fat_g: 90,
    daily_fiber_g: 35,
    daily_sugar_g: 60,
    daily_sodium_mg: 2500,
  },
  maintenance: {
    daily_calories: 2200,
    daily_protein_g: 140,
    daily_carbs_g: 220,
    daily_fat_g: 75,
    daily_fiber_g: 30,
    daily_sugar_g: 50,
    daily_sodium_mg: 2300,
  },
  custom: {},
};

export function NutritionGoalForm({
  open,
  onOpenChange,
  editingGoal,
  defaultProfileId,
  onSuccess,
}: NutritionGoalFormProps) {
  const t = useTranslations("nutrition");
  const tCommon = useTranslations("common");

  const [createGoal, { isLoading: isCreating }] = useCreateNutritionGoalMutation();
  const [updateGoal, { isLoading: isUpdating }] = useUpdateNutritionGoalMutation();

  const isLoading = isCreating || isUpdating;
  const isEditing = !!editingGoal;

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      goal_type: "maintenance",
      daily_calories: null,
      daily_protein_g: null,
      daily_carbs_g: null,
      daily_fat_g: null,
      daily_fiber_g: null,
      daily_sugar_g: null,
      daily_sodium_mg: null,
      is_active: true,
    },
  });

  // Reset form when editing goal changes
  useEffect(() => {
    if (editingGoal) {
      form.reset({
        goal_type: editingGoal.goal_type || "custom",
        daily_calories: editingGoal.daily_calories,
        daily_protein_g: editingGoal.daily_protein_g,
        daily_carbs_g: editingGoal.daily_carbs_g,
        daily_fat_g: editingGoal.daily_fat_g,
        daily_fiber_g: editingGoal.daily_fiber_g,
        daily_sugar_g: editingGoal.daily_sugar_g,
        daily_sodium_mg: editingGoal.daily_sodium_mg,
        is_active: editingGoal.is_active,
      });
    } else {
      form.reset({
        goal_type: "maintenance",
        daily_calories: null,
        daily_protein_g: null,
        daily_carbs_g: null,
        daily_fat_g: null,
        daily_fiber_g: null,
        daily_sugar_g: null,
        daily_sodium_mg: null,
        is_active: true,
      });
    }
  }, [editingGoal, form]);

  // Apply preset when goal type changes
  const handleGoalTypeChange = (value: GoalType) => {
    form.setValue("goal_type", value);

    if (value !== "custom") {
      const preset = GOAL_PRESETS[value];
      Object.entries(preset).forEach(([key, val]) => {
        form.setValue(key as keyof GoalFormValues, val);
      });
    }
  };

  const onSubmit = async (values: GoalFormValues) => {
    try {
      if (isEditing && editingGoal) {
        await updateGoal({
          id: editingGoal.id,
          data: values,
        }).unwrap();
        toast.success(t("messages.goalUpdated"));
      } else {
        await createGoal({
          ...values,
          profile_id: defaultProfileId,
        }).unwrap();
        toast.success(t("messages.goalCreated"));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(isEditing ? t("messages.errorUpdatingGoal") : t("messages.errorCreatingGoal"));
      console.error("Error saving goal:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("goals.editTitle") : t("goals.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("goals.editDescription") : t("goals.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Goal Type */}
            <FormField
              control={form.control}
              name="goal_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("goals.goalType")}</FormLabel>
                  <Select
                    onValueChange={(v) => handleGoalTypeChange(v as GoalType)}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("goals.selectGoalType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GOAL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {t(`goalTypes.${type.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("goals.goalTypeHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Calories */}
            <FormField
              control={form.control}
              name="daily_calories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("goals.dailyCalories")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="2000"
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
                name="daily_protein_g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("macros.protein")} (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="150"
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
                name="daily_carbs_g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("macros.carbs")} (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="200"
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
                name="daily_fat_g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("macros.fat")} (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="70"
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
                name="daily_fiber_g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("macros.fiber")} (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
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
                name="daily_sugar_g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("macros.sugar")} (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
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
                name="daily_sodium_mg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("macros.sodium")} (mg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2300"
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

            {/* Active Toggle (only for editing) */}
            {isEditing && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("goals.activeGoal")}</FormLabel>
                      <FormDescription>
                        {t("goals.activeGoalHint")}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

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
