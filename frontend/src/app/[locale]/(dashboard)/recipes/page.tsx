import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { RecipesContent } from "./recipes-content";

export default async function RecipesPage() {
  const t = await getTranslations("nav");

  return (
    <div>
      <PageHeader title={t("recipes")} description="Browse, create, and generate recipes with AI." />
      <RecipesContent />
    </div>
  );
}
