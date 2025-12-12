"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useCreateRestaurantMealsMutation,
  useUpdateRestaurantMealMutation,
  MEAL_TYPES,
  ORDER_TYPES,
  MEAL_TAGS,
  type RestaurantMeal,
  type CreateRestaurantMealInput,
  type MealType,
  type OrderType,
} from "@/lib/api/restaurants-api";

const mealSchema = z.object({
  restaurant_name: z.string().min(1, "Restaurant name is required").max(255),
  meal_date: z.string().min(1, "Date is required"),
  meal_time: z.string().nullable().optional(),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  order_type: z.enum(["dine_in", "delivery", "takeout"]),
  items_ordered: z.string().nullable().optional(), // comma-separated
  description: z.string().nullable().optional(),
  estimated_calories: z.number().min(0).nullable().optional(),
  rating: z.number().min(1).max(5).nullable().optional(),
  feeling_after: z.number().min(1).max(5).nullable().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
});

type MealFormData = z.infer<typeof mealSchema>;

interface RestaurantMealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMeal?: RestaurantMeal | null;
  onSuccess?: () => void;
}

export function RestaurantMealForm({
  open,
  onOpenChange,
  editingMeal,
  onSuccess,
}: RestaurantMealFormProps) {
  const t = useTranslations("restaurants");
  const tCommon = useTranslations("common");

  const [createMeals, { isLoading: isCreating }] =
    useCreateRestaurantMealsMutation();
  const [updateMeal, { isLoading: isUpdating }] = useUpdateRestaurantMealMutation();

  const isEditing = !!editingMeal;
  const isLoading = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MealFormData>({
    resolver: zodResolver(mealSchema),
    defaultValues: {
      restaurant_name: "",
      meal_date: format(new Date(), "yyyy-MM-dd"),
      meal_time: null,
      meal_type: "lunch",
      order_type: "dine_in",
      items_ordered: null,
      description: null,
      estimated_calories: null,
      rating: null,
      feeling_after: null,
      tags: [],
      notes: null,
    },
  });

  // Reset form when editingMeal changes or dialog opens
  useEffect(() => {
    if (open) {
      if (editingMeal) {
        reset({
          restaurant_name: editingMeal.restaurant_name,
          meal_date: editingMeal.meal_date,
          meal_time: editingMeal.meal_time,
          meal_type: editingMeal.meal_type,
          order_type: editingMeal.order_type,
          items_ordered: editingMeal.items_ordered?.join(", ") || null,
          description: editingMeal.description,
          estimated_calories: editingMeal.estimated_calories,
          rating: editingMeal.rating,
          feeling_after: editingMeal.feeling_after,
          tags: editingMeal.tags || [],
          notes: editingMeal.notes,
        });
      } else {
        reset({
          restaurant_name: "",
          meal_date: format(new Date(), "yyyy-MM-dd"),
          meal_time: null,
          meal_type: "lunch",
          order_type: "dine_in",
          items_ordered: null,
          description: null,
          estimated_calories: null,
          rating: null,
          feeling_after: null,
          tags: [],
          notes: null,
        });
      }
    }
  }, [open, editingMeal, reset]);

  const mealType = watch("meal_type");
  const orderType = watch("order_type");
  const rating = watch("rating");
  const feelingAfter = watch("feeling_after");
  const selectedTags = watch("tags") || [];

  const toggleTag = (tag: string) => {
    const current = selectedTags;
    if (current.includes(tag)) {
      setValue("tags", current.filter((t) => t !== tag));
    } else {
      setValue("tags", [...current, tag]);
    }
  };

  const onSubmit = async (data: MealFormData) => {
    try {
      const itemsArray = data.items_ordered
        ? data.items_ordered.split(",").map((item) => item.trim()).filter(Boolean)
        : null;

      if (isEditing && editingMeal) {
        await updateMeal({
          id: editingMeal.id,
          data: {
            restaurant_name: data.restaurant_name,
            meal_date: data.meal_date,
            meal_time: data.meal_time || undefined,
            meal_type: data.meal_type as MealType,
            order_type: data.order_type as OrderType,
            items_ordered: itemsArray,
            description: data.description,
            estimated_calories: data.estimated_calories,
            rating: data.rating,
            feeling_after: data.feeling_after,
            tags: data.tags?.length ? data.tags : null,
            notes: data.notes,
          },
        }).unwrap();
        toast.success(t("messages.mealUpdated"));
      } else {
        const mealInput: CreateRestaurantMealInput = {
          restaurant_name: data.restaurant_name,
          meal_date: data.meal_date,
          meal_time: data.meal_time || undefined,
          meal_type: data.meal_type as MealType,
          order_type: data.order_type as OrderType,
          items_ordered: itemsArray,
          description: data.description,
          estimated_calories: data.estimated_calories,
          rating: data.rating,
          feeling_after: data.feeling_after,
          tags: data.tags?.length ? data.tags : null,
          notes: data.notes,
          import_source: "manual",
        };
        await createMeals([mealInput]).unwrap();
        toast.success(t("messages.mealAdded"));
      }

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(isEditing ? t("messages.errorUpdating") : t("messages.errorAdding"));
      console.error("Error saving meal:", error);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const RatingSelector = ({
    value,
    onChange,
    label,
  }: {
    value: number | null | undefined;
    onChange: (value: number | null) => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(value === star ? null : star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={cn(
                "h-6 w-6",
                value && star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              )}
            />
          </button>
        ))}
        {value && (
          <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
          {/* Restaurant Name */}
          <div className="space-y-2">
            <Label htmlFor="restaurant_name">{t("form.restaurantName")} *</Label>
            <Input
              id="restaurant_name"
              placeholder={t("form.restaurantNamePlaceholder")}
              {...register("restaurant_name")}
            />
            {errors.restaurant_name && (
              <p className="text-sm text-destructive">{errors.restaurant_name.message}</p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meal_date">{t("form.date")} *</Label>
              <Input
                id="meal_date"
                type="date"
                {...register("meal_date")}
              />
              {errors.meal_date && (
                <p className="text-sm text-destructive">{errors.meal_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal_time">{t("form.time")}</Label>
              <Input
                id="meal_time"
                type="time"
                {...register("meal_time")}
              />
            </div>
          </div>

          {/* Meal Type and Order Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("form.mealType")} *</Label>
              <Select
                value={mealType}
                onValueChange={(value) => setValue("meal_type", value as MealType)}
              >
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label>{t("form.orderType")} *</Label>
              <Select
                value={orderType}
                onValueChange={(value) => setValue("order_type", value as OrderType)}
              >
                <SelectTrigger>
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
            </div>
          </div>

          {/* Items Ordered */}
          <div className="space-y-2">
            <Label htmlFor="items_ordered">{t("form.itemsOrdered")}</Label>
            <Input
              id="items_ordered"
              placeholder={t("form.itemsOrderedPlaceholder")}
              {...register("items_ordered")}
            />
            <p className="text-xs text-muted-foreground">{t("form.itemsOrderedHint")}</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("form.description")}</Label>
            <Textarea
              id="description"
              placeholder={t("form.descriptionPlaceholder")}
              rows={2}
              {...register("description")}
            />
          </div>

          {/* Estimated Calories */}
          <div className="space-y-2">
            <Label htmlFor="estimated_calories">{t("form.estimatedCalories")}</Label>
            <Input
              id="estimated_calories"
              type="number"
              min="0"
              placeholder="0"
              {...register("estimated_calories", { valueAsNumber: true })}
            />
          </div>

          {/* Rating and Feeling */}
          <div className="grid grid-cols-2 gap-4">
            <RatingSelector
              value={rating}
              onChange={(value) => setValue("rating", value)}
              label={t("form.rating")}
            />
            <RatingSelector
              value={feelingAfter}
              onChange={(value) => setValue("feeling_after", value)}
              label={t("form.feelingAfter")}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>{t("form.tags")}</Label>
            <div className="flex flex-wrap gap-2">
              {MEAL_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {t(`tags.${tag}`, { defaultValue: tag })}
                </Badge>
              ))}
            </div>
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
              {isLoading ? t("form.saving") : isEditing ? tCommon("save") : t("addMeal")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
