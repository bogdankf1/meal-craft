import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { MealPlannerContent } from "./meal-planner-content";

export default async function MealPlannerPage() {
  const t = await getTranslations("nav");

  return (
    <div>
      <PageHeader title={t("mealPlanner")} description="Plan your weekly meals and generate shopping lists." />
      <MealPlannerContent />
    </div>
  );
}
