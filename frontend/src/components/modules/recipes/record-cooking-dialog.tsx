"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Star } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useRecordCookingMutation, type RecipeListItem } from "@/lib/api/recipes-api";

const cookingSchema = z.object({
  cooked_at: z.date(),
  servings_made: z.number().min(1).optional().nullable(),
  notes: z.string().optional().nullable(),
  rating: z.number().min(1).max(5).optional().nullable(),
});

type CookingFormValues = z.infer<typeof cookingSchema>;

interface RecordCookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: RecipeListItem | null;
}

export function RecordCookingDialog({
  open,
  onOpenChange,
  recipe,
}: RecordCookingDialogProps) {
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");

  const [recordCooking, { isLoading }] = useRecordCookingMutation();
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const form = useForm<CookingFormValues>({
    resolver: zodResolver(cookingSchema),
    defaultValues: {
      cooked_at: new Date(),
      servings_made: recipe?.servings || null,
      notes: null,
      rating: null,
    },
  });

  const selectedRating = form.watch("rating");

  const onSubmit = async (values: CookingFormValues) => {
    if (!recipe) return;

    try {
      await recordCooking({
        id: recipe.id,
        data: {
          recipe_id: recipe.id,
          cooked_at: values.cooked_at.toISOString(),
          servings_made: values.servings_made,
          notes: values.notes,
          rating: values.rating,
        },
      }).unwrap();

      toast.success(t("messages.cookingRecorded"));
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error recording cooking:", error);
      toast.error(t("messages.errorRecordingCooking"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("cooking.recordTitle")}</DialogTitle>
          {recipe && (
            <DialogDescription>
              {t("cooking.recordDescription", { name: recipe.name })}
            </DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cooked_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("cooking.date")}</FormLabel>
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
                            format(field.value, "PPP")
                          ) : (
                            <span>{t("cooking.pickDate")}</span>
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
                          date > new Date() || date < new Date("1900-01-01")
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
              name="servings_made"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cooking.servingsMade")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder={recipe?.servings?.toString() || "4"}
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
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cooking.rating")}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="p-1 rounded-full hover:bg-muted transition-colors"
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(null)}
                          onClick={() =>
                            field.onChange(field.value === star ? null : star)
                          }
                        >
                          <Star
                            className={cn(
                              "h-6 w-6 transition-colors",
                              (hoveredRating !== null
                                ? star <= hoveredRating
                                : selectedRating && star <= selectedRating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300 dark:text-gray-600"
                            )}
                          />
                        </button>
                      ))}
                    </div>
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
                  <FormLabel>{t("cooking.notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("cooking.notesPlaceholder")}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? tCommon("saving") : t("cooking.record")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
