import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";

export default async function AdminPage() {
  const t = await getTranslations("nav");

  return (
    <div>
      <PageHeader title={t("admin")} description="Admin panel for managing users and platform settings." />
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Admin panel will be implemented in Phase 6
      </div>
    </div>
  );
}
