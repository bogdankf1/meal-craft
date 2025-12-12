"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format, addDays, startOfWeek } from "date-fns";
import { CalendarIcon, Copy } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useRepeatMealPlanMutation,
  type MealPlanListItem,
} from "@/lib/api/meal-planner-api";

const repeatSchema = z.object({
  new_name: z.string().min(1, "Name is required").max(255),
  new_start_date: z.date(),
});

type RepeatFormValues = z.infer<typeof repeatSchema>;

interface RepeatMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlan: MealPlanListItem | null;
  onSuccess?: () => void;
}

export function RepeatMealPlanDialog({
  open,
  onOpenChange,
  mealPlan,
  onSuccess,
}: RepeatMealPlanDialogProps) {
  const t = useTranslations("mealPlanner");
  const tCommon = useTranslations("common");

  const [repeatMealPlan, { isLoading }] = useRepeatMealPlanMutation();

  // Get next Monday as default start date
  const getDefaultStartDate = () => {
    const today = new Date();
    const nextMonday = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
    return nextMonday;
  };

  const form = useForm<RepeatFormValues>({
    resolver: zodResolver(repeatSchema),
    defaultValues: {
      new_name: "",
      new_start_date: getDefaultStartDate(),
    },
  });

  // Update form when meal plan changes
  useEffect(() => {
    if (mealPlan) {
      const startDate = getDefaultStartDate();
      form.reset({
        new_name: `${mealPlan.name} (Copy)`,
        new_start_date: startDate,
      });
    }
  }, [mealPlan, form]);

  const onSubmit = async (values: RepeatFormValues) => {
    if (!mealPlan) return;

    try {
      await repeatMealPlan({
        source_meal_plan_id: mealPlan.id,
        new_start_date: format(values.new_start_date, "yyyy-MM-dd"),
        new_name: values.new_name,
      }).unwrap();

      toast.success(t("messages.planRepeated"));
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(t("messages.repeatError"));
      console.error("Error repeating meal plan:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            {t("repeat.title")}
          </DialogTitle>
          <DialogDescription>
            {t("repeat.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {mealPlan && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">{t("repeat.source")}:</p>
                <p className="text-muted-foreground">{mealPlan.name}</p>
                <p className="text-muted-foreground">
                  {format(new Date(mealPlan.date_start), "MMM d")} -{" "}
                  {format(new Date(mealPlan.date_end), "MMM d, yyyy")}
                </p>
                <p className="text-muted-foreground">
                  {t("fields.meals")}: {mealPlan.meal_count}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="new_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.name")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("form.namePlaceholder")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="new_start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("repeat.newStartDate")}</FormLabel>
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? tCommon("saving") : t("repeat.button")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
