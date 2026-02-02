"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format, addDays, startOfWeek } from "date-fns";
import { CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";

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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  useCreateMealPlanMutation,
  useUpdateMealPlanMutation,
  type MealPlanListItem,
} from "@/lib/api/meal-planner-api";

const mealPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  date_start: z.date(),
  date_end: z.date(),
  servings: z.number().min(1).max(20),
  is_template: z.boolean(),
});

type MealPlanFormValues = z.infer<typeof mealPlanSchema>;

interface MealPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: MealPlanListItem | null;
  defaultProfileId?: string | null;
  onSuccess?: () => void;
}

export function MealPlanForm({
  open,
  onOpenChange,
  editingItem,
  defaultProfileId,
  onSuccess,
}: MealPlanFormProps) {
  const t = useTranslations("mealPlanner");
  const tCommon = useTranslations("common");

  const [createMealPlan, { isLoading: isCreating }] = useCreateMealPlanMutation();
  const [updateMealPlan, { isLoading: isUpdating }] = useUpdateMealPlanMutation();

  const isEditing = !!editingItem;
  const isLoading = isCreating || isUpdating;

  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  // Get next Monday as default start date
  const getDefaultStartDate = () => {
    const today = new Date();
    const nextMonday = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
    return nextMonday;
  };

  const form = useForm<MealPlanFormValues>({
    resolver: zodResolver(mealPlanSchema),
    defaultValues: {
      name: "",
      date_start: getDefaultStartDate(),
      date_end: addDays(getDefaultStartDate(), 6),
      servings: 2,
      is_template: false,
    },
  });

  // Update form when editing item changes
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
        date_start: new Date(editingItem.date_start),
        date_end: new Date(editingItem.date_end),
        servings: editingItem.servings,
        is_template: editingItem.is_template,
      });
    } else {
      const startDate = getDefaultStartDate();
      form.reset({
        name: `Week of ${format(startDate, "MMM d, yyyy")}`,
        date_start: startDate,
        date_end: addDays(startDate, 6),
        servings: 2,
        is_template: false,
      });
    }
  }, [editingItem, form, open]);

  const onSubmit = async (values: MealPlanFormValues) => {
    try {
      const data = {
        name: values.name,
        date_start: format(values.date_start, "yyyy-MM-dd"),
        date_end: format(values.date_end, "yyyy-MM-dd"),
        servings: values.servings,
        is_template: values.is_template,
        profile_id: isEditing ? editingItem.profile_id : defaultProfileId,
      };

      if (isEditing) {
        await updateMealPlan({
          id: editingItem.id,
          data,
        }).unwrap();
        toast.success(t("messages.planUpdated"));
      } else {
        await createMealPlan(data).unwrap();
        toast.success(t("messages.planCreated"));
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(isEditing ? t("messages.updateError") : t("messages.createError"));
      console.error("Error saving meal plan:", error);
    }
  };

  // Auto-update end date when start date changes (for 7-day week)
  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      form.setValue("date_start", date);
      form.setValue("date_end", addDays(date, 6));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("form.editTitle") : t("form.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.name")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("form.namePlaceholder")} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date_start"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("fields.startDate")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "MMM d, yyyy")
                            ) : (
                              <span>{t("form.selectDate")}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={handleStartDateChange}
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
                name="date_end"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("fields.endDate")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "MMM d, yyyy")
                            ) : (
                              <span>{t("form.selectDate")}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => date && field.onChange(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {moreOptionsOpen && (
              <div className="space-y-4">
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
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_template"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>{t("fields.isTemplate")}</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          {t("form.templateDescription")}
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
              </div>
            )}

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
                    : t("form.createButton")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
