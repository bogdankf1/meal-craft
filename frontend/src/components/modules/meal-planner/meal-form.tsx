"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useCreateMealMutation,
  useUpdateMealMutation,
  useDeleteMealMutation,
  type Meal,
  type MealType,
  MEAL_TYPES,
} from "@/lib/api/meal-planner-api";
import {
  useGetRecipesQuery,
  type RecipeListItem,
} from "@/lib/api/recipes-api";

const mealSchema = z.object({
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  recipe_id: z.string().nullable().optional(),
  custom_name: z.string().nullable().optional(),
  servings: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_leftover: z.boolean(),
});

type MealFormValues = z.infer<typeof mealSchema>;

interface MealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  date: Date;
  mealType?: MealType;
  editingMeal?: Meal | null;
  defaultServings?: number;
  onSuccess?: () => void;
}

export function MealForm({
  open,
  onOpenChange,
  planId,
  date,
  mealType = "lunch",
  editingMeal,
  defaultServings = 2,
  onSuccess,
}: MealFormProps) {
  const t = useTranslations("mealPlanner");
  const tCommon = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [showRecipeSearch, setShowRecipeSearch] = useState(false);

  const [createMeal, { isLoading: isCreating }] = useCreateMealMutation();
  const [updateMeal, { isLoading: isUpdating }] = useUpdateMealMutation();
  const [deleteMeal, { isLoading: isDeleting }] = useDeleteMealMutation();

  // Fetch recipes for selection
  const { data: recipesData } = useGetRecipesQuery({
    search: searchQuery || undefined,
    is_archived: false,
    per_page: 20,
  });

  const isEditing = !!editingMeal;
  const isLoading = isCreating || isUpdating;

  const form = useForm<MealFormValues>({
    resolver: zodResolver(mealSchema),
    defaultValues: {
      meal_type: mealType,
      recipe_id: null,
      custom_name: null,
      servings: defaultServings,
      notes: null,
      is_leftover: false,
    },
  });

  const selectedRecipeId = form.watch("recipe_id");
  const selectedRecipe = recipesData?.items.find((r) => r.id === selectedRecipeId);

  // Update form when editing meal or date changes
  useEffect(() => {
    if (editingMeal) {
      form.reset({
        meal_type: editingMeal.meal_type,
        recipe_id: editingMeal.recipe_id,
        custom_name: editingMeal.custom_name,
        servings: editingMeal.servings,
        notes: editingMeal.notes,
        is_leftover: editingMeal.is_leftover,
      });
    } else {
      form.reset({
        meal_type: mealType,
        recipe_id: null,
        custom_name: null,
        servings: defaultServings,
        notes: null,
        is_leftover: false,
      });
    }
    // Also reset search state when switching meals
    setSearchQuery("");
    setShowRecipeSearch(false);
  }, [editingMeal, mealType, defaultServings, date, form]);

  const onSubmit = async (values: MealFormValues) => {
    try {
      const data = {
        date: format(date, "yyyy-MM-dd"),
        meal_type: values.meal_type as MealType,
        recipe_id: values.recipe_id || undefined,
        custom_name: values.custom_name || undefined,
        servings: values.servings || undefined,
        notes: values.notes || undefined,
        is_leftover: values.is_leftover,
      };

      if (isEditing) {
        await updateMeal({
          planId,
          mealId: editingMeal.id,
          data,
        }).unwrap();
        toast.success(t("messages.mealUpdated"));
      } else {
        await createMeal({
          planId,
          data,
        }).unwrap();
        toast.success(t("messages.mealAdded"));
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(isEditing ? t("messages.mealUpdateError") : t("messages.mealAddError"));
      console.error("Error saving meal:", error);
    }
  };

  const handleDelete = async () => {
    if (!editingMeal) return;

    try {
      await deleteMeal({
        planId,
        mealId: editingMeal.id,
      }).unwrap();
      toast.success(t("messages.mealDeleted"));
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(t("messages.mealDeleteError"));
      console.error("Error deleting meal:", error);
    }
  };

  const handleSelectRecipe = (recipe: RecipeListItem) => {
    form.setValue("recipe_id", recipe.id);
    form.setValue("custom_name", null);
    setShowRecipeSearch(false);
    setSearchQuery("");
  };

  const handleClearRecipe = () => {
    form.setValue("recipe_id", null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("mealForm.editTitle") : t("mealForm.addTitle")}
            <span className="text-muted-foreground font-normal ml-2">
              {format(date, "EEEE, MMM d")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="meal_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.mealType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MEAL_TYPES.map((type) => (
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

            {/* Recipe selection */}
            <div className="space-y-2">
              <FormLabel>{t("fields.recipe")}</FormLabel>
              {selectedRecipeId && selectedRecipe ? (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="font-medium">{selectedRecipe.name}</div>
                    {selectedRecipe.category && (
                      <div className="text-sm text-muted-foreground">
                        {selectedRecipe.category}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleClearRecipe}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("mealForm.searchRecipes")}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowRecipeSearch(true);
                      }}
                      onFocus={() => setShowRecipeSearch(true)}
                      className="pl-9"
                    />
                  </div>
                  {showRecipeSearch && recipesData && recipesData.items.length > 0 && (
                    <ScrollArea className="h-[200px] border rounded-lg">
                      <div className="p-2 space-y-1">
                        {recipesData.items.map((recipe) => (
                          <button
                            key={recipe.id}
                            type="button"
                            className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                            onClick={() => handleSelectRecipe(recipe)}
                          >
                            <div className="font-medium">{recipe.name}</div>
                            {recipe.category && (
                              <div className="text-sm text-muted-foreground">
                                {recipe.category} • {recipe.prep_time || 0 + (recipe.cook_time || 0)} min
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>

            {/* Custom name (for non-recipe meals) */}
            {!selectedRecipeId && (
              <FormField
                control={form.control}
                name="custom_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.customMeal")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("mealForm.customMealPlaceholder")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="servings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.servings")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      {...field}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseInt(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder={t("mealForm.notesPlaceholder")}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_leftover"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t("fields.isLeftover")}</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {t("mealForm.leftoverDescription")}
                    </p>
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

            <div className="flex justify-between pt-4">
              <div>
                {isEditing && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? tCommon("deleting") : tCommon("delete")}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? tCommon("saving")
                    : isEditing
                      ? tCommon("save")
                      : t("mealForm.addButton")}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
