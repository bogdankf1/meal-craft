"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  useCreateRecipesMutation,
  useUpdateRecipeMutation,
  RECIPE_CATEGORIES,
  RECIPE_DIFFICULTIES,
  type Recipe,
  type RecipeCategory,
  type RecipeDifficulty,
} from "@/lib/api/recipes-api";

// Unit options for ingredients (same as groceries)
const UNIT_KEYS = ["pcs", "kg", "g", "l", "ml", "pack", "box", "bag", "bottle", "can", "tbsp", "tsp", "cup"] as const;

const ingredientSchema = z.object({
  ingredient_name: z.string().min(1, "Required"),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

const recipeSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  cuisine_type: z.string().nullable().optional(),
  prep_time: z.number().min(0).nullable().optional(),
  cook_time: z.number().min(0).nullable().optional(),
  servings: z.number().min(1).nullable().optional(),
  difficulty: z.string().nullable().optional(),
  instructions: z.string().min(1, "Instructions are required"),
  source: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_favorite: z.boolean().optional(),
  ingredients: z.array(ingredientSchema).min(1, "At least one ingredient is required"),
});

type RecipeFormValues = z.infer<typeof recipeSchema>;

interface RecipeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: Recipe | null;
  onSuccess?: () => void;
}

export function RecipeForm({
  open,
  onOpenChange,
  editingItem,
  onSuccess,
}: RecipeFormProps) {
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");

  const [createRecipes, { isLoading: isCreating }] = useCreateRecipesMutation();
  const [updateRecipe, { isLoading: isUpdating }] = useUpdateRecipeMutation();

  const isLoading = isCreating || isUpdating;
  const isEditing = !!editingItem;

  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: "",
      description: null,
      category: null,
      cuisine_type: null,
      prep_time: null,
      cook_time: null,
      servings: 2,
      difficulty: null,
      instructions: "",
      source: null,
      source_url: null,
      notes: null,
      is_favorite: false,
      ingredients: [{ ingredient_name: "", quantity: null, unit: null, category: null }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });

  // Reset form when editing item changes
  const prevOpenRef = useRef(open);
  useEffect(() => {
    // Only reset moreOptionsOpen when dialog opens (transition from closed to open)
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (justOpened) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset local UI state when dialog opens
      setMoreOptionsOpen(false);
    }

    if (editingItem) {
      form.reset({
        name: editingItem.name,
        description: editingItem.description,
        category: editingItem.category,
        cuisine_type: editingItem.cuisine_type,
        prep_time: editingItem.prep_time,
        cook_time: editingItem.cook_time,
        servings: editingItem.servings,
        difficulty: editingItem.difficulty,
        instructions: editingItem.instructions,
        source: editingItem.source,
        source_url: editingItem.source_url,
        notes: editingItem.notes,
        is_favorite: editingItem.is_favorite,
        ingredients: editingItem.ingredients.map((ing) => ({
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity ? Number(ing.quantity) : null,
          unit: ing.unit,
          category: ing.category,
        })),
      });
    } else {
      form.reset({
        name: "",
        description: null,
        category: null,
        cuisine_type: null,
        prep_time: null,
        cook_time: null,
        servings: 2,
        difficulty: null,
        instructions: "",
        source: null,
        source_url: null,
        notes: null,
        is_favorite: false,
        ingredients: [{ ingredient_name: "", quantity: null, unit: null, category: null }],
      });
    }
  }, [editingItem, form, open]);

  const onSubmit = async (values: RecipeFormValues) => {
    try {
      // Convert null values to undefined for API compatibility
      const recipeData = {
        name: values.name,
        description: values.description ?? undefined,
        category: (values.category ?? undefined) as RecipeCategory | undefined,
        cuisine_type: values.cuisine_type ?? undefined,
        prep_time: values.prep_time ?? undefined,
        cook_time: values.cook_time ?? undefined,
        servings: values.servings ?? undefined,
        difficulty: (values.difficulty ?? undefined) as RecipeDifficulty | undefined,
        instructions: values.instructions,
        source: values.source ?? undefined,
        source_url: values.source_url ?? undefined,
        notes: values.notes ?? undefined,
        is_favorite: values.is_favorite ?? false,
      };

      if (isEditing) {
        await updateRecipe({
          id: editingItem.id,
          data: recipeData,
        }).unwrap();
        toast.success(t("messages.recipeUpdated"));
      } else {
        await createRecipes([{
          ...recipeData,
          ingredients: values.ingredients.map((ing) => ({
            ingredient_name: ing.ingredient_name,
            quantity: ing.quantity ?? undefined,
            unit: ing.unit ?? undefined,
            category: ing.category ?? undefined,
          })),
        }]).unwrap();
        toast.success(t("messages.recipeCreated"));
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast.error(isEditing ? t("messages.errorUpdating") : t("messages.errorCreating"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("form.editTitle") : t("form.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Recipe Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.name")} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t("form.namePlaceholder")} autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Ingredients */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>{t("form.ingredients")} *</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      append({ ingredient_name: "", quantity: null, unit: null, category: null })
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t("form.addIngredient")}
                  </Button>
                </div>

                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`ingredients.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="w-16">
                            <FormControl>
                              <Input
                                type="number"
                                placeholder={t("form.qty")}
                                step="0.1"
                                className="h-9"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value ? Number(e.target.value) : null)
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`ingredients.${index}.unit`}
                        render={({ field }) => (
                          <FormItem className="w-24">
                            <Select
                              value={field.value || ""}
                              onValueChange={(value) => field.onChange(value || null)}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder={t("form.unit")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {UNIT_KEYS.map((unitKey) => (
                                  <SelectItem key={unitKey} value={unitKey}>
                                    {t(`units.${unitKey}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`ingredients.${index}.ingredient_name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder={t("form.ingredientName")}
                                className="h-9"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => fields.length > 1 && remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.instructions")} *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("form.instructionsPlaceholder")}
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                <div className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.description")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("form.descriptionPlaceholder")}
                            rows={2}
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.category")}</FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={(value) => field.onChange(value || null)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("form.selectCategory")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {RECIPE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {t(`categories.${cat.value}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cuisine_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.cuisineType")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("form.cuisinePlaceholder")}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <FormField
                      control={form.control}
                      name="prep_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.prepTime")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="min"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value ? Number(e.target.value) : null)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cook_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.cookTime")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="min"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value ? Number(e.target.value) : null)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="servings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.servings")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
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
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.difficulty")}</FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={(value) => field.onChange(value || null)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("form.selectDifficulty")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {RECIPE_DIFFICULTIES.map((diff) => (
                                <SelectItem key={diff.value} value={diff.value}>
                                  {t(`difficulties.${diff.value}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.source")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("form.sourcePlaceholder")}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="source_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.sourceUrl")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://..."
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.notes")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("form.notesPlaceholder")}
                            rows={2}
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_favorite"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <FormLabel>{t("form.markAsFavorite")}</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
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
                    : t("form.addRecipe")}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
