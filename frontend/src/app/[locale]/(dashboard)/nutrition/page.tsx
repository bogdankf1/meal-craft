import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { NutritionContent } from "./nutrition-content";

export default async function NutritionPage() {
  const t = await getTranslations("nutrition");

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <NutritionContent />
    </div>
  );
}
